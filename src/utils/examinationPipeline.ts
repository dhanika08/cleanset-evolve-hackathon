/**
 * Examination assembly (pure code, no AI, no network).
 *
 * Takes the rule results and the verified Gemini judgements and builds ONE consistent result:
 * - every discrepancy appears exactly once, attached to exactly one document
 * - an AI finding that repeats a rule finding on the same topic is not counted twice
 * - verdict, counts, score, remediation plan, comparison matrix and summary card are all
 *   computed from that single list, so every number on the results screen agrees.
 */
import type {
  ComparisonRow,
  DiscardedFinding,
  DocumentAudit,
  DocumentType,
  ExaminationResult,
  ExtractedFieldsMap,
  Finding,
  JudgementResult,
  LCDocumentData,
  RemediationStep,
  RuleResult,
  ShippingDocument,
} from '../types/compliance.ts';
import { generateDiscrepancyFix, buildFinalSummaryCard } from './fixGenerator.ts';
import { hasAnyExtractedValue, parseFinancialAmount, toIsoDate } from './fieldExtractor.ts';

export const PRESENTATION_AUDIT_NAME = 'Presentation & credit terms';

export type AiStepStatus = 'gemini' | 'fallback' | 'off';

export interface AiStatus {
  extraction: AiStepStatus;
  judgement: AiStepStatus;
  fixes: AiStepStatus;
  message?: string;
}

export interface AssembleInput {
  lc: LCDocumentData;
  documents: ShippingDocument[];
  presentationDate?: string;
  rules: RuleResult[];
  judgements: JudgementResult[];
  discardedFindings: DiscardedFinding[];
  aiStatus: AiStatus;
  modelUsed: string;
  durationMs: number;
}

/** Which presented document each rule's discrepancy belongs to. */
const RULE_PRIMARY_DOC: Record<string, DocumentType | 'PRESENTATION'> = {
  'rule-shipment-date': 'BILL_OF_LADING',
  'rule-presentation-period': 'PRESENTATION',
  'rule-invoice-amount-tolerance': 'COMMERCIAL_INVOICE',
  'rule-insurance-coverage-and-date': 'INSURANCE_CERTIFICATE',
  'rule-insurance-date': 'INSURANCE_CERTIFICATE',
  'rule-ports-match': 'BILL_OF_LADING',
  'rule-clean-transport-document': 'BILL_OF_LADING',
  'rule-invoice-applicant': 'COMMERCIAL_INVOICE',
  'rule-lc-expiry-at-presentation': 'PRESENTATION',
  'rule-invoice-description-art18c': 'COMMERCIAL_INVOICE',
  'rule-cross-document-weights': 'PACKING_LIST',
  'rule-partial-shipment-art31': 'BILL_OF_LADING',
};

/** Topic of a rule, used to avoid counting the same problem twice (rule + AI). */
const RULE_TOPIC: Record<string, string> = {
  'rule-shipment-date': 'shipment-date',
  'rule-presentation-period': 'presentation',
  'rule-invoice-amount-tolerance': 'invoice-amount',
  'rule-insurance-coverage-and-date': 'insurance-amount',
  'rule-insurance-date': 'insurance-date',
  'rule-invoice-signed': 'invoice-signature',
  'rule-invoice-hs-code': 'hs-code',
  'rule-invoice-not-proforma': 'proforma',
  'rule-insurance-cover-note': 'insurance-cover-note',
  'rule-insurance-currency': 'insurance-currency',
  'rule-insurance-clauses': 'insurance-clauses',
  'rule-insurance-claims-place': 'insurance-claims',
  'rule-coo-issuer': 'coo-issuer',
  'rule-ports-match': 'ports',
  'rule-clean-transport-document': 'clean-bl',
  'rule-invoice-applicant': 'applicant',
  'rule-lc-expiry-at-presentation': 'expiry',
  'rule-invoice-description-art18c': 'invoice-description',
  'rule-cross-document-weights': 'gross-weight',
  'rule-partial-shipment-art31': 'partial-shipment',
};

