import "server-only";
import type { VoiceProvider, VoiceAgentConfig, VoiceAgentRef, TestCallResult } from "./types";

const API_BASE = "https://api.retellai.com";

/**
 * Retell AI adapter (REST). The receptionist configuration is compiled into
 * a guarded prompt: approved FAQs only, configured compliance statements up
 * front, and explicit no-invention instructions.
 */
export class RetellVoiceProvider implements VoiceProvider {
  readonly name = "retell";

  private get apiKey(): string | undefined {
    return process.env.RETELL_API_KEY;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  private headers(): Record<string, string> {
    if (!this.isConfigured()) throw new Error("Retell is not configured");
    return { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" };
  }

  buildPrompt(config: VoiceAgentConfig): string {
    const sections = [
      `You are ${config.receptionistName}, an AI receptionist. Greet every caller with exactly: "${config.greeting}"`,
      config.complianceStatements.length
        ? `Required statements you must deliver when relevant:\n${config.complianceStatements.map((s) => `- ${s}`).join("\n")}`
        : null,
      `Answer questions ONLY from this approved knowledge. If the answer is not here, say you will have a team member follow up — never invent information.`,
      config.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n") || "(no FAQs configured)",
      config.businessKnowledge ? `Background knowledge:\n${config.businessKnowledge}` : null,
      config.qualificationPrompts.length
        ? `When the caller is a potential customer, ask these in order:\n${config.qualificationPrompts.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
        : null,
      config.restrictedTopics.length
        ? `Never discuss: ${config.restrictedTopics.join(", ")}.`
        : null,
    ];
    return sections.filter(Boolean).join("\n\n");
  }

  async syncAgent(config: VoiceAgentConfig, existingAgentId?: string): Promise<VoiceAgentRef> {
    const body = JSON.stringify({
      agent_name: config.receptionistName,
      voice_id: config.voiceId ?? "11labs-Adrian",
      language: config.language,
      response_engine: {
        type: "retell-llm",
        general_prompt: this.buildPrompt(config),
      },
    });
    const res = existingAgentId
      ? await fetch(`${API_BASE}/update-agent/${existingAgentId}`, {
          method: "PATCH",
          headers: this.headers(),
          body,
        })
      : await fetch(`${API_BASE}/create-agent`, {
          method: "POST",
          headers: this.headers(),
          body,
        });
    if (!res.ok) throw new Error(`Retell agent sync failed (${res.status})`);
    const data = (await res.json()) as { agent_id: string };
    return { provider: this.name, agentId: data.agent_id };
  }

  async startTestCall(
    agentId: string,
    fromNumber: string,
    toNumber: string,
  ): Promise<TestCallResult> {
    const res = await fetch(`${API_BASE}/v2/create-phone-call`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        override_agent_id: agentId,
        from_number: fromNumber,
        to_number: toNumber,
      }),
    });
    if (!res.ok) throw new Error(`Retell test call failed (${res.status})`);
    const data = (await res.json()) as { call_id: string; call_status: string };
    return { providerCallId: data.call_id, status: data.call_status };
  }
}

export const retellProvider = new RetellVoiceProvider();
