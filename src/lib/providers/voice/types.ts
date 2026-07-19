/**
 * VoiceProvider — provider-neutral contract for the conversational voice
 * agent. First implementation: Retell AI; Vapi and Bland follow the same
 * contract behind this interface.
 */

export interface VoiceAgentConfig {
  receptionistName: string;
  greeting: string;
  voiceId: string | null;
  language: string;
  businessKnowledge: string | null;
  faqs: Array<{ question: string; answer: string }>;
  qualificationPrompts: string[];
  restrictedTopics: string[];
  complianceStatements: string[];
}

export interface VoiceAgentRef {
  provider: string;
  agentId: string;
}

export interface TestCallResult {
  providerCallId: string;
  status: string;
}

export interface VoiceProvider {
  readonly name: string;
  isConfigured(): boolean;
  /** Creates or updates the provider-side agent for a receptionist config. */
  syncAgent(config: VoiceAgentConfig, existingAgentId?: string): Promise<VoiceAgentRef>;
  /** Places an outbound test call from the tenant's number to a target. */
  startTestCall(agentId: string, fromNumber: string, toNumber: string): Promise<TestCallResult>;
}