function ruleTopic(id: string): string {
  if (RULE_TOPIC[id]) return RULE_TOPIC[id];
  if (id.startsWith('rule-required-document')) return `missing:${id}`;
  if (id.startsWith('rule-47a-credit-number')) return 'credit-number';
  if (id.startsWith('rule-47a-invoice-statement')) return 'invoice-statement';
  if (id.startsWith('rule-bl-freight')) return 'freight';
  if (id.startsWith('rule-bl-consignee')) return 'consignee';
  return id;
}

/** Topic of a piece of text (title or full judgement). Most specific checks first. */
function topicOfText(t: string): string | null {
  if (/gross\s*weight|gross_weight/.test(t)) return 'gross-weight';
  if (/partial\s*shipment|split shipment|short[\s-]?shipment|under[\s-]?shipment|two (bills|b\/ls|shipments|vessels)|multiple (shipments|vessels)/.test(t)) return 'partial-shipment';
  // Shipping/invoicing less than the credit quantity is the partial-shipment problem when 43P prohibits it
  if (/(quantity|bags|units|pieces|pcs|cartons).{0,80}(credit|\blc\b|45a|required|stipulated|instead of|out of|short|less than)/.test(t)) return 'partial-shipment';
  if (/cover note|broker/.test(t)) return 'insurance-cover-note';
  if (/(insurance|insured|policy).*(currency|\binr\b|rupee)/.test(t)) return 'insurance-currency';
  if (/cargo clauses|clauses \([abc]\)|risks covered/.test(t)) return 'insurance-clauses';
  if (/claims (are )?payable|claims_payable/.test(t)) return 'insurance-claims';
  if (/(insurance|insured|policy|cover).*(attach|effective|inception|dated after|later than|after (the )?(date of )?shipment|after the (on-board|shipment|b\/l)|dated .*after|backdat)/.test(t) ||
      /(attach|effective|inception).*(insurance|policy|cover)/.test(t)) return 'insurance-date';
  if (/(insurance|insured|sum insured).*(110|percent|%|amount|under-?insur|insufficient)/.test(t)) return 'insurance-amount';
  if (/late\s*shipment|latest\s*shipment|shipped[_\s]on[_\s]board[_\s]date|on[-\s]board date|44c/.test(t)) return 'shipment-date';
  if (/presentation period|presented .* days|stale/.test(t)) return 'presentation';
  if (/expir/.test(t)) return 'expiry';
  if (/port of (loading|discharge)|port_of_(loading|discharge)/.test(t)) return 'ports';
  if (/freight\s*(prepaid|collect)|freight_clause/.test(t)) return 'freight';
  if (/consign(ee|ed)|to (the )?order/.test(t) && /lading|b\/l/.test(t)) return 'consignee';
  if (/clean|clause|foul/.test(t) && /lading|b\/l/.test(t)) return 'clean-bl';
  if (/pro-?\s*forma/.test(t)) return 'proforma';
  if (/hs\s*code|hs_code/.test(t)) return 'hs-code';
  if (/(invoice).*(unsigned|not signed|signature|signed)/.test(t)) return 'invoice-signature';
  if (/origin/.test(t) && /(issu|chamber)/.test(t)) return 'coo-issuer';
  if (/(invoice).*(description|goods_description|18\(c\))/.test(t)) return 'invoice-description';
  if (/(invoice).*(applicant|buyer|made out)/.test(t)) return 'applicant';
  if (/(invoice).*(total|amount|overdrawn|exceed)/.test(t)) return 'invoice-amount';
  if (/credit number|lc number|lc_reference/.test(t)) return 'credit-number';
  return null;
}

/** Best-effort topic for a judgement: the title decides first, then the explanation and cited fields. */
export function judgementTopic(j: JudgementResult): string {
  const title = (j.title || '').toLowerCase();
  const full = `${j.title} ${j.explanation} ${(j.cites || []).map((c) => c.field).join(' ')}`.toLowerCase();
  return topicOfText(title) || topicOfText(full) || `ai:${full.slice(0, 60)}`;
}

