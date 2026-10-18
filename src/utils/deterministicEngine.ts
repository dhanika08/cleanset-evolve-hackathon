/**
 * Deterministic Trade Finance Rule Engine (No LLM).
 * Strictly evaluates shipping documents against Letter of Credit terms
 * under ICC UCP 600 and ISBP 821.
 *
 * Each evaluated rule returns:
 * { id, title, status, documents_involved, fields_used, explanation, ucp_article, source: "Rule" }
 */

import { parseFinancialAmount, extractFieldsWithDeterministicRules, toIsoDate, splitSwiftList } from './fieldExtractor.ts';

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
  /** Document the finding belongs to (set by per-document rules). */
  target_document_id?: string;
}

export interface DeterministicEngineInput {
  lc: {
    lcNumber?: string;
    amount?: number;
    currency?: string;
    expiryDate?: string;
    latestShipmentDate?: string;
    presentationPeriodDays?: number;
    presentationDate?: string;
    partialShipment?: 'ALLOWED' | 'PROHIBITED';
    portOfLoading?: string;
    portOfDischarge?: string;
    applicant?: string;
    beneficiary?: string;
    descriptionOfGoods?: string;
    requiredDocuments?: string[] | string;
    additionalConditions?: string[] | string;
    rawText?: string;
    extractedFields?: Record<string, any>;
  };
  documents: Array<{
    id: string;
    type: string;
    title: string;
    fileName?: string;
    rawText?: string;
    extractedFields?: Record<string, any>;
  }>;
  presentationDate?: string; // Optional simulated presentation date, defaults to current date or on-board + 5 days
}

/**
 * Helper to parse dates safely (YYYY-MM-DD, standard formats, or YYMMDD e.g. 261010 -> 2026-10-10)
 */
export function parseDateMs(dateStr?: string | null): number | null {
  const iso = toIsoDate(dateStr);
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/**
 * Parses financial amounts with currency codes, thousands separators, and SWIFT decimal commas (EUR148500,00).
 * If a value can't be parsed, returns null.
 */
export function parseCleanAmount(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const s = String(val).trim();
  if (!s) return null;

  // Remove currency codes and symbols
  let clean = s.replace(/\b[A-Z]{3}\b/gi, '').replace(/[$€£¥]/g, '').trim();

  // If SWIFT decimal comma format like 148500,00 or 148500,
  if (/^\d+,\d{1,2}$/.test(clean)) {
    clean = clean.replace(',', '.');
  } else if (/^\d+,\d{3}(?:,\d{3})*(?:\.\d+)?$/.test(clean)) {
    clean = clean.replace(/,/g, '');
  } else if (/^\d+\.\d{3}(?:\.\d{3})*(?:,\d+)?$/.test(clean)) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',') && clean.includes('.')) {
    if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      clean = clean.replace(/,/g, '');
    }
  } else if (clean.includes(',')) {
    clean = clean.replace(/,/g, '');
  }

  const num = parseFloat(clean.replace(/[^\d.-]/g, ''));
  return isNaN(num) ? null : num;
}

/**
 * Helper to normalize string for comparison
 */
