import "server-only";
import type {
  TelephonyProvider,
  AvailableNumber,
  ProvisionedNumber,
  SmsSendResult,
} from "./types";

const API_BASE = "https://api.twilio.com/2010-04-01";

/**
 * Twilio adapter (REST, no SDK dependency). Credentials come from
 * TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN and are never exposed client-side.
 */
export class TwilioTelephonyProvider implements TelephonyProvider {
  readonly name = "twilio";

  private get sid(): string | undefined {
    return process.env.TWILIO_ACCOUNT_SID;
  }
  private get token(): string | undefined {
    return process.env.TWILIO_AUTH_TOKEN;
  }

  isConfigured(): boolean {
    return Boolean(this.sid && this.token);
  }

  private authHeader(): string {
    if (!this.isConfigured()) throw new Error("Twilio is not configured");
    return `Basic ${Buffer.from(`${this.sid}:${this.token}`).toString("base64")}`;
  }

  async searchAvailableNumbers(areaCode?: string): Promise<AvailableNumber[]> {
    const url = new URL(`${API_BASE}/Accounts/${this.sid}/AvailablePhoneNumbers/US/Local.json`);
    if (areaCode) url.searchParams.set("AreaCode", areaCode);
    url.searchParams.set("SmsEnabled", "true");
    url.searchParams.set("VoiceEnabled", "true");
    const res = await fetch(url, { headers: { authorization: this.authHeader() } });
    if (!res.ok) throw new Error(`Twilio number search failed (${res.status})`);
    const data = (await res.json()) as {
      available_phone_numbers: Array<{
        phone_number: string;
        locality?: string;
        capabilities: { voice: boolean; SMS: boolean };
      }>;
    };
    return data.available_phone_numbers.map((n) => ({
      e164: n.phone_number,
      locality: n.locality,
      capabilities: { voice: n.capabilities.voice, sms: n.capabilities.SMS },
    }));
  }

  async provisionNumber(e164: string, webhookBaseUrl: string): Promise<ProvisionedNumber> {
    const res = await fetch(`${API_BASE}/Accounts/${this.sid}/IncomingPhoneNumbers.json`, {
      method: "POST",
      headers: {
        authorization: this.authHeader(),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        PhoneNumber: e164,
        VoiceUrl: `${webhookBaseUrl}/api/webhooks/twilio/voice`,
        StatusCallback: `${webhookBaseUrl}/api/webhooks/twilio/voice`,
        SmsUrl: `${webhookBaseUrl}/api/webhooks/twilio/sms`,
      }),
    });
    if (!res.ok) throw new Error(`Twilio provisioning failed (${res.status})`);
    const data = (await res.json()) as { sid: string; phone_number: string };
    return {
      providerNumberId: data.sid,
      e164: data.phone_number,
      capabilities: { voice: true, sms: true },
    };
  }

  async releaseNumber(providerNumberId: string): Promise<void> {
    const res = await fetch(
      `${API_BASE}/Accounts/${this.sid}/IncomingPhoneNumbers/${providerNumberId}.json`,
      { method: "DELETE", headers: { authorization: this.authHeader() } },
    );
    if (!res.ok && res.status !== 404) {
      throw new Error(`Twilio number release failed (${res.status})`);
    }
  }

  async sendSms(from: string, to: string, body: string): Promise<SmsSendResult> {
    const res = await fetch(`${API_BASE}/Accounts/${this.sid}/Messages.json`, {
      method: "POST",
      headers: {
        authorization: this.authHeader(),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }),
    });
    if (!res.ok) throw new Error(`Twilio SMS send failed (${res.status})`);
    const data = (await res.json()) as { sid: string; status: string };
    return { providerMessageId: data.sid, status: data.status };
  }
}

export const twilioProvider = new TwilioTelephonyProvider();