/** "bl.shipped_on_board_date" -> BILL_OF_LADING:shipped_on_board_date */
const FIELD_PREFIX_TYPE: Record<string, DocumentType> = {
  bl: 'BILL_OF_LADING',
  invoice: 'COMMERCIAL_INVOICE',
  insurance: 'INSURANCE_CERTIFICATE',
  packing_list: 'PACKING_LIST',
  pl: 'PACKING_LIST',
  coo: 'CERTIFICATE_OF_ORIGIN',
};

function docLabel(d: ShippingDocument): string {
  return d.title || d.fileName || d.type;
}

function resolveCitedDocument(name: string, documents: ShippingDocument[]): ShippingDocument | null {
  const n = (name || '').toLowerCase();
  if (!n) return null;
  const exact = documents.find((d) => docLabel(d).toLowerCase() === n || (d.fileName || '').toLowerCase() === n);
  if (exact) return exact;
  const byTitle = documents.find((d) => n.includes(docLabel(d).toLowerCase()) || docLabel(d).toLowerCase().includes(n));
  if (byTitle) return byTitle;
  const typeHints: [DocumentType, RegExp][] = [
    ['COMMERCIAL_INVOICE', /invoice|\binv\b/],
    ['BILL_OF_LADING', /lading|\bb\/?l\b|transport/],
    ['PACKING_LIST', /packing|\bpl\b/],
    ['CERTIFICATE_OF_ORIGIN', /origin|\bcoo\b/],
    ['INSURANCE_CERTIFICATE', /insurance|policy/],
    ['INSPECTION_CERTIFICATE', /inspection|phyto/],
  ];
  for (const [type, re] of typeHints) {
    if (re.test(n)) {
      const d = documents.find((x) => x.type === type);
      if (d) return d;
    }
  }
  return null;
}

/** A document that produced no readable data at all. */
export function isUnreadable(doc: ShippingDocument): boolean {
  if (hasAnyExtractedValue(doc.extractedFields)) return false;
  const raw = (doc.rawText || '').trim();
  const isPlaceholder = !raw || /^\[(PDF|Image|Uploaded image)/i.test(raw);
  return isPlaceholder;
}

function fieldVal(fields: ExtractedFieldsMap | undefined, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = fields?.[k]?.value;
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v);
  }
  return null;
}

function weightNum(v: string | null): number | null {
  if (!v) return null;
  return parseFinancialAmount(v);
}

function compareRow(field: string, lcReq: string, values: (string | null)[], kind: 'number' | 'text' | 'date'): ComparisonRow['status'] {
  const present = values.filter((v): v is string => Boolean(v));
  if (present.length < 2 && !(kind === 'date' && present.length >= 1)) return 'NOT_APPLICABLE';
  if (kind === 'number') {
    const nums = present.map(weightNum).filter((n): n is number => n !== null);
    if (nums.length < 2) return 'NOT_APPLICABLE';
    return nums.every((n) => Math.abs(n - nums[0]) <= 1) ? 'MATCH' : 'MISMATCH';
  }
  if (kind === 'date') {
    const limit = toIsoDate(lcReq);
    const d = present.map(toIsoDate).filter(Boolean) as string[];
    if (!limit || !d.length) return 'NOT_APPLICABLE';
    return d.every((x) => x <= limit) ? 'MATCH' : 'MISMATCH';
  }
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return present.every((v) => norm(v).includes(norm(present[0])) || norm(present[0]).includes(norm(v))) ? 'MATCH' : 'MISMATCH';
}