function normalizeText(text?: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Main Deterministic Rule Engine function
 */
export function evaluateDeterministicRules(input: DeterministicEngineInput): RuleResult[] {
  const { lc, documents } = input;
  const results: RuleResult[] = [];

  // Identify specific documents
  const invDoc = documents.find((d) => d.type === 'COMMERCIAL_INVOICE');
  const blDoc = documents.find((d) => d.type === 'BILL_OF_LADING');
  const insDoc = documents.find((d) => d.type === 'INSURANCE_CERTIFICATE');
  const plDoc = documents.find((d) => d.type === 'PACKING_LIST');
  const cooDoc = documents.find((d) => d.type === 'CERTIFICATE_OF_ORIGIN');

  // Extract helper values from extractedFields or direct properties
  const lcLatestShipDateStr = lc.extractedFields?.latest_shipment_date?.value || lc.latestShipmentDate;
  const lcExpiryDateStr = lc.extractedFields?.expiry_date?.value || lc.expiryDate;
  const rawLcAmt = lc.extractedFields?.amount?.value ?? lc.extractedFields?.lc_amount?.value ?? lc.extractedFields?.credit_amount?.value ?? lc.amount;
  let lcAmount = parseCleanAmount(rawLcAmt) ?? (typeof lc.amount === 'number' && lc.amount > 0 ? lc.amount : 0);
  if (!lcAmount && lc.rawText) {
    const fromRaw = extractFieldsWithDeterministicRules('LETTER_OF_CREDIT', lc.rawText);
    lcAmount = parseCleanAmount(fromRaw.amount?.value) || 0;
  }

  const lcCurrency = (lc.extractedFields?.currency?.value || lc.currency || 'USD').toUpperCase();
  const lcPortLoading = lc.extractedFields?.port_of_loading?.value || lc.portOfLoading;
  const lcPortDischarge = lc.extractedFields?.port_of_discharge?.value || lc.portOfDischarge;
  const lcApplicant = lc.extractedFields?.applicant?.value || lc.applicant || '';
  const lcPresentationDays = Number(lc.extractedFields?.presentation_period?.value) || lc.presentationPeriodDays || 21;

  // Bill of Lading values
  const blOnBoardDateStr = blDoc?.extractedFields?.shipped_on_board_date?.value || 
    (blDoc?.rawText?.match(/(?:Shipped\s*on\s*Board|On\s*Board\s*Date|Clean\s*On\s*Board\s*Date)[:\s]+([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2}|\d{6})/i)?.[1]) ||
    blDoc?.extractedFields?.issue_date?.value;
  
  const blPortLoading = blDoc?.extractedFields?.port_of_loading?.value || 
    (blDoc?.rawText?.match(/Port\s*of\s*Loading[:\s]+([^\r\n,]+)/i)?.[1]);
  
  const blPortDischarge = blDoc?.extractedFields?.port_of_discharge?.value || 
    (blDoc?.rawText?.match(/Port\s*of\s*Discharge[:\s]+([^\r\n,]+)/i)?.[1]);

  // Invoice values
  const rawInvAmt = invDoc?.extractedFields?.total_amount?.value ?? invDoc?.extractedFields?.amount?.value ?? invDoc?.extractedFields?.invoice_amount?.value;
  let invAmount = parseCleanAmount(rawInvAmt) ?? 
    (parseCleanAmount(invDoc?.rawText?.match(/(?:(?:Invoice\s*Total|Grand\s*Total|Total\s*CIF\s*Amount|Total\s*CIF\s*Value|Total\s*Amount|Total\s*CIF|Total)[:\s]+)?(?:[A-Z]{3}|[$€£¥])?\s*([0-9,]+(?:\.[0-9]{2})?)/i)?.[1]) ?? 0);
  if (!invAmount && invDoc?.rawText) {
    const fromRaw = extractFieldsWithDeterministicRules('COMMERCIAL_INVOICE', invDoc.rawText);
    invAmount = parseCleanAmount(fromRaw.total_amount?.value) || 0;
  }
  const invBuyer = invDoc?.extractedFields?.applicant_buyer?.value || 
    (invDoc?.rawText?.match(/(?:Bill\s*To|Buyer)[:\s]+([^\r\n]+)/i)?.[1]) || '';
  const invPortLoading = invDoc?.extractedFields?.port_of_loading?.value || 
    (invDoc?.rawText?.match(/Port\s*of\s*Loading[:\s]+([^\r\n,]+)/i)?.[1]);
  const invPortDischarge = invDoc?.extractedFields?.port_of_discharge?.value || 
    (invDoc?.rawText?.match(/Port\s*of\s*Discharge[:\s]+([^\r\n,]+)/i)?.[1]);

  // Insurance values
  const rawInsAmt = insDoc?.extractedFields?.sum_insured_amount?.value ?? insDoc?.extractedFields?.amount?.value;
  const insSumInsured = parseCleanAmount(rawInsAmt) ??
    (parseCleanAmount(insDoc?.rawText?.match(/(?:Sum\s*Insured[:\s]+)(?:[A-Z]{3})?\s*([0-9,]+(?:\.[0-9]{2})?)/i)?.[1]) ?? 0);
  const insInceptionDateStr = insDoc?.extractedFields?.effective_inception_date?.value || 
    (insDoc?.rawText?.match(/(?:Effective\s*Date|Date\s*of\s*Attachment|Inception\s*Date)[:\s]+([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i)?.[1]);

  // Presentation Date: default to today if not provided, remove 'B/L date + 5 days' default
  const blTime = parseDateMs(blOnBoardDateStr);
  const presentationTime = input.presentationDate ? parseDateMs(input.presentationDate) : Date.now();
  const allowedPresentationDays = lcPresentationDays || 21;
  const lastDayToPresent = blTime ? new Date(blTime + allowedPresentationDays * 86400000).toISOString().slice(0, 10) : null;
  const isEarlyPresentation = Boolean(presentationTime && blTime && presentationTime < blTime);

  // -------------------------------------------------------------
  // RULE 1: Shipment date <= LC latest shipment date
  // -------------------------------------------------------------
  {
    const latestShipTime = parseDateMs(lcLatestShipDateStr);
    const reqDocsText = (Array.isArray(lc.requiredDocuments) ? lc.requiredDocuments.join(' ') : lc.requiredDocuments || '') + (lc.rawText || '');
    const lcRequiresBL = /bill\s*of\s*lading|b\/l|transport\s*doc|marine\s*bill|ocean\s*bill/i.test(reqDocsText);

    if (!blDoc) {
      if (lcRequiresBL) {
        results.push({
          id: 'rule-shipment-date',
          title: 'Shipment Date vs LC Latest Shipment Date',
          status: 'DISCREPANCY',
          documents_involved: ['Letter of Credit', 'Bill of Lading'],
          fields_used: ['lc.latest_shipment_date', 'bl.shipped_on_board_date'],
          explanation: 'Missing Bill of Lading: Credit Field 46A mandates a Bill of Lading, but none was presented to verify on-board date.',
          ucp_article: 'UCP 600 Article 20(a)(ii) & ISBP 821',
          source: 'Rule',
          severity: 'CRITICAL',
          expectedValue: `On or before ${lcLatestShipDateStr || 'Latest Shipment Date'}`,
          foundValue: 'No Bill of Lading presented',
          remediation: 'Present a valid Bill of Lading with dated Shipped On Board notation.',
        });
      } else {
        results.push({
          id: 'rule-shipment-date',
          title: 'Shipment Date vs LC Latest Shipment Date',
          status: 'NOT_APPLICABLE',
          documents_involved: ['Letter of Credit'],
          fields_used: ['lc.latest_shipment_date'],
          explanation: 'No Bill of Lading presented or required under credit terms.',
          ucp_article: 'UCP 600 Article 20(a)(ii)',
          source: 'Rule',
        });
      }
    } else if (!latestShipTime || !blTime) {
      results.push({
        id: 'rule-shipment-date',
        title: 'Shipment Date vs LC Latest Shipment Date',
        status: 'NOT_APPLICABLE',
        documents_involved: ['Letter of Credit', 'Bill of Lading'],
        fields_used: ['lc.latest_shipment_date', 'bl.shipped_on_board_date'],
        explanation: 'Latest shipment date in LC or on-board date in Bill of Lading is unreadable or not specified.',
        ucp_article: 'UCP 600 Article 20(a)(ii)',
        source: 'Rule',
      });
    } else {
      const isShippedOnTime = blTime <= latestShipTime;
      const diffDays = Math.round((blTime - latestShipTime) / 86400000);
      results.push({
        id: 'rule-shipment-date',
        title: 'Shipment Date vs LC Latest Shipment Date',
        status: isShippedOnTime ? 'PASS' : 'DISCREPANCY',
        documents_involved: ['Letter of Credit', 'Bill of Lading'],
        fields_used: ['lc.latest_shipment_date', 'bl.shipped_on_board_date'],
        explanation: isShippedOnTime
          ? `Compliant: B/L on-board date (${blOnBoardDateStr}) is on or before LC latest shipment date (${lcLatestShipDateStr}).`
          : `Late Shipment Discrepancy: Goods shipped on board on ${blOnBoardDateStr}, which is ${diffDays} day(s) after LC latest shipment date (${lcLatestShipDateStr}) stipulated in Field 44C.`,
        ucp_article: 'UCP 600 Article 20(a)(ii) & ISBP 821',
        source: 'Rule',
        severity: isShippedOnTime ? undefined : 'CRITICAL',
        expectedValue: `On or before ${lcLatestShipDateStr}`,
        foundValue: blOnBoardDateStr || 'Unknown',
        remediation: isShippedOnTime ? undefined : 'Request buyer to issue an LC Amendment (MT707) extending Field 44C latest shipment date.',
      });
    }
  }

  // -------------------------------------------------------------
  // RULE 2: Presentation date minus shipment date <= 21 days (UCP 600 Art 14(c))
  // -------------------------------------------------------------
  {
    if (!blTime || !presentationTime) {
      results.push({
        id: 'rule-presentation-period',
        title: 'Presentation Period (<= 21 Days from Shipment)',
        status: 'NOT_APPLICABLE',
        documents_involved: ['Bill of Lading', 'Presentation Schedule'],
        fields_used: ['bl.shipped_on_board_date', 'presentation_date', 'lc.presentation_period'],
        explanation: 'Shipment date or presentation date could not be determined.',
        ucp_article: 'UCP 600 Article 14(c)',
        source: 'Rule',
      });
    } else {
      const elapsedDays = Math.round((presentationTime - blTime) / 86400000);
      const allowedDays = lcPresentationDays || 21;
      const isWithinPeriod = elapsedDays >= 0 && elapsedDays <= allowedDays;

      let explanationText = '';
      if (isEarlyPresentation) {
        explanationText = `Warning: Presentation date (${input.presentationDate || new Date(presentationTime).toISOString().slice(0, 10)}) is earlier than Shipped on Board date (${blOnBoardDateStr}). Documents cannot be presented prior to issuance/shipment.`;
      } else if (isWithinPeriod) {
        explanationText = `Compliant: Presentation occurred ${elapsedDays} day(s) after shipment date, within allowable ${allowedDays}-day limit (Presentation date used: ${input.presentationDate || new Date(presentationTime).toISOString().slice(0, 10)}, Last day to present: ${lastDayToPresent}).`;
      } else {
        explanationText = `Stale Document Discrepancy: Documents presented ${elapsedDays} days after shipment date, exceeding the ${allowedDays}-day presentation period under UCP 600 Art 14(c) (Presentation date used: ${input.presentationDate || new Date(presentationTime).toISOString().slice(0, 10)}, Last day to present was ${lastDayToPresent}).`;
      }

      results.push({
        id: 'rule-presentation-period',
        title: 'Presentation Period (<= 21 Days from Shipment)',
        // A presentation date before the shipment date is a data-entry problem, not a discrepancy
        status: isWithinPeriod ? 'PASS' : isEarlyPresentation ? 'NOT_APPLICABLE' : 'DISCREPANCY',
        documents_involved: ['Bill of Lading', 'Presentation Schedule'],
        fields_used: ['bl.shipped_on_board_date', 'presentation_date', 'lc.presentation_period'],
        explanation: explanationText,
        ucp_article: 'UCP 600 Article 14(c)',
        source: 'Rule',
        severity: isWithinPeriod || isEarlyPresentation ? undefined : 'CRITICAL',
        expectedValue: `Within ${allowedDays} days after shipment date (Last day: ${lastDayToPresent})`,
        foundValue: `${elapsedDays} days after shipment date (Presented: ${input.presentationDate || new Date(presentationTime).toISOString().slice(0, 10)})`,
        remediation: isWithinPeriod ? undefined : 'Present documents immediately within the allowed presentation window or obtain LC amendment.',
      });
    }
  }

  // -------------------------------------------------------------
  // RULE 3: Invoice amount <= LC amount, allowing tolerance (Art 30: "about" = ±10%)
  // -------------------------------------------------------------
  {
    if (!invDoc) {
      results.push({
        id: 'rule-invoice-amount-tolerance',
        title: 'Invoice Amount vs LC Amount (Tolerance Evaluation)',
        status: 'DISCREPANCY',
        documents_involved: ['Commercial Invoice', 'Letter of Credit'],
        fields_used: ['invoice.total_amount', 'lc.amount'],
        explanation: 'Missing Commercial Invoice: Cannot evaluate invoice total against credit value.',
        ucp_article: 'UCP 600 Article 18(b) & Article 30',
        source: 'Rule',
        severity: 'CRITICAL',
        expectedValue: `${lcCurrency} ${lcAmount.toLocaleString()}`,
        foundValue: 'No Commercial Invoice presented',
        remediation: 'Present a signed commercial invoice matching the credit amount.',
      });
    } else if (lcAmount <= 0) {
      results.push({
        id: 'rule-invoice-amount-tolerance',
        title: 'Invoice Amount vs LC Amount (Tolerance Evaluation)',
        status: 'NOT_APPLICABLE',
        documents_involved: ['Commercial Invoice', 'Letter of Credit'],
        fields_used: ['invoice.total_amount', 'lc.amount'],
        explanation: `Letter of Credit amount is not specified in Field 32B or is currently 0.00. Invoice total is ${lcCurrency} ${invAmount.toLocaleString()}. Please enter the Credit Amount in the LC form to evaluate tolerance.`,
        ucp_article: 'UCP 600 Article 30 & Article 18(b)',
        source: 'Rule',
      });
    } else {
      const fullLCText = (lc.rawText || '') + (lc.descriptionOfGoods || '') + (lc.extractedFields?.quantity_tolerance?.value || '');
      const hasAboutTolerance = /\b(about|approx(?:imately)?|circa)\b/i.test(fullLCText);
      const tolerancePct = hasAboutTolerance ? 0.10 : 0.00;
      const maxAllowed = lcAmount * (1 + tolerancePct);

      const isAmountCompliant = invAmount <= maxAllowed + 0.01;

      results.push({
        id: 'rule-invoice-amount-tolerance',
        title: 'Invoice Amount vs LC Amount (Tolerance Evaluation)',
        status: isAmountCompliant ? 'PASS' : 'DISCREPANCY',
        documents_involved: ['Commercial Invoice', 'Letter of Credit'],
        fields_used: ['invoice.total_amount', 'lc.amount', 'lc.quantity_tolerance'],
        explanation: isAmountCompliant
          ? `Compliant: Invoice total of ${lcCurrency} ${invAmount.toLocaleString()} is within credit limit of ${lcCurrency} ${lcAmount.toLocaleString()}${hasAboutTolerance ? ' (including 10% Art 30 "about" tolerance)' : ''}.`
          : `Overdrawn LC Discrepancy: Invoice total of ${lcCurrency} ${invAmount.toLocaleString()} exceeds maximum permitted credit value of ${lcCurrency} ${maxAllowed.toLocaleString()}.`,
        ucp_article: 'UCP 600 Article 30 & Article 18(b)',
        source: 'Rule',
        severity: isAmountCompliant ? undefined : 'CRITICAL',
        expectedValue: `<= ${lcCurrency} ${maxAllowed.toLocaleString()}`,
        foundValue: `${lcCurrency} ${invAmount.toLocaleString()}`,
        remediation: isAmountCompliant ? undefined : 'Adjust unit price or quantity in Commercial Invoice so total does not exceed the credit amount.',
      });
    }
  }

  // -------------------------------------------------------------
  // RULE 4: Insurance coverage >= 110% of CIF value (Art 28(f)); insurance date <= shipment date (Art 28(e))
  // -------------------------------------------------------------
  {
    const lcRequiresInsurance = /insurance/i.test((Array.isArray(lc.requiredDocuments) ? lc.requiredDocuments.join(' ') : lc.requiredDocuments || '') + (lc.rawText || ''));

    if (!insDoc) {
      if (lcRequiresInsurance) {
        results.push({
          id: 'rule-insurance-coverage-and-date',
          title: 'Insurance Coverage Percentage & Attachment Date',
          status: 'DISCREPANCY',
          documents_involved: ['Insurance Certificate / Policy', 'Letter of Credit'],
          fields_used: ['lc.required_documents', 'insurance.policy_number'],
          explanation: 'Missing Insurance Document: Credit stipulates insurance policy/certificate but none was presented.',
          ucp_article: 'UCP 600 Article 28',
          source: 'Rule',
          severity: 'CRITICAL',
          expectedValue: 'Insurance document covering 110% of CIF value',
          foundValue: 'No insurance document in presentation set',
          remediation: 'Attach an original marine insurance policy or certificate covering 110% CIF value.',
        });
      } else {
        results.push({
          id: 'rule-insurance-coverage-and-date',
          title: 'Insurance Coverage Percentage & Attachment Date',
          status: 'NOT_APPLICABLE',
          documents_involved: ['Insurance Certificate / Policy'],
          fields_used: ['insurance.sum_insured_amount'],
          explanation: 'Insurance document is not required under the terms of this credit (e.g. FOB/CFR shipment).',
          ucp_article: 'UCP 600 Article 28',
          source: 'Rule',
        });
      }
    } else {
      const minCoverageRequired = (invAmount > 0 ? invAmount : lcAmount) * 1.10;
      const isCoverageSufficient = insSumInsured >= minCoverageRequired - 1.0; // small rounding margin
      
      const insTime = parseDateMs(insInceptionDateStr);
      const isDateValid = !blTime || !insTime || insTime <= blTime;

      // Amount and date are separate discrepancies (each is counted and fixed on its own)
      const amountOk = isCoverageSufficient || !(insSumInsured > 0);
      results.push({
        id: 'rule-insurance-coverage-and-date',
        title: 'Insurance Amount (at least 110% of CIF)',
        status: amountOk ? 'PASS' : 'DISCREPANCY',
        documents_involved: ['Insurance Certificate / Policy', 'Commercial Invoice'],
        fields_used: ['insurance.sum_insured_amount', 'invoice.total_amount'],
        explanation: amountOk
          ? insSumInsured > 0
            ? `Compliant: Insurance covers ${lcCurrency} ${insSumInsured.toLocaleString()} (at least 110% of CIF, ${lcCurrency} ${minCoverageRequired.toLocaleString()}).`
            : 'Amount insured could not be read; not checked.'
          : `Insurance Discrepancy: Sum insured (${lcCurrency} ${insSumInsured.toLocaleString()}) is less than the required 110% of CIF value (${lcCurrency} ${minCoverageRequired.toLocaleString()}) per UCP 600 Art 28(f)(ii).`,
        ucp_article: 'UCP 600 Article 28(f)(ii)',
        source: 'Rule',
        severity: amountOk ? undefined : 'CRITICAL',
        expectedValue: `>= ${lcCurrency} ${minCoverageRequired.toLocaleString()} (110% CIF)`,
        foundValue: `${lcCurrency} ${insSumInsured.toLocaleString()}`,
        remediation: amountOk ? undefined : `Ask the insurer to increase the amount insured to at least ${lcCurrency} ${minCoverageRequired.toLocaleString()} (110% of CIF).`,
      });
      const dateChecked = Boolean(insTime && blTime);
      results.push({
        id: 'rule-insurance-date',
        title: 'Insurance Date vs Shipment Date',
        status: !dateChecked ? 'NOT_APPLICABLE' : isDateValid ? 'PASS' : 'DISCREPANCY',
        documents_involved: ['Insurance Certificate / Policy', 'Bill of Lading'],
        fields_used: ['insurance.effective_inception_date', 'bl.shipped_on_board_date'],
        explanation: !dateChecked
          ? 'Insurance date or shipment date could not be read; not checked.'
          : isDateValid
          ? `Compliant: Insurance dated ${insInceptionDateStr}, on or before the shipment date (${blOnBoardDateStr}).`
          : `Insurance Discrepancy: Insurance dated ${insInceptionDateStr}, after the date of shipment (${blOnBoardDateStr}), with no statement that cover is effective from the date of shipment (UCP 600 Art 28(e)).`,
        ucp_article: 'UCP 600 Article 28(e)',
        source: 'Rule',
        severity: !dateChecked || isDateValid ? undefined : 'CRITICAL',
        expectedValue: `Dated on or before ${blOnBoardDateStr || 'the shipment date'}`,
        foundValue: `Dated ${insInceptionDateStr || 'unspecified'}`,
        remediation: !dateChecked || isDateValid ? undefined : 'Obtain an insurance document dated on or before shipment, or one stating that cover is effective from the date of shipment.',
      });
    }
  }

  // -------------------------------------------------------------
  // RULE 5: Ports of loading/discharge on B/L and invoice match the LC
  // -------------------------------------------------------------
  {
    const reqDocsText = (Array.isArray(lc.requiredDocuments) ? lc.requiredDocuments.join(' ') : lc.requiredDocuments || '') + (lc.rawText || '');
    const lcRequiresBL = /bill\s*of\s*lading|b\/l|transport\s*doc|marine\s*bill|ocean\s*bill/i.test(reqDocsText);

    if (!blDoc) {
      if (lcRequiresBL && (lcPortLoading || lcPortDischarge)) {
        results.push({
          id: 'rule-ports-match',
          title: 'Port of Loading & Port of Discharge Consistency',
          status: 'DISCREPANCY',
          documents_involved: ['Letter of Credit', 'Bill of Lading'],
          fields_used: ['lc.port_of_loading', 'lc.port_of_discharge'],
          explanation: 'Missing Bill of Lading: Cannot verify loading and discharge ports against LC Field 44E and 44F.',
          ucp_article: 'UCP 600 Article 20(a)(iii)',
          source: 'Rule',
          severity: 'CRITICAL',
          expectedValue: `${lcPortLoading} to ${lcPortDischarge}`,
          foundValue: 'No Bill of Lading presented',
          remediation: 'Present Bill of Lading with ports matching LC Field 44E and 44F.',
        });
      } else {
        results.push({
          id: 'rule-ports-match',
          title: 'Port of Loading & Port of Discharge Consistency',
          status: 'NOT_APPLICABLE',
          documents_involved: ['Letter of Credit'],
          fields_used: ['lc.port_of_loading', 'lc.port_of_discharge'],
          explanation: 'No Bill of Lading presented or port check not required.',
          ucp_article: 'UCP 600 Article 20(a)(iii)',
          source: 'Rule',
        });
      }
    } else {
      const normLCLoading = normalizeText(lcPortLoading);
      const normLCDischarge = normalizeText(lcPortDischarge);
      const normBLLoading = normalizeText(blPortLoading);
      const normBLDischarge = normalizeText(blPortDischarge);

      // Check if primary port keywords match
      const loadingMatch = !normLCLoading || normBLLoading.includes(normLCLoading) || normLCLoading.includes(normBLLoading);
      const dischargeMatch = !normLCDischarge || normBLDischarge.includes(normLCDischarge) || normLCDischarge.includes(normBLDischarge);

      const portDiscrepancies: string[] = [];
      if (!loadingMatch) {
        portDiscrepancies.push(`Port of loading on B/L ("${blPortLoading}") does not match LC Field 44E ("${lcPortLoading}").`);
      }
      if (!dischargeMatch) {
        portDiscrepancies.push(`Port of discharge on B/L ("${blPortDischarge}") does not match LC Field 44F ("${lcPortDischarge}").`);
      }

      const isPortsMatch = portDiscrepancies.length === 0;

      results.push({
        id: 'rule-ports-match',
        title: 'Port of Loading & Port of Discharge Consistency',
        status: isPortsMatch ? 'PASS' : 'DISCREPANCY',
        documents_involved: ['Letter of Credit', 'Bill of Lading', 'Commercial Invoice'],
        fields_used: ['lc.port_of_loading', 'lc.port_of_discharge', 'bl.port_of_loading', 'bl.port_of_discharge'],
        explanation: isPortsMatch
          ? `Compliant: Port of loading ("${blPortLoading || lcPortLoading}") and discharge ("${blPortDischarge || lcPortDischarge}") strictly match LC Fields 44E and 44F.`
          : `Port Mismatch Discrepancy: ${portDiscrepancies.join(' ')}`,
        ucp_article: 'UCP 600 Article 20(a)(iii) & Article 14(d)',
        source: 'Rule',
        severity: isPortsMatch ? undefined : 'CRITICAL',
        expectedValue: `POL: ${lcPortLoading} | POD: ${lcPortDischarge}`,
        foundValue: `POL: ${blPortLoading || 'None'} | POD: ${blPortDischarge || 'None'}`,
        remediation: isPortsMatch ? undefined : 'Amend Bill of Lading to indicate port of loading and discharge exactly as stipulated in the credit.',
      });
    }
  }

  // -------------------------------------------------------------
  // RULE 6: B/L is clean (no damage notes) (Art 27)
  // -------------------------------------------------------------
  {
    if (!blDoc) {
      results.push({
        id: 'rule-clean-transport-document',
        title: 'Clean Transport Document (No Defective Condition Clauses)',
        status: 'NOT_APPLICABLE',
        documents_involved: ['Bill of Lading'],
        fields_used: ['bl.clean_on_board_clause'],
        explanation: 'No Bill of Lading presented.',
        ucp_article: 'UCP 600 Article 27',
        source: 'Rule',
      });
    } else {
      const blRaw = (blDoc.rawText || '').toLowerCase();
      const blFieldText = Object.values(blDoc.extractedFields || {})
        .map((f: any) => (f && f.value !== null && f.value !== undefined ? String(f.value) : ''))
        .join(' \n ')
        .toLowerCase();
      const blText = `${blRaw}\n${blFieldText}`;

      // UCP 600 Art 27: any clause or notation expressly declaring a defective condition of the goods or packaging.
      const defectPatterns = [
        /\b(?:\d+|some|several|all)?\s*(?:cases?|cartons?|packages?|bags?|drums?|pallets?|units?|crates?|bales?|boxes|coils?|rolls?)\b[^.\n]{0,40}?\b(?:damaged|torn|broken|wet|stained|rusty|rusted|dented|leaking|crushed|holed|soiled|missing|split|burst)\b[^.\n]{0,40}/i,
        /\b(?:damaged|torn|broken|wet|stained|rusty|dented|leaking|crushed|holed|soiled|burst)\s+(?:cases?|cartons?|packages?|bags?|drums?|pallets?|packing|packaging|strapping|wrapping|seals?)\b[^.\n]{0,40}/i,
        /\bpackag(?:ing|es?)\s+(?:is\s+|are\s+)?(?:defective|insufficient|inadequate|not\s+sufficient)\b[^.\n]{0,40}/i,
        /\b(?:second[- ]hand|reconditioned|used)\s+(?:drums?|bags?|cases?|containers?)\b[^.\n]{0,30}/i,
      ];
      let foundDefect: string | undefined;
      for (const re of defectPatterns) {
        const m = blText.match(re);
        if (m) {
          foundDefect = m[0].replace(/\s+/g, ' ').trim().toUpperCase();
          break;
        }
      }
      const hasCleanNotation = /clean\s+on\s+board|shipped\s+on\s+board|on\s+board\s+date|laden\s+on\s+board/i.test(blText) ||
        Boolean(blDoc.extractedFields?.shipped_on_board_date?.value);

      const isClean = !foundDefect && hasCleanNotation;

      results.push({
        id: 'rule-clean-transport-document',
        title: 'Clean Transport Document (No Defective Condition Clauses)',
        status: isClean ? 'PASS' : 'DISCREPANCY',
        documents_involved: ['Bill of Lading'],
        fields_used: ['bl.clean_on_board_clause', 'bl.clauses_and_notations'],
        explanation: isClean
          ? 'Compliant: Bill of Lading bears a clean on-board notation with no clauses declaring a defective condition of goods or packaging.'
          : foundDefect
          ? `Foul B/L Discrepancy: Bill of Lading contains clause indicating defective condition: "${foundDefect}". A bank will only accept a clean transport document.`
          : 'Missing Clean on Board notation: Bill of Lading lacks standard clean on-board confirmation.',
        ucp_article: 'UCP 600 Article 27',
        source: 'Rule',
        severity: isClean ? undefined : 'CRITICAL',
        expectedValue: 'Clean transport document bearing Clean On Board notation with zero damage clauses',
        foundValue: foundDefect ? `Clause stating: "${foundDefect}"` : (hasCleanNotation ? 'Clean On Board' : 'No Clean notation'),
        remediation: isClean ? undefined : 'Request carrier to re-issue clean bill of lading without foul/damage notations.',
      });
    }
  }

  // -------------------------------------------------------------
  // RULE 7: Invoice is made out to the LC applicant (Art 18)
  // -------------------------------------------------------------
  {
    if (!invDoc) {
      results.push({
        id: 'rule-invoice-applicant',
        title: 'Commercial Invoice Made Out to LC Applicant',
        status: 'DISCREPANCY',
        documents_involved: ['Commercial Invoice', 'Letter of Credit'],
        fields_used: ['invoice.applicant_buyer', 'lc.applicant'],
        explanation: 'Missing Commercial Invoice: Cannot verify buyer against LC applicant.',
        ucp_article: 'UCP 600 Article 18(a)(ii)',
        source: 'Rule',
        severity: 'CRITICAL',
        expectedValue: `Made out to ${lcApplicant || 'Applicant'}`,
        foundValue: 'No invoice presented',
        remediation: 'Present a commercial invoice issued to the LC applicant.',
      });
    } else {
      // Compare company names only (first line), ignoring LLC, LTD, PVT, GMBH, B.V., FZE and address or city words
      const IGNORED_COMPANY_WORDS = new Set([
        'llc', 'ltd', 'pvt', 'limited', 'gmbh', 'bv', 'fze', 'corp', 'corporation',
        'inc', 'incorporated', 'sa', 'pjsc', 'co', 'company', 'and', 'the',
        'street', 'str', 'st', 'ave', 'road', 'rd', 'box', 'city', 'po',
        'germany', 'dubai', 'hamburg', 'rotterdam', 'colombia', 'netherlands', 'bangladesh', 'india', 'pune', 'dhaka', 'amsterdam', 'bogota', 'medellin', 'uae'
      ]);

      const extractCompanyWords = (str: string) => {
        const firstLine = str.split(/\r?\n|,/)[0].trim().toLowerCase();
        return firstLine
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length > 1 && !IGNORED_COMPANY_WORDS.has(w));
      };

      const appWords = extractCompanyWords(lcApplicant);
      const buyerWords = extractCompanyWords(invBuyer);

      if (appWords.length === 0) {
        results.push({
          id: 'rule-invoice-applicant',
          title: 'Commercial Invoice Made Out to LC Applicant',
          status: 'NOT_APPLICABLE',
          documents_involved: ['Commercial Invoice', 'Letter of Credit'],
          fields_used: ['invoice.applicant_buyer', 'lc.applicant'],
          explanation: 'LC applicant is not stipulated in Field 50; applicant verification not applicable.',
          ucp_article: 'UCP 600 Article 18(a)(ii)',
          source: 'Rule',
        });
      } else {
        const matchCount = appWords.filter((w) => buyerWords.includes(w)).length;
        const isAddressedToApplicant = matchCount / appWords.length >= 0.5;

        results.push({
          id: 'rule-invoice-applicant',
          title: 'Commercial Invoice Made Out to LC Applicant',
          status: isAddressedToApplicant ? 'PASS' : 'DISCREPANCY',
          documents_involved: ['Commercial Invoice', 'Letter of Credit'],
          fields_used: ['invoice.applicant_buyer', 'lc.applicant'],
          explanation: isAddressedToApplicant
            ? `Compliant: Commercial Invoice is made out in the name of the LC applicant ("${invBuyer.split(/\r?\n/)[0]}").`
            : `Applicant Mismatch Discrepancy: Commercial Invoice is billed to "${invBuyer.split(/\r?\n/)[0] || 'Unspecified'}", whereas LC Field 50 stipulates applicant is "${lcApplicant.split(/\r?\n/)[0]}".`,
          ucp_article: 'UCP 600 Article 18(a)(ii)',
          source: 'Rule',
          severity: isAddressedToApplicant ? undefined : 'CRITICAL',
          expectedValue: `Billed to: ${lcApplicant}`,
          foundValue: `Billed to: ${invBuyer || 'Unspecified'}`,
          remediation: isAddressedToApplicant ? undefined : 'Re-issue invoice with customer name matching LC Field 50 exactly.',
        });
      }
    }
  }

  // -------------------------------------------------------------
  // RULE 8: LC not expired at presentation
  // -------------------------------------------------------------
  {
    const expiryTime = parseDateMs(lcExpiryDateStr);

    if (!expiryTime || !presentationTime) {
      results.push({
        id: 'rule-lc-expiry-at-presentation',
        title: 'Presentation Prior to LC Expiry Date',
        status: 'NOT_APPLICABLE',
        documents_involved: ['Letter of Credit', 'Presentation Schedule'],
        fields_used: ['lc.expiry_date', 'presentation_date'],
        explanation: 'LC expiry date or presentation date is not specified.',
        ucp_article: 'UCP 600 Article 6(d)(i)',
        source: 'Rule',
      });
    } else {
      const isNotExpired = presentationTime <= expiryTime;
      const diffDays = Math.round((presentationTime - expiryTime) / 86400000);

      results.push({
        id: 'rule-lc-expiry-at-presentation',
        title: 'Presentation Prior to LC Expiry Date',
        status: isNotExpired ? 'PASS' : 'DISCREPANCY',
        documents_involved: ['Letter of Credit', 'Presentation Schedule'],
        fields_used: ['lc.expiry_date', 'presentation_date'],
        explanation: isNotExpired
          ? `Compliant: Presentation is prior to LC expiry date (${lcExpiryDateStr}).`
          : `Expired Letter of Credit Discrepancy: Documents presented ${diffDays} day(s) after LC expiry date (${lcExpiryDateStr}) stipulated in Field 31D.`,
        ucp_article: 'UCP 600 Article 6(d)(i)',
        source: 'Rule',
        severity: isNotExpired ? undefined : 'CRITICAL',
        expectedValue: `Presented on or before ${lcExpiryDateStr}`,
        foundValue: `Presented on ${new Date(presentationTime).toISOString().slice(0, 10)}`,
        remediation: isNotExpired ? undefined : 'Obtain urgent LC Amendment extending expiry date in Field 31D.',
      });
    }
  }

  // -------------------------------------------------------------
  // RULE 9: Every document the LC requires (46A/46B) is presented. One finding per missing document.
  // -------------------------------------------------------------
  {
    const reqDocsText = Array.isArray(lc.requiredDocuments) && lc.requiredDocuments.length
      ? lc.requiredDocuments.join('\n')
      : (typeof lc.requiredDocuments === 'string' && lc.requiredDocuments) ||
        String(lc.extractedFields?.required_documents?.value || '') ||
        (lc.rawText?.match(/:46[AB]:\s*([\s\S]*?)(?=(?:\n\s*:[0-9]{2}[A-Z]?:|$))/i)?.[1]) || '';

    const checkList = [
      { name: 'Commercial Invoice', type: 'COMMERCIAL_INVOICE', regex: /invoice/i },
      { name: 'Bill of Lading / Transport Document', type: 'BILL_OF_LADING', regex: /bills?\s+of\s+lading|\bb\/l\b|transport\s+document|air\s*waybill/i },
      { name: 'Packing List', type: 'PACKING_LIST', regex: /packing\s+list/i },
      { name: 'Certificate of Origin', type: 'CERTIFICATE_OF_ORIGIN', regex: /certificate\s+of\s+origin|origin\s+certificate/i },
      { name: 'Insurance Document', type: 'INSURANCE_CERTIFICATE', regex: /insurance\s+(?:policy|certificate|document)|policy\s+or\s+certificate/i },
      { name: 'Inspection / Phytosanitary Certificate', type: 'INSPECTION_CERTIFICATE', regex: /inspection\s+certificate|certificate\s+of\s+inspection|phytosanitary/i },
    ];

    const required = checkList.filter((req) => req.regex.test(reqDocsText));
    const missing = required.filter((req) => !documents.some((d) => d.type === req.type));
    const present = required.filter((req) => !missing.includes(req));

    if (required.length === 0) {
      results.push({
        id: 'rule-required-document-count',
        title: 'Documents Required by Field 46A Presented',
        status: 'NOT_APPLICABLE',
        documents_involved: ['Letter of Credit'],
        fields_used: ['lc.required_documents'],
        explanation: 'Field 46A could not be read, so the document set was not checked.',
        ucp_article: 'UCP 600 Article 14(a) & Field 46A',
        source: 'Rule',
      });
    } else if (missing.length === 0) {
      results.push({
        id: 'rule-required-document-count',
        title: 'Documents Required by Field 46A Presented',
        status: 'PASS',
        documents_involved: ['Letter of Credit', 'All Shipping Documents'],
        fields_used: ['lc.required_documents', 'documents.type'],
        explanation: `Compliant: all ${present.length} documents required by Field 46A are presented (${present.map((p) => p.name).join(', ')}).`,
        ucp_article: 'UCP 600 Article 14(a) & Field 46A',
        source: 'Rule',
      });
    } else {
      for (const m of missing) {
        results.push({
          id: `rule-required-document-${m.type.toLowerCase()}`,
          title: `Required Document Not Presented: ${m.name}`,
          status: 'DISCREPANCY',
          documents_involved: ['Letter of Credit', 'Presentation'],
          fields_used: ['lc.required_documents', 'documents.type'],
          explanation: `Field 46A requires a ${m.name}, but none is in the presentation.`,
          ucp_article: 'UCP 600 Article 14(a) & Field 46A',
          source: 'Rule',
          severity: 'CRITICAL',
          expectedValue: `${m.name} as described in Field 46A`,
          foundValue: `No ${m.name} presented`,
          remediation: `Obtain and present the ${m.name} exactly as described in Field 46A.`,
        });
      }
    }
  }

  // -------------------------------------------------------------
  // RULE 10: Commercial Invoice Description Correspondence (Art 18(c))
  // -------------------------------------------------------------
  {
    const lcDesc = String(lc.descriptionOfGoods || lc.extractedFields?.goods_description?.value || '').trim();
    if (invDoc && lcDesc) {
      const invDesc = String(invDoc.extractedFields?.goods_description?.value || 
        invDoc.rawText?.match(/(?:Description\s*of\s*Goods|Item\s*Description|Goods)[:\s]+([\s\S]*?)(?=\n\n|\n[A-Z][a-zA-Z\s]+:|$)/i)?.[1] || '').trim();

      if (!invDesc) {
        results.push({
          id: 'rule-invoice-description-art18c',
          title: 'Commercial Invoice Goods Description Correspondence',
          status: 'DISCREPANCY',
          documents_involved: ['Commercial Invoice', 'Letter of Credit'],
          fields_used: ['invoice.goods_description', 'lc.goods_description'],
          explanation: 'Missing goods description in Commercial Invoice: UCP 600 Article 18(c) mandates that the description in the invoice must strictly correspond with that appearing in the credit.',
          ucp_article: 'UCP 600 Article 18(c)',
          source: 'Rule',
          severity: 'CRITICAL',
          expectedValue: lcDesc,
          foundValue: 'No goods description found on invoice',
          remediation: `Amend Commercial Invoice to state the exact full description as per LC Field 45A: "${lcDesc}".`,
        });
      } else {
        const cleanLC = normalizeText(lcDesc);
        const cleanInv = normalizeText(invDesc);

        // Substantive word token check (ignore pure numbers/quantities which are evaluated under Partial Shipment / Art 31, and common incoterms tokens)
        const STOP = new Set(['the', 'and', 'for', 'per', 'with', 'cif', 'fob', 'cfr', 'dap', 'fca', 'cpt', 'cip', 'incoterms', 'dated', 'date', 'each', 'of', 'as', 'no', 'all']);
        const lcWords = Array.from(new Set(cleanLC.split(' ').filter((w) => w.length > 2 && !/^\d+$/.test(w) && !STOP.has(w))));
        const invAllText = normalizeText([
          invDesc,
          invDoc.rawText || '',
          ...Object.values(invDoc.extractedFields || {}).map((f: any) => (f && f.value !== null && f.value !== undefined ? String(f.value) : '')),
        ].join(' '));
        const invWordsSet = new Set(invAllText.split(' '));
        const missingWords = lcWords.filter((w) => !invWordsSet.has(w));

        const isExactMatch = cleanLC === cleanInv;
        const isCloseMatch = missingWords.length === 0;
        const isCompliant = isExactMatch || isCloseMatch;

        results.push({
          id: 'rule-invoice-description-art18c',
          title: 'Commercial Invoice Goods Description Correspondence',
          status: isCompliant ? 'PASS' : 'DISCREPANCY',
          documents_involved: ['Commercial Invoice', 'Letter of Credit'],
          fields_used: ['invoice.goods_description', 'lc.goods_description'],
          explanation: isCompliant
            ? `Compliant: Commercial Invoice description corresponds strictly with LC Field 45A under UCP 600 Article 18(c).`
            : `Description Mismatch Discrepancy: Commercial Invoice description does not correspond strictly with LC Field 45A under UCP 600 Article 18(c). Missing specification(s): [${missingWords.slice(0, 5).join(', ')}].`,
          ucp_article: 'UCP 600 Article 18(c)',
          source: 'Rule',
          severity: isCompliant ? undefined : 'CRITICAL',
          expectedValue: lcDesc,
          foundValue: invDesc,
          remediation: isCompliant ? undefined : `Re-issue Commercial Invoice with exact description as per LC Field 45A: "${lcDesc}".`,
        });
      }
    }
  }

  // -------------------------------------------------------------
  // RULE 11: Cross-Document Gross Weight Consistency (Art 14(d) & ISBP 821)
  // -------------------------------------------------------------
  {
    if (plDoc && blDoc) {
      const plWeightStr = plDoc.extractedFields?.gross_weight?.value || 
        plDoc.rawText?.match(/Gross\s*Weight[:\s]+([0-9,]+(?:\.[0-9]+)?)/i)?.[1];
      // Several B/Ls for one shipment: compare against their total
      const blWeights = documents
        .filter((d) => d.type === 'BILL_OF_LADING')
        .map((d) =>
          parseFinancialAmount(
            d.extractedFields?.gross_weight?.value ||
              d.rawText?.match(/Gross\s*Weight[:\s]+([0-9,]+(?:\.[0-9]+)?)/i)?.[1]
          )
        );
      const plWeight = parseFinancialAmount(plWeightStr);
      const blWeight = blWeights.every((w) => w !== null) ? blWeights.reduce((a, b) => a + (b as number), 0) : null;

      if (plWeight !== null && blWeight !== null) {
        const variance = Math.abs(plWeight - blWeight);
        const isWeightMatch = variance <= 1.0;

        results.push({
          id: 'rule-cross-document-weights',
          title: 'Gross Weight Numerical Consistency Across Packing List & B/L',
          status: isWeightMatch ? 'PASS' : 'DISCREPANCY',
          documents_involved: ['Packing List', 'Bill of Lading'],
          fields_used: ['packing_list.gross_weight', 'bl.gross_weight'],
          explanation: isWeightMatch
            ? `Compliant: Gross weight on Packing List (${plWeight.toLocaleString()} KG) agrees with Bill of Lading (${blWeight.toLocaleString()} KG), satisfying UCP 600 Article 14(d).`
            : `Weight Variance Discrepancy: Packing List indicates ${plWeight.toLocaleString()} KG while Bill of Lading indicates ${blWeight.toLocaleString()} KG (difference of ${variance.toFixed(2)} KG). Under UCP 600 Art 14(d) and ISBP 821, gross weights must not conflict.`,
          ucp_article: 'UCP 600 Article 14(d) & ISBP 821',
          source: 'Rule',
          severity: isWeightMatch ? undefined : 'CRITICAL',
          expectedValue: `Uniform gross weight across transport and packing documents (~${blWeight.toLocaleString()} KG)`,
          foundValue: `PL: ${plWeight.toLocaleString()} KG vs B/L: ${blWeight.toLocaleString()} KG`,
          remediation: isWeightMatch ? undefined : `Re-issue Packing List with gross weight exactly matching Bill of Lading (${blWeight.toLocaleString()} KG).`,
        });
      }
    }
  }

  // -------------------------------------------------------------
  // RULE 12: Field 47A conditions that can be checked in code
  //   (a) "ALL DOCUMENTS MUST INDICATE/MENTION/SHOW/QUOTE ... CREDIT/LC NUMBER" -> each document shows the credit number
  //   (b) "COMMERCIAL INVOICE MUST CERTIFY/STATE ... <statement>" -> the invoice contains that statement
  // -------------------------------------------------------------
  {
    const condItems = Array.isArray(lc.additionalConditions) && lc.additionalConditions.length
      ? lc.additionalConditions
      : splitSwiftList(String(lc.extractedFields?.additional_conditions?.value || lc.rawText?.match(/:47[AB]:\s*([\s\S]*?)(?=(?:\n\s*:[0-9]{2}[A-Z]?:|$))/i)?.[1] || '').split(/\n/));
    const lcNumber = String(lc.extractedFields?.lc_number?.value || lc.lcNumber || '').trim();
    const compact = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const docText = (d: (typeof documents)[number]) =>
      [d.rawText || '', ...Object.values(d.extractedFields || {}).map((f: any) => (f && f.value !== null && f.value !== undefined ? String(f.value) : ''))].join(' ');

    const requiresCreditNo = condItems.some((c) => /ALL\s+DOCUMENTS[^.]*\b(?:INDICATE|MENTION|SHOW|QUOTE|BEAR|STATE)\b[^.]*\b(?:CREDIT|L\/?C|LC|DC)\s*(?:NUMBER|NO\b)/i.test(c));
    if (requiresCreditNo && lcNumber) {
      const needle = compact(lcNumber);
      for (const d of documents) {
        if (d.type === 'OTHER' || d.type === 'INSPECTION_CERTIFICATE') continue;
        const ok = compact(docText(d)).includes(needle);
        if (!ok) {
          results.push({
            id: `rule-47a-credit-number-${d.id}`,
            title: `Credit Number Not Shown on ${d.title || d.fileName || d.type}`,
            status: 'DISCREPANCY',
            documents_involved: [d.title || d.fileName || d.type],
            fields_used: ['lc.additional_conditions', 'lc_reference'],
            explanation: `Field 47A requires all documents to indicate the credit number ${lcNumber}; it was not found on this document.`,
            ucp_article: 'UCP 600 Article 14(a) & Field 47A',
            source: 'Rule',
            severity: 'MAJOR',
            expectedValue: `Credit number ${lcNumber} shown`,
            foundValue: 'Credit number not found',
            remediation: `Re-issue the document showing credit number ${lcNumber}.`,
            target_document_id: d.id,
          });
        }
      }
    }

    if (invDoc) {
      const STOP = new Set(['commercial', 'invoice', 'must', 'explicitly', 'certify', 'certifies', 'certified', 'state', 'stating', 'that', 'the', 'merchandise', 'goods', 'are', 'is', 'to', 'conforms', 'conform', 'comply', 'complies', 'with', 'and', 'of', 'in', 'a', 'an', 'be', 'shall', 'should', 'all', 'this', 'credit', 'standard']);
      const invText = normalizeText(docText(invDoc));
      condItems
        .filter((c) => /INVOICE[^.]*\b(?:MUST|SHALL|TO)\b[^.]*\b(?:CERTIFY|CERTIFYING|STATE|STATING|DECLARE)\b/i.test(c))
        .forEach((c, idx) => {
          const statement = c.replace(/^.*?\b(?:CERTIFY|CERTIFYING|STATE|STATING|DECLARE)\b\s*/i, '').replace(/[.]+$/, '').trim();
          const keyWords = Array.from(new Set(normalizeText(statement).split(' ').filter((w) => w.length > 2 && !STOP.has(w))));
          if (keyWords.length === 0) return;
          const found = keyWords.filter((w) => invText.includes(w)).length;
          const ok = found / keyWords.length >= 0.75;
          results.push({
            id: `rule-47a-invoice-statement-${idx + 1}`,
            title: 'Commercial Invoice Statement Required by Field 47A',
            status: ok ? 'PASS' : 'DISCREPANCY',
            documents_involved: ['Commercial Invoice', 'Letter of Credit'],
            fields_used: ['lc.additional_conditions', 'invoice.clauses_and_certifications'],
            explanation: ok
              ? `Compliant: the invoice contains the statement required by Field 47A ("${statement}").`
              : `Missing statement: Field 47A requires the commercial invoice to certify "${statement}", but the invoice does not contain it.`,
            ucp_article: 'UCP 600 Article 14(a) & Field 47A',
            source: 'Rule',
            severity: ok ? undefined : 'CRITICAL',
            expectedValue: `Invoice certifies: ${statement}`,
            foundValue: ok ? 'Statement present' : 'Statement not found on invoice',
            remediation: ok ? undefined : `Re-issue the commercial invoice with the statement: "WE CERTIFY THAT ${statement.toUpperCase()}".`,
            target_document_id: invDoc.id,
          });
        });
    }
  }

  // -------------------------------------------------------------
  // RULE 13: Partial Shipment Prohibition (Field 43P, 47A & Art 31)
  // -------------------------------------------------------------
  {
    const raw43P = lc.extractedFields?.partial_shipments_allowed?.value;
    const condText = (Array.isArray(lc.additionalConditions) ? lc.additionalConditions.join(' ') : lc.additionalConditions || '') + (lc.rawText || '');
    const is47AProhibited = /PARTIAL\s*SHIPMENT[^\r\n]*(?:PROHIBITED|NOT\s*ALLOWED)/i.test(condText);
    const isProhibited = lc.partialShipment === 'PROHIBITED' ||
      raw43P === false ||
      is47AProhibited ||
      /:43P:[^\r\n]*\b(PROHIBITED|NOT\s+ALLOWED)\b/i.test(lc.rawText || '');

    if (isProhibited) {
      let isDiscrepancy = false;
      let reason = '';
      let foundVal = '';
      let expVal = '';

      // Check transport documents for different vessels or on-board dates
      const transportDocs = documents.filter((d) => d.type === 'BILL_OF_LADING');
      if (transportDocs.length > 1) {
        const vessels = new Set(transportDocs.map((d) => d.extractedFields?.vessel_and_voyage?.value).filter(Boolean));
        const onBoardDates = new Set(transportDocs.map((d) => d.extractedFields?.shipped_on_board_date?.value).filter(Boolean));
        if (vessels.size > 1 || onBoardDates.size > 1) {
          isDiscrepancy = true;
          reason = 'Multiple transport documents presented showing different vessels or different on-board dates while partial shipment is prohibited.';
          foundVal = `Vessels: ${Array.from(vessels).join(', ')}; Dates: ${Array.from(onBoardDates).join(', ')}`;
          expVal = 'Single transport document or identical vessel and on-board dates';
        }
      }

      // Check shipped quantity against LC Field 45A quantity
      const lcDesc = (lc.descriptionOfGoods || lc.extractedFields?.goods_description?.value || lc.rawText || '').toLowerCase();
      const invContent = (invDoc?.extractedFields?.goods_description?.value || invDoc?.rawText || '').toLowerCase();

      const lcQtyMatch = lcDesc.match(/(\d[\d,]*)\s*(?:bags|pieces|pcs|sets|cartons|bales|units|kg|mt)/i);
      const invQtyMatch = invContent.match(/(\d[\d,]*)\s*(?:bags|pieces|pcs|sets|cartons|bales|units|kg|mt)/i);

      if (lcQtyMatch && invQtyMatch) {
        const lcQtyNum = parseInt(lcQtyMatch[1].replace(/,/g, ''), 10);
        const invQtyNum = parseInt(invQtyMatch[1].replace(/,/g, ''), 10);

        // Tolerance from Field 39A/B or "about" in 45A
        let allowedNegativeTolerance = 0.0;
        if (/about|approx/i.test(lcDesc)) {
          allowedNegativeTolerance = 0.10;
        } else if (lc.extractedFields?.quantity_tolerance?.value) {
          const tolStr = String(lc.extractedFields.quantity_tolerance.value);
          const tolMatch = tolStr.match(/(\d+)/);
          if (tolMatch) allowedNegativeTolerance = parseFloat(tolMatch[1]) / 100.0;
        }

        const minPermissibleQty = Math.floor(lcQtyNum * (1.0 - allowedNegativeTolerance));
        if (lcQtyNum > 0 && invQtyNum > 0 && invQtyNum < minPermissibleQty) {
          isDiscrepancy = true;
          reason = `Partial Shipment Prohibited: LC Field 43P / 47A strictly prohibits partial shipment. Documents indicate partial consignment of ${invQtyNum.toLocaleString()} units against ${lcQtyNum.toLocaleString()} units required in LC Field 45A.`;
          foundVal = `Partial shipment: ${invQtyNum.toLocaleString()} units`;
          expVal = `Full consignment: ${lcQtyNum.toLocaleString()} units (tolerance ${allowedNegativeTolerance * 100}%)`;
        }
      }

      results.push({
        id: 'rule-partial-shipment-art31',
        title: 'Partial Shipment Compliance (Field 43P / 47A)',
        status: isDiscrepancy ? 'DISCREPANCY' : 'PASS',
        documents_involved: ['Commercial Invoice', 'Bill of Lading', 'Letter of Credit'],
        fields_used: ['lc.partial_shipment', 'lc.additional_conditions', 'invoice.goods_description', 'bl.vessel_and_voyage'],
        explanation: isDiscrepancy
          ? reason
          : 'Compliant: Full consignment quantity shipped in compliance with Field 43P / 47A and UCP 600 Article 31.',
        ucp_article: 'UCP 600 Article 31',
        source: 'Rule',
        severity: isDiscrepancy ? 'CRITICAL' : undefined,
        expectedValue: expVal || 'Full consignment shipped on a single vessel/voyage',
        foundValue: foundVal || 'Full shipment conforming to credit',
        remediation: isDiscrepancy ? 'Ship full credit quantity in a single presentation or obtain SWIFT MT707 amendment allowing partial shipments.' : undefined,
      });
    }
  }

  // -------------------------------------------------------------
  // RULE 13: What 46A says each document must show (freight, consignee, signature, HS code,
  // insurance clauses / currency / claims place / issuer, certificate-of-origin issuer).
  // Each check runs only when 46A actually states the requirement and the document was read.
  // -------------------------------------------------------------
  {
    const reqList: string[] = Array.isArray(lc.requiredDocuments) && lc.requiredDocuments.length
      ? lc.requiredDocuments
      : splitSwiftList(
          String(
            (typeof lc.requiredDocuments === 'string' && lc.requiredDocuments) ||
              lc.extractedFields?.required_documents?.value ||
              ''
          ).split(/\n/)
        );
    const clauseFor = (re: RegExp) => reqList.find((d) => re.test(d))?.replace(/\s+/g, ' ').trim() || '';
    const docText = (d?: { rawText?: string; extractedFields?: Record<string, any> }) => {
      if (!d) return '';
      const raw = d.rawText && !/^\[(PDF|Image|Uploaded image)/i.test(d.rawText.trim()) ? d.rawText : '';
      const vals = Object.values(d.extractedFields || {}).map((f: any) => (f && f.value !== null && f.value !== undefined ? String(f.value) : '')).join('\n');
      return `${raw}\n${vals}`;
    };
    const readable = (d?: { rawText?: string; extractedFields?: Record<string, any> }) => docText(d).replace(/\s+/g, '').length > 40;
    const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
    const push = (r: Omit<RuleResult, 'source' | 'status'> & { ok: boolean }) => {
      const { ok, ...rest } = r;
      results.push({
        ...rest,
        status: ok ? 'PASS' : 'DISCREPANCY',
        source: 'Rule',
        severity: ok ? undefined : rest.severity || 'MAJOR',
        remediation: ok ? undefined : rest.remediation,
      } as RuleResult);
    };

    // 13a. B/L freight marking
    const blClause = clauseFor(/bills?\s+of\s+lading|\bb\/l\b|transport\s+document/i);
    const blDocs = documents.filter((d) => d.type === 'BILL_OF_LADING' && readable(d));
    for (const b of blDocs) {
      const t = docText(b).toUpperCase();
      if (/FREIGHT\s+PREPAID/i.test(blClause) || /FREIGHT\s+COLLECT/i.test(blClause)) {
        const wanted = /FREIGHT\s+PREPAID/i.test(blClause) ? 'FREIGHT PREPAID' : 'FREIGHT COLLECT';
        const other = wanted === 'FREIGHT PREPAID' ? /FREIGHT\s+(COLLECT|PAYABLE\s+AT\s+DESTINATION|TO\s+COLLECT)/ : /FREIGHT\s+PREPAID/;
        const found = t.match(other)?.[0];
        if (found || new RegExp(wanted.replace(' ', '\\s+')).test(t)) {
          push({
            id: `rule-bl-freight-${b.id}`,
            target_document_id: b.id,
            title: `Freight Marking on ${b.title}`,
            documents_involved: [b.title, 'Letter of Credit (46A)'],
            fields_used: ['bl.freight_clause', 'lc.required_documents'],
            ok: !found,
            explanation: found
              ? `The bill of lading is marked "${found}", but 46A requires it to be marked ${wanted}.`
              : `Compliant: the bill of lading is marked ${wanted} as 46A requires.`,
            ucp_article: 'UCP 600 Article 14(d) / LC 46A',
            expectedValue: wanted,
            foundValue: found || wanted,
            remediation: `Ask the carrier to re-issue the bill of lading marked ${wanted}.`,
          });
        }
      }

      // 13b. Consignee "to the order of <bank>"
      const orderOf = blClause.match(/TO\s+(?:THE\s+)?ORDER\s+OF\s+([A-Z0-9 .&,'-]+?)(?:,?\s+(?:MARKED|NOTIFY|FREIGHT|SHOWING|INDICATING)\b|\.|$)/i)?.[1]?.trim();
      const consignee = String(b.extractedFields?.consignee?.value || '').trim();
      if (orderOf && consignee) {
        const key = norm(orderOf).split(' ').filter((w) => w.length > 2 && !['THE', 'BANK', 'PJSC', 'LTD', 'PLC', 'AND'].includes(w)).slice(0, 2);
        const c = norm(consignee);
        const ok = /ORDER/.test(c) && key.every((w) => c.includes(w));
        push({
          id: `rule-bl-consignee-${b.id}`,
          target_document_id: b.id,
          title: `Consignee on ${b.title}`,
          documents_involved: [b.title, 'Letter of Credit (46A)'],
          fields_used: ['bl.consignee', 'lc.required_documents'],
          ok,
          explanation: ok
            ? `Compliant: consigned to the order of ${orderOf} as 46A requires.`
            : `The bill of lading is consigned "${consignee}", but 46A requires it to be made out to the order of ${orderOf}.`,
          ucp_article: 'UCP 600 Article 14(d) / LC 46A',
          expectedValue: `To the order of ${orderOf}`,
          foundValue: consignee,
          remediation: `Ask the carrier to re-issue the bill of lading consigned "to the order of ${orderOf}".`,
        });
      }
    }

    // 13c/13d. Invoice: signed, and HS code shown when 46A asks for it
    const invClause = clauseFor(/invoice/i);
    if (invDoc && readable(invDoc)) {
      const t = docText(invDoc);
      if (/\bSIGNED\b/i.test(invClause)) {
        const ok = /signator|signed|signature|\/s\/|\[signed/i.test(t);
        push({
          id: 'rule-invoice-signed',
          target_document_id: invDoc.id,
          title: 'Commercial Invoice Signed',
          documents_involved: [invDoc.title, 'Letter of Credit (46A)'],
          fields_used: ['invoice.signature', 'lc.required_documents'],
          ok,
          explanation: ok
            ? 'Compliant: the invoice shows a signature, as 46A asks for a signed commercial invoice.'
            : '46A asks for a SIGNED commercial invoice, but no signature or signatory is shown on the invoice.',
          ucp_article: 'UCP 600 Article 18(a)(iv) / LC 46A',
          expectedValue: 'Signed commercial invoice',
          foundValue: ok ? 'Signed' : 'No signature found',
          remediation: 'Sign the commercial invoice (authorised signatory) and present the signed original.',
        });
      }
      const hs = invClause.match(/HS\s*CODE\s*(?:NO\.?\s*)?([0-9]{4}(?:\.?[0-9]{2,4})?)/i)?.[1];
      if (hs) {
        const digits = hs.replace(/\D/g, '');
        const ok = t.replace(/\D/g, ' ').split(/\s+/).join(' ').includes(digits.slice(0, 4)) && new RegExp(hs.replace('.', '\\.?')).test(t);
        push({
          id: 'rule-invoice-hs-code',
          target_document_id: invDoc.id,
          title: 'HS Code Shown on Commercial Invoice',
          documents_involved: [invDoc.title, 'Letter of Credit (46A)'],
          fields_used: ['invoice.hs_code', 'lc.required_documents'],
          ok,
          explanation: ok
            ? `Compliant: the invoice shows HS code ${hs} as 46A requires.`
            : `46A requires the invoice to indicate HS code ${hs}, but it is not shown on the invoice.`,
          ucp_article: 'UCP 600 Article 14(a) / LC 46A',
          expectedValue: `HS code ${hs}`,
          foundValue: ok ? `HS code ${hs}` : 'HS code not shown',
          remediation: `Re-issue the invoice showing HS code ${hs}.`,
        });
      }
      // Document title (upper case in the first lines): "PROFORMA INVOICE" instead of "COMMERCIAL INVOICE"
      const head = t.split(/\n/).map((l) => l.trim()).filter(Boolean).slice(0, 8).join('\n');
      if (/PRO[\s-]?FORMA\s+INVOICE/.test(head) && !/COMMERCIAL\s+INVOICE/.test(head)) {
        push({
          id: 'rule-invoice-not-proforma',
          target_document_id: invDoc.id,
          title: 'Invoice Presented Is a Pro-forma',
          documents_involved: [invDoc.title, 'Letter of Credit (46A)'],
          fields_used: ['invoice.title', 'lc.required_documents'],
          ok: false,
          explanation: 'The document is titled "PROFORMA INVOICE". A pro-forma invoice does not meet a requirement for a commercial invoice.',
          ucp_article: 'UCP 600 Article 18 / ISBP 821',
          expectedValue: 'Commercial invoice',
          foundValue: 'Pro-forma invoice',
          remediation: 'Issue and present a commercial invoice (not a pro-forma).',
          severity: 'CRITICAL',
        });
      }
    }

    // 13e. Insurance: document type, currency, clauses, claims place
    const insClause = clauseFor(/insurance/i);
    if (insDoc && readable(insDoc)) {
      const t = docText(insDoc).toUpperCase();
      if (/COVER\s+NOTE/.test(t)) {
        push({
          id: 'rule-insurance-cover-note',
          target_document_id: insDoc.id,
          title: 'Insurance Cover Note Presented',
          documents_involved: [insDoc.title],
          fields_used: ['insurance.document_type'],
          ok: false,
          explanation: 'The insurance document is a cover note. Cover notes are not accepted; the document must be an insurance policy or certificate issued by an insurer or its agent.',
          ucp_article: 'UCP 600 Article 28(a) & 28(c)',
          expectedValue: 'Insurance policy or certificate from the insurer',
          foundValue: 'Cover note',
          remediation: 'Obtain an insurance policy or certificate issued and signed by the insurance company or its agent.',
          severity: 'CRITICAL',
        });
      }
      const insCur = String(insDoc.extractedFields?.currency?.value || '').toUpperCase();
      if (/^[A-Z]{3}$/.test(insCur) && lcCurrency && insCur !== lcCurrency) {
        push({
          id: 'rule-insurance-currency',
          target_document_id: insDoc.id,
          title: 'Insurance Currency vs Credit Currency',
          documents_involved: [insDoc.title, 'Letter of Credit (32B)'],
          fields_used: ['insurance.currency', 'lc.currency'],
          ok: false,
          explanation: `The amount insured is in ${insCur}; it must be in the currency of the credit (${lcCurrency}).`,
          ucp_article: 'UCP 600 Article 28(f)(i)',
          expectedValue: lcCurrency,
          foundValue: insCur,
          remediation: `Re-issue the insurance document with the amount insured in ${lcCurrency}.`,
        });
      }
      const reqCl = insClause.match(/CARGO\s+CLAUSES\s*\(([ABC])\)/i)?.[1]?.toUpperCase();
      if (reqCl) {
        const shown = Array.from(t.matchAll(/CARGO\s+CLAUSES\s*\(([ABC])\)/g)).map((m) => m[1]);
        if (shown.length) {
          const ok = shown.includes(reqCl);
          push({
            id: 'rule-insurance-clauses',
            target_document_id: insDoc.id,
            title: 'Insurance Risks Covered (Institute Cargo Clauses)',
            documents_involved: [insDoc.title, 'Letter of Credit (46A)'],
            fields_used: ['insurance.clauses_and_risks', 'lc.required_documents'],
            ok,
            explanation: ok
              ? `Compliant: covers Institute Cargo Clauses (${reqCl}) as 46A requires.`
              : `The insurance covers Institute Cargo Clauses (${shown[0]}), but 46A requires Institute Cargo Clauses (${reqCl}).`,
            ucp_article: 'UCP 600 Article 28(g) / LC 46A',
            expectedValue: `Institute Cargo Clauses (${reqCl})`,
            foundValue: `Institute Cargo Clauses (${shown[0]})`,
            remediation: `Extend the cover to Institute Cargo Clauses (${reqCl}) and re-issue the insurance document.`,
          });
        }
      }
      const reqPlace = insClause.match(/CLAIMS\s+PAYABLE\s+(?:IN|AT)\s+([A-Z][A-Z .'-]+?)(?:\s+IN\s+THE\s+CURRENCY|\s+IN\s+[A-Z]{3}\b|,|\.|$)/i)?.[1]?.trim();
      const shownPlace = t.match(/CLAIMS\s+(?:ARE\s+)?PAYABLE\s+(?:IN|AT)\s+([A-Z][A-Z .'-]+?)(?:,|\s+IN\s+|\.|\n|$)/)?.[1]?.trim();
      if (reqPlace && shownPlace) {
        const ok = norm(shownPlace).includes(norm(reqPlace).split(' ')[0]);
        push({
          id: 'rule-insurance-claims-place',
          target_document_id: insDoc.id,
          title: 'Insurance Claims Payable Place',
          documents_involved: [insDoc.title, 'Letter of Credit (46A)'],
          fields_used: ['insurance.claims_payable_at', 'lc.required_documents'],
          ok,
          explanation: ok
            ? `Compliant: claims payable in ${shownPlace} as 46A requires.`
            : `Claims are payable in ${shownPlace}, but 46A requires claims payable in ${reqPlace}.`,
          ucp_article: 'LC 46A / UCP 600 Article 14(d)',
          expectedValue: `Claims payable in ${reqPlace}`,
          foundValue: `Claims payable in ${shownPlace}`,
          remediation: `Ask the insurer to show claims payable in ${reqPlace}.`,
        });
      }
    }

    // 13f. Certificate of origin issuer
    const cooClause = clauseFor(/certificate\s+of\s+origin/i);
    if (cooDoc && readable(cooDoc) && /CHAMBER\s+OF\s+COMMERCE|CHAMBER/i.test(cooClause)) {
      const t = docText(cooDoc);
      const ok = /chamber/i.test(t);
      push({
        id: 'rule-coo-issuer',
        target_document_id: cooDoc.id,
        title: 'Certificate of Origin Issuer',
        documents_involved: [cooDoc.title, 'Letter of Credit (46A)'],
        fields_used: ['coo.issuing_authority', 'lc.required_documents'],
        ok,
        explanation: ok
          ? 'Compliant: the certificate of origin is issued by a chamber of commerce as 46A requires.'
          : '46A requires a certificate of origin issued by a chamber of commerce, but this certificate does not show a chamber of commerce as issuer (it appears to be issued by the exporter).',
        ucp_article: 'UCP 600 Article 14(l) / LC 46A',
        expectedValue: 'Issued by a chamber of commerce',
        foundValue: String(cooDoc.extractedFields?.issuing_authority?.value || 'No chamber of commerce shown'),
        remediation: 'Have the certificate of origin issued and certified by the chamber of commerce.',
      });
    }
  }

  // A missing document is reported once by the required-documents rule; rules that could not run
  // because that document is absent are shown as "not checked" instead of extra discrepancies.
  for (const r of results) {
    if (
      r.status === 'DISCREPANCY' &&
      !r.id.startsWith('rule-required-document') &&
      typeof r.foundValue === 'string' &&
      /^No (?:Bill of Lading|Commercial Invoice|invoice|insurance document)\b.*presented|^No insurance document in presentation set/i.test(r.foundValue)
    ) {
      r.status = 'NOT_APPLICABLE';
      r.explanation = `Not checked: ${r.foundValue.replace(/^No /, '').replace(/ presented.*$/, '')} not presented (reported under required documents).`;
      r.severity = undefined;
      r.remediation = undefined;
    }
  }

  return results;
}
