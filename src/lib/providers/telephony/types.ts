/**
 * TelephonyProvider — provider-neutral contract for phone numbers and SMS
 * transport. First implementation: Twilio; Telnyx follows the same contract.
 */

export interface AvailableNumber {
  e164: string;
  locality?: string;
  capabilities: { voice: boolean; sms: boolean };
}

export interface ProvisionedNumber {
  providerNumberId: string;
  e164: string;
  capabilities: { voice: boolean; sms: boolean };
}

export interface SmsSendResult {
  providerMessageId: string;
  status: string;
}

export interface TelephonyProvider {
  readonly name: string;
  /** Is this provider configured with credentials on this deployment? */
  isConfigured(): boolean;
  searchAvailableNumbers(areaCode?: string): Promise<AvailableNumber[]>;
  provisionNumber(e164: string, webhookBaseUrl: string): Promise<ProvisionedNumber>;
  releaseNumber(providerNumberId: string): Promise<void>;
  sendSms(from: string, to: string, body: string): Promise<SmsSendResult>;
}
