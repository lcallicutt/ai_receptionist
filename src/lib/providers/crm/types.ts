/**
 * CRMProvider — provider-neutral contract for syncing leads and activity.
 * Implementations: GoHighLevel and generic webhook; HubSpot follows the
 * same contract in a later phase.
 */

export interface CrmLeadPayload {
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  address: string | null;
  callReason: string | null;
  requestedService: string | null;
  leadScore: number;
  classification: string;
  status: string;
  source: string | null;
  tags: string[];
  qualificationAnswers: Array<{ question: string; answer: string }>;
  callSummary: string | null;
  appointment: { service: string | null; startsAt: string } | null;
  /** FlowNet's stable lead id — CRMs can use it as an external reference. */
  flownetLeadId: string;
  businessName: string;
}

export interface CrmSyncResult {
  crmRecordId: string;
}

export interface CRMProvider {
  readonly name: string;
  /** Creates or updates the contact + activity for a lead. */
  syncLead(payload: CrmLeadPayload, existingCrmRecordId?: string | null): Promise<CrmSyncResult>;
  /** Lightweight connectivity/auth check. */
  testConnection(): Promise<void>;
}