function buildComparisonMatrix(lc: LCDocumentData, documents: ShippingDocument[]): ComparisonRow[] {
  const inv = documents.find((d) => d.type === 'COMMERCIAL_INVOICE');
  const bl = documents.find((d) => d.type === 'BILL_OF_LADING');
  const pl = documents.find((d) => d.type === 'PACKING_LIST');
  const others = documents.filter((d) => !['COMMERCIAL_INVOICE', 'BILL_OF_LADING', 'PACKING_LIST'].includes(d.type));
  const otherVal = (...keys: string[]) =>
    others.map((d) => fieldVal(d.extractedFields, ...keys)).find(Boolean) || null;
  const NA = 'N/A';
  const rows: ComparisonRow[] = [];

  const gw = [fieldVal(inv?.extractedFields, 'gross_weight'), fieldVal(bl?.extractedFields, 'gross_weight'), fieldVal(pl?.extractedFields, 'gross_weight'), otherVal('gross_weight')];
  rows.push({ field: 'Gross Weight', lcRequirement: 'Must not conflict across documents (Art. 14(d))', invoiceValue: gw[0] || NA, blValue: gw[1] || NA, packingListValue: gw[2] || NA, otherDocsValue: gw[3] || NA, status: compareRow('Gross Weight', '', gw, 'number') });

  const invTotal = fieldVal(inv?.extractedFields, 'total_amount', 'amount');
  const invNum = parseFinancialAmount(invTotal);
  rows.push({
    field: 'Total Amount',
    lcRequirement: `${lc.currency || ''} ${Number(lc.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`.trim(),
    invoiceValue: invTotal ? `${fieldVal(inv?.extractedFields, 'currency') || lc.currency || ''} ${invNum !== null ? invNum.toLocaleString('en-US', { minimumFractionDigits: 2 }) : invTotal}`.trim() : NA,
    blValue: NA,
    packingListValue: NA,
    otherDocsValue: otherVal('sum_insured_amount') ? `Insured: ${otherVal('sum_insured_amount')}` : NA,
    status: invNum === null || !lc.amount ? 'NOT_APPLICABLE' : invNum <= Number(lc.amount) + 0.01 ? 'MATCH' : 'MISMATCH',
  });

  const pol = [fieldVal(inv?.extractedFields, 'port_of_loading'), fieldVal(bl?.extractedFields, 'port_of_loading')];
  rows.push({ field: 'Port of Loading', lcRequirement: lc.portOfLoading || NA, invoiceValue: pol[0] || NA, blValue: pol[1] || NA, packingListValue: NA, status: lc.portOfLoading ? compareRow('Port of Loading', '', [lc.portOfLoading, ...pol], 'text') : 'NOT_APPLICABLE' });

  const pod = [fieldVal(inv?.extractedFields, 'port_of_discharge'), fieldVal(bl?.extractedFields, 'port_of_discharge')];
  rows.push({ field: 'Port of Discharge', lcRequirement: lc.portOfDischarge || NA, invoiceValue: pod[0] || NA, blValue: pod[1] || NA, packingListValue: NA, status: lc.portOfDischarge ? compareRow('Port of Discharge', '', [lc.portOfDischarge, ...pod], 'text') : 'NOT_APPLICABLE' });

  const ship = fieldVal(bl?.extractedFields, 'shipped_on_board_date', 'issue_date');
  rows.push({ field: 'Shipment Date', lcRequirement: lc.latestShipmentDate ? `On or before ${lc.latestShipmentDate}` : NA, invoiceValue: NA, blValue: ship || NA, packingListValue: NA, status: compareRow('Shipment Date', lc.latestShipmentDate || '', [ship], 'date') });

  const desc = (v: string | null) => (v ? (v.length > 60 ? `${v.slice(0, 60)}…` : v) : NA);
  rows.push({ field: 'Goods Description', lcRequirement: desc(lc.descriptionOfGoods || null), invoiceValue: desc(fieldVal(inv?.extractedFields, 'goods_description')), blValue: desc(fieldVal(bl?.extractedFields, 'goods_description')), packingListValue: desc(fieldVal(pl?.extractedFields, 'goods_description')), status: 'NOT_APPLICABLE' });

  rows.push({ field: 'Consignee / Endorsement', lcRequirement: (lc.requiredDocuments || []).find((d) => /lading/i.test(d))?.match(/(?:TO\s+(?:THE\s+)?ORDER[^,.]*|CONSIGNED\s+TO[^,.]*)/i)?.[0] || NA, invoiceValue: NA, blValue: fieldVal(bl?.extractedFields, 'consignee') || NA, packingListValue: NA, status: 'NOT_APPLICABLE' });
  return rows;
}

function feeFrom47A(lc: LCDocumentData): string | null {
  const text = (lc.additionalConditions || []).join(' ');
  const m = text.match(/([A-Z]{3})\s*([0-9][0-9,.]*)\s*(?:WILL BE DEDUCTED|PER DISCREPAN|AS DISCREPANCY|DISCREPANCY FEE)/i) ||
    text.match(/DISCREPAN\w*\s+FEE\s+OF\s+([A-Z]{3})\s*([0-9][0-9,.]*)/i);
  return m ? `${m[1]} ${m[2]}` : null;
}

