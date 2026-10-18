export type DocumentType = 
  | 'LETTER_OF_CREDIT'
  | 'COMMERCIAL_INVOICE' 
  | 'BILL_OF_LADING' 
  | 'PACKING_LIST' 
  | 'CERTIFICATE_OF_ORIGIN' 
  | 'INSURANCE_CERTIFICATE' 
  | 'INSPECTION_CERTIFICATE' 
  | 'OTHER';

export interface ExtractedFieldItem {
  value: string | number | boolean | null;
  source_snippet: string | null;
  label?: string;
}

export type ExtractedFieldsMap = Record<string, ExtractedFieldItem>;

export interface LCDocumentData {
  lcNumber: string;
  issuingBank: string;
  applicant: string;
  beneficiary: string;
  currency: string;
  amount: number;
  expiryDate: string; // YYYY-MM-DD
  expiryPlace: string;
  latestShipmentDate: string; // YYYY-MM-DD
  presentationPeriodDays: number;
  partialShipment: 'ALLOWED' | 'PROHIBITED';
  transshipment: 'ALLOWED' | 'PROHIBITED';
  portOfLoading: string;
  portOfDischarge: string;
  descriptionOfGoods: string;
  requiredDocuments: string[];
  additionalConditions: string[];
  rawText: string;
  fileBase64?: string;
  mimeType?: string;
  fileName?: string;
  uploadTime?: number;
  extractedFields?: ExtractedFieldsMap;
  presentationDate?: string;
  extractedBy?: 'gemini' | 'rules' | 'none';
}

export interface ShippingDocument {
  id: string;
  type: DocumentType;
  title: string;
  fileName: string;
  fileSize?: string;
  rawText: string;
  fileBase64?: string;
  mimeType?: string;
  uploadTime?: number;
  extractedFields?: ExtractedFieldsMap;
  isExtracting?: boolean;
  /** Which engine produced extractedFields: Gemini, the code parser, or nothing readable. */
  extractedBy?: 'gemini' | 'rules' | 'none';
}

export interface EvidenceItem {
  document: string;
  field: string;
  value?: any;
  source_snippet?: string | null;
}

export type FixType = 'CORRECTED_TEXT' | 'LC_AMENDMENT_REQUEST';

export interface DiscrepancyFix {
  id: string;
  findingId?: string;
  targetDoc: string;
  discrepancyTitle: string;
  fixType: FixType;
  fixTypeLabel: 'Corrected text' | 'LC amendment request';
  canBeHonestlyCorrected: boolean;
  reason: string;
  copyableContent: string;
  correctedSnippet?: string;
  emailSubject?: string;
  emailBody?: string;
  emailRecipient?: string;
  actionSummary: string;
}

export interface Finding {
  id: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  title: string;
  description: string;
  ruleCitation: string; // e.g. "UCP 600 Art 18(c)", "ISBP 821"
  foundValue: string;
  expectedValue: string;
  remediation: string;
  source?: 'Rule' | 'Judgement' | 'AI';
  documents_involved?: string[];
  fields_used?: string[];
  evidence?: EvidenceItem[];
  cites?: JudgementCite[];
  fix?: DiscrepancyFix;
}

export interface JudgementCite {
  document: string;
  field: string;
  /** True when the finding is that this field is ABSENT from the document (verified as empty). */
  absent?: boolean;
}

export interface DiscardedFinding {
  id: string;
  title: string;
  verdict?: 'discrepancy' | 'acceptable';
  reason: string;
  missingCites: JudgementCite[];
  validCites?: EvidenceItem[];
  originalFinding?: any;
  discardedAt: string;
}

export interface JudgementResult {
  verdict: 'discrepancy' | 'acceptable';
  title: string;
  explanation: string;
  ucp_article: string;
  cites: JudgementCite[];
  source: 'Judgement' | 'Rule (AI unavailable)';
  severity?: 'CRITICAL' | 'MAJOR' | 'MINOR';
  evidence?: EvidenceItem[];
  /** Set when the same problem was already reported by a rule (not counted twice). */
  duplicateOf?: string;
  /** True when this judgement is counted as a discrepancy in the result. */
  counted?: boolean;
}

export interface RuleResult {
  id: string;
  title: string;
  status: 'PASS' | 'DISCREPANCY' | 'NOT_APPLICABLE';
  documents_involved: string[];
  fields_used: string[];
  explanation: string;
  ucp_article: string;
  source: 'Rule';
  severity?: 'CRITICAL' | 'MAJOR' | 'MINOR';
  foundValue?: string;
  expectedValue?: string;
  remediation?: string;
  evidence?: EvidenceItem[];
  target_document_id?: string;
}

export interface DocumentAudit {
  docName: string;
  docType: DocumentType;
  status: 'Pass' | 'Discrepancy Identified';
  discrepancyCount: number;
  findings: Finding[];
}


export interface RemediationStep {
  step: number;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM';
  action: string;
  targetDoc: string;
  reason: string;
  fixType?: FixType;
  fixTypeLabel?: 'Corrected text' | 'LC amendment request';
  copyableContent?: string;
  fix?: DiscrepancyFix;
}

export interface FinalSummaryCard {
  discrepanciesCaught: number;
  timeTakenMs: number;
  timeTakenFormatted: string;
  estimatedBankRefusalAvoided: string;
  discrepancyFeeSaved: string;
  delayPreventedDays: string;
  reissuableFixesCount: number;
  amendmentRequestsCount: number;
}

export interface ComparisonRow {
  field: string;
  lcRequirement: string;
  invoiceValue: string;
  blValue: string;
  packingListValue: string;
  otherDocsValue?: string;
  status: 'MATCH' | 'MISMATCH' | 'NOT_APPLICABLE';
}

export interface ExaminationResult {
  status: 'CLEAN' | 'DISCREPANCIES_FOUND' | 'INCOMPLETE';
  riskLevel: 'Low' | 'Moderate' | 'High';
  complianceScore: number;
  executiveSummary: string;
  documentAudits: DocumentAudit[];
  remediationPlan: RemediationStep[];
  comparisonMatrix: ComparisonRow[];
  ruleEvaluations?: RuleResult[];
  judgements?: JudgementResult[];
  discardedFindings?: DiscardedFinding[];
  finalSummary?: FinalSummaryCard;
  pipelineStats: {
    durationMs: number;
    modelUsed: string;
    rulesEvaluated: number;
    timestamp: string;
  };
  /** Single source of truth for every count shown on the results screen. */
  totalDiscrepancies?: number;
  ruleDiscrepancyCount?: number;
  aiDiscrepancyCount?: number;
  unreadableDocuments?: string[];
  presentationDate?: string;
  aiStatus?: {
    extraction: 'gemini' | 'fallback' | 'off';
    judgement: 'gemini' | 'fallback' | 'off';
    fixes: 'gemini' | 'fallback' | 'off';
    message?: string;
  };
}

export interface SampleConsignment {
  id: string;
  name: string;
  description: string;
  badge: string;
  badgeColor: 'emerald' | 'amber' | 'rose';
  expectedOutcome: 'CLEAN' | 'DISCREPANT';
  presentationDate?: string;
  expectedDiscrepancies?: string[];
  /** Number of discrepancies the examination must report for this sample (used by tests and the sample card). */
  expectedDiscrepancyCount?: number;
  lc: LCDocumentData;
  documents: ShippingDocument[];
}
