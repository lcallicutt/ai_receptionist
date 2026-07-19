import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { decryptCredentials, encryptCredentials } from "@/lib/crypto";
import type { BusyInterval } from "@/lib/availability";
import type { CalendarProvider, CalendarEventInput, CalendarEventRef } from "./types";

interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
}

/**
 * Google Calendar adapter. Tokens live encrypted in
 * calendar_connections.encrypted_credentials and are refreshed on demand.
 * Requires GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
 */
export class GoogleCalendarProvider implements CalendarProvider {
  readonly name = "google";

  constructor(
    private connectionId: string,
    private calendarId: string,
    private tokens: GoogleTokens,
  ) {}

  static async fromConnection(
    connection: typeof schema.calendarConnections.$inferSelect,
  ): Promise<GoogleCalendarProvider | null> {
    if (!connection.encryptedCredentials) return null;
    try {
      const tokens = decryptCredentials<GoogleTokens>(connection.encryptedCredentials);
      return new GoogleCalendarProvider(
        connection.id,
        connection.calendarId ?? "primary",
        tokens,
      );
    } catch {
      return null;
    }
  }

  private async accessToken(): Promise<string> {
    if (Date.now() < this.tokens.expiresAt - 60_000) return this.tokens.accessToken;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("Google Calendar is not configured");

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: this.tokens.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) {
      const db = await getDb();
      await db
        .update(schema.calendarConnections)
        .set({ status: "expired" })
        .where(eq(schema.calendarConnections.id, this.connectionId));
      throw new Error("Google Calendar authorization expired — reconnect the calendar");
    }
    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.tokens = {
      ...this.tokens,
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    const db = await getDb();
    await db
      .update(schema.calendarConnections)
      .set({ encryptedCredentials: encryptCredentials(this.tokens), lastSyncedAt: new Date() })
      .where(eq(schema.calendarConnections.id, this.connectionId));
    return this.tokens.accessToken;
  }

  async getBusyIntervals(from: Date, to: Date): Promise<BusyInterval[]> {
    const token = await this.accessToken();
    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        timeMin: from.toISOString(),
        timeMax: to.toISOString(),
        items: [{ id: this.calendarId }],
      }),
    });
    if (!res.ok) throw new Error(`Google freeBusy failed (${res.status})`);
    const data = (await res.json()) as {
      calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }>;
    };
    const busy = data.calendars?.[this.calendarId]?.busy ?? [];
    return busy.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
  }

  async createEvent(input: CalendarEventInput): Promise<CalendarEventRef> {
    const token = await this.accessToken();
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          summary: input.title,
          description: input.description,
          location: input.location,
          start: { dateTime: input.start.toISOString() },
          end: { dateTime: input.end.toISOString() },
        }),
      },
    );
    if (!res.ok) throw new Error(`Google event creation failed (${res.status})`);
    const data = (await res.json()) as { id: string };
    return { provider: this.name, eventId: data.id };
  }

  async deleteEvent(eventId: string): Promise<void> {
    const token = await this.accessToken();
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: "DELETE", headers: { authorization: `Bearer ${token}` } },
    );
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      throw new Error(`Google event deletion failed (${res.status})`);
    }
  }
}