export function assembleExamination(input: AssembleInput): ExaminationResult & {
  totalDiscrepancies: number;
  ruleDiscrepancyCount: number;
  aiDiscrepancyCount: number;
  unreadableDocuments: string[];
  presentationDate: string;
  aiStatus: AiStatus;
} {
  const { lc, documents, aiStatus } = input;

  // A rule cannot judge a document it could not read: such results become "not applicable" (shown,
  // not counted) and the verdict becomes INCOMPLETE instead of listing invented problems.
  const unreadableIds = new Set(documents.filter(isUnreadable).map((d) => d.id));
  const ruleTargetDoc = (r: RuleResult): ShippingDocument | undefined => {
    if (r.target_document_id) return documents.find((d) => d.id === r.target_document_id);
    const primary = RULE_PRIMARY_DOC[r.id];
    return primary && primary !== 'PRESENTATION' ? documents.find((d) => d.type === primary) : undefined;
  };
  const rules: RuleResult[] = input.rules.map((r) => {
    if (r.status !== 'DISCREPANCY') return r;
    const t = ruleTargetDoc(r);
    if (t && unreadableIds.has(t.id)) {
      return {
        ...r,
        status: 'NOT_APPLICABLE' as RuleResult['status'],
        explanation: `Not checked: ${t.title || t.fileName} could not be read. Re-upload a readable copy. (${r.explanation})`,
      };
    }
    return r;
  });

  const audits: DocumentAudit[] = documents.map((d) => ({
    docName: docLabel(d),
    docType: d.type,
    status: 'Pass',
    discrepancyCount: 0,
    findings: [],
  }));
  const auditById = new Map<string, DocumentAudit>();
  documents.forEach((d, i) => auditById.set(d.id, audits[i]));
  let presentationAudit: DocumentAudit | null = null;
  const getPresentationAudit = () => {
    if (!presentationAudit) {
      presentationAudit = { docName: PRESENTATION_AUDIT_NAME, docType: 'OTHER', status: 'Pass', discrepancyCount: 0, findings: [] };
      audits.unshift(presentationAudit);
    }
    return presentationAudit;
  };

  const topicsTaken = new Set<string>();
  /** "<DOC TYPE>:<field>" -> rule finding title, for every field a rule discrepancy is based on */
  const ruleFieldsTaken = new Map<string, string>();
  const allFindings: { finding: Finding; audit: DocumentAudit }[] = [];

  // 1. Rule discrepancies: exactly one finding each
  for (const r of rules.filter((x) => x.status === 'DISCREPANCY')) {
    let audit: DocumentAudit | null = null;
    if (r.target_document_id && auditById.has(r.target_document_id)) audit = auditById.get(r.target_document_id)!;
    if (!audit) {
      const primary = RULE_PRIMARY_DOC[r.id];
      if (primary && primary !== 'PRESENTATION') {
        const d = documents.find((x) => x.type === primary);
        if (d) audit = auditById.get(d.id)!;
      }
    }
    if (!audit) audit = getPresentationAudit();
    const targetDoc = documents.find((d) => auditById.get(d.id) === audit);
    const finding: Finding = {
      id: r.id,
      severity: r.severity || 'CRITICAL',
      title: r.title,
      description: r.explanation,
      ruleCitation: r.ucp_article,
      foundValue: r.foundValue || '',
      expectedValue: r.expectedValue || '',
      remediation: r.remediation || 'Correct the document so it complies with the credit.',
      source: 'Rule',
      documents_involved: r.documents_involved,
      fields_used: r.fields_used,
      evidence: [
        {
          document: audit.docName,
          field: (r.fields_used || [])[0] || 'rule',
          value: r.foundValue || null,
          source_snippet: (() => {
            const key = ((r.fields_used || []).find((f) => !f.startsWith('lc.')) || '').split('.').pop() || '';
            return targetDoc?.extractedFields?.[key]?.source_snippet || null;
          })(),
        },
      ],
    };
    audit.findings.push(finding);
    allFindings.push({ finding, audit });
    topicsTaken.add(ruleTopic(r.id));
    for (const f of r.fields_used || []) {
      const [prefix, field] = f.split('.');
      const type = FIELD_PREFIX_TYPE[prefix];
      if (type && field) ruleFieldsTaken.set(`${type}:${field}`, r.title);
    }
  }

  // 2. Verified AI judgements: add only if the topic was not already reported by a rule
  const judgements = input.judgements.map((j) => ({ ...j })) as (JudgementResult & { duplicateOf?: string; counted?: boolean })[];
  let aiCount = 0;
  for (const j of judgements) {
    if (j.verdict !== 'discrepancy') continue;
    const topic = judgementTopic(j);
    const citedDoc = (j.cites || []).map((c) => resolveCitedDocument(c.document, documents)).find(Boolean) || null;
    if (citedDoc && unreadableIds.has(citedDoc.id)) {
      j.duplicateOf = 'Document could not be read';
      j.counted = false;
      continue;
    }
    const key = topic.startsWith('ai:') ? `${topic}|${citedDoc?.id || ''}` : topic;
    if (topicsTaken.has(topic) || topicsTaken.has(key)) {
      j.duplicateOf = 'Already reported above';
      j.counted = false;
      continue;
    }
    // Safety net: the AI's main evidence is the same document field a rule discrepancy is based on
    const mainCite = (j.cites || []).find((c) => !/credit|\blc\b|mt700|letter of credit/i.test(c.document || ''));
    const mainDoc = mainCite ? resolveCitedDocument(mainCite.document, documents) : null;
    const sameField = mainDoc && mainCite ? ruleFieldsTaken.get(`${mainDoc.type}:${String(mainCite.field).toLowerCase()}`) : undefined;
    if (sameField) {
      j.duplicateOf = `Same problem as "${sameField}"`;
      j.counted = false;
      continue;
    }
    topicsTaken.add(key);
    const audit = citedDoc ? auditById.get(citedDoc.id)! : getPresentationAudit();
    const finding: Finding = {
      id: `ai-${aiCount + 1}`,
      severity: j.severity || 'MAJOR',
      title: j.title,
      description: j.explanation,
      ruleCitation: j.ucp_article,
      foundValue: (j.evidence || []).filter((e) => e.document && !/credit|lc|mt700/i.test(e.document)).map((e) => `${e.document}: ${e.value ?? ''}`).join('; ') || (j.cites || []).map((c) => `${c.document} → ${c.field}`).join('; '),
      expectedValue: (j.evidence || []).filter((e) => /credit|lc|mt700/i.test(e.document)).map((e) => String(e.value ?? '')).join('; ') || 'Consistent with the credit and other documents',
      remediation: `Correct ${audit.docName} so it does not conflict with the credit (${j.ucp_article}).`,
      source: 'Judgement',
      cites: j.cites,
      evidence: j.evidence,
    };
    audit.findings.push(finding);
    allFindings.push({ finding, audit });
    j.counted = true;
    aiCount++;
  }

  // 3. Fixes (deterministic baseline; the server may replace them with Gemini-written fixes)
  for (const { finding, audit } of allFindings) {
    finding.fix = generateDiscrepancyFix(finding, lc, audit.docName);
  }

  audits.forEach((a) => {
    a.discrepancyCount = a.findings.length;
    a.status = a.findings.length ? 'Discrepancy Identified' : 'Pass';
  });

  const total = allFindings.length;
  const ruleCount = total - aiCount;
  const unreadable = documents.filter(isUnreadable).map(docLabel);

  // 4. Verdict and score (share of applicable checks that passed)
  const passedChecks = rules.filter((r) => r.status === 'PASS').length;
  const score = passedChecks + total === 0 ? 0 : Math.round((100 * passedChecks) / (passedChecks + total));
  const status: ExaminationResult['status'] = unreadable.length ? 'INCOMPLETE' : total === 0 ? 'CLEAN' : 'DISCREPANCIES_FOUND';
  const hasCritical = allFindings.some((f) => f.finding.severity === 'CRITICAL');
  const riskLevel: ExaminationResult['riskLevel'] = status === 'CLEAN' ? 'Low' : hasCritical || total >= 3 || unreadable.length ? 'High' : 'Moderate';

  const fee = feeFrom47A(lc);
  const top = allFindings.slice(0, 3).map((f) => f.finding.title).join('; ');
  let executiveSummary: string;
  if (status === 'INCOMPLETE') {
    executiveSummary = `Examination incomplete: ${unreadable.join(', ')} could not be read. Upload a clearer copy before relying on this result.` +
      (total ? ` ${total} discrepanc${total === 1 ? 'y was' : 'ies were'} found in the documents that could be read.` : '');
  } else if (status === 'CLEAN') {
    executiveSummary = `No discrepancies found. ${passedChecks} checks passed against the credit under UCP 600 and ISBP 821.`;
  } else {
    executiveSummary = `${total} discrepanc${total === 1 ? 'y' : 'ies'} found (${ruleCount} by rules, ${aiCount} by AI review): ${top}${total > 3 ? `, and ${total - 3} more` : ''}. ` +
      `Correct these before presenting to the bank${fee ? `; the credit deducts a discrepancy fee of ${fee} per discrepant presentation` : ''}.`;
  }

  const remediationPlan: RemediationStep[] = allFindings.map(({ finding, audit }, i) => ({
    step: i + 1,
    priority: finding.severity === 'CRITICAL' ? 'URGENT' : finding.severity === 'MAJOR' ? 'HIGH' : 'MEDIUM',
    action: finding.remediation || finding.title,
    targetDoc: audit.docName,
    reason: `${finding.description} (${finding.ruleCitation})`,
    fix: finding.fix,
    fixType: finding.fix?.fixType,
    fixTypeLabel: finding.fix?.fixTypeLabel,
    copyableContent: finding.fix?.copyableContent,
  }));

  const reissuable = allFindings.filter((f) => f.finding.fix?.fixType === 'CORRECTED_TEXT').length;
  const amendments = allFindings.filter((f) => f.finding.fix?.fixType === 'LC_AMENDMENT_REQUEST').length;

  return {
    status,
    riskLevel,
    complianceScore: score,
    executiveSummary,
    documentAudits: audits,
    remediationPlan,
    comparisonMatrix: buildComparisonMatrix(lc, documents),
    ruleEvaluations: rules,
    judgements,
    discardedFindings: input.discardedFindings,
    finalSummary: buildFinalSummaryCard({
      discrepanciesCount: total,
      durationMs: input.durationMs,
      lcAmount: lc.amount,
      lcCurrency: lc.currency,
      lcAdditionalConditions: lc.additionalConditions,
      reissuableCount: reissuable,
      amendmentCount: amendments,
    }),
    pipelineStats: {
      durationMs: input.durationMs,
      modelUsed: input.modelUsed,
      rulesEvaluated: rules.length,
      timestamp: new Date().toISOString(),
    },
    totalDiscrepancies: total,
    ruleDiscrepancyCount: ruleCount,
    aiDiscrepancyCount: aiCount,
    unreadableDocuments: unreadable,
    presentationDate: input.presentationDate || new Date().toISOString().slice(0, 10),
    aiStatus,
  };
}

/** Recomputes the counts that depend on fixes after Gemini has rewritten them. */
export function refreshFixCounts(result: ExaminationResult): void {
  const findings = result.documentAudits.flatMap((a) => a.findings);
  const byId = new Map(findings.map((f) => [f.id, f]));
  result.remediationPlan.forEach((step, i) => {
    const f = findings[i] && byId.get(findings[i].id);
    if (f?.fix) {
      step.fix = f.fix;
      step.fixType = f.fix.fixType;
      step.fixTypeLabel = f.fix.fixTypeLabel;
      step.copyableContent = f.fix.copyableContent;
    }
  });
  if (result.finalSummary) {
    result.finalSummary.reissuableFixesCount = findings.filter((f) => f.fix?.fixType === 'CORRECTED_TEXT').length;
    result.finalSummary.amendmentRequestsCount = findings.filter((f) => f.fix?.fixType === 'LC_AMENDMENT_REQUEST').length;
  }
}
