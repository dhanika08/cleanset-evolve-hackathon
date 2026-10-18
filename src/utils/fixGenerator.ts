import type { 
  Finding, 
  RemediationStep, 
  LCDocumentData, 
  DiscrepancyFix, 
  FixType, 
  FinalSummaryCard,
  DocumentType 
} from '../types/compliance.ts';

/**
 * Checks whether a discrepancy can honestly be corrected by re-issuing an internal document,
 * or whether it represents a fixed physical reality (like actual vessel sailing date)
 * that cannot honestly be altered and requires an LC amendment.
 */
export function determineFixType(finding: {
  title?: string;
  description?: string;
  ruleCitation?: string;
  targetDoc?: string;
}): { fixType: FixType; canBeHonestlyCorrected: boolean; reason: string } {
  const text = `${finding.title || ''} ${finding.description || ''} ${finding.ruleCitation || ''} ${finding.targetDoc || ''}`.toLowerCase();

  // Physical reality indicators that CANNOT honestly change without falsifying documents:
  // 1. Late shipment (ship sailed on a specific date)
  // 2. Stale presentation (>21 days from actual B/L date)
  // 3. LC Expired before presentation
  // 4. Actual vessel port routing or call changes that physically took place
  // 5. Total quantity/amount shipped fundamentally exceeding credit without tolerance
  const isLateShipment = text.includes('late shipment') || 
    text.includes('exceeds latest shipment') || 
    text.includes('after latest shipment') ||
    text.includes('field 44c');
  
  const isStalePresentation = text.includes('stale presentation') || 
    text.includes('21 days') || 
    text.includes('period for presentation');
  
  const isLcExpired = text.includes('lc expired') || 
    text.includes('expiry date') || 
    text.includes('field 31d') ||
    text.includes('expired credit');

  const isPhysicalVoyageMismatch = (text.includes('port of loading') || text.includes('port of discharge')) &&
    (text.includes('actual') || text.includes('sailed') || text.includes('vessel routing'));

  if (isLateShipment) {
    return {
      fixType: 'LC_AMENDMENT_REQUEST',
      canBeHonestlyCorrected: false,
      reason: 'Physical maritime reality: The vessel departed and was laden on board on a fixed calendar date. Carrier transport documents cannot legally or ethically be backdated (UCP 600 Art 20 / maritime anti-fraud standards). An LC amendment extending Field 44C is mandatory.',
    };
  }

  if (isStalePresentation) {
    return {
      fixType: 'LC_AMENDMENT_REQUEST',
      canBeHonestlyCorrected: false,
      reason: 'Fixed time constraint: More than 21 calendar days have elapsed since the verified shipped-on-board date. Transport document date cannot be altered; the buyer must request an amendment extending Field 48 / presentation period.',
    };
  }

  if (isLcExpired) {
    return {
      fixType: 'LC_AMENDMENT_REQUEST',
      canBeHonestlyCorrected: false,
      reason: 'Credit validity expired: Presentation occurs after the expiry date stipulated in Field 31D. Requires an official SWIFT MT707 amendment from the issuing bank extending the LC validity.',
    };
  }

  const isPartialShipment = text.includes('partial shipment');
  const isPortMismatch = text.includes('port mismatch') || text.includes('does not match lc field 44');
  if (isPartialShipment) {
    return {
      fixType: 'LC_AMENDMENT_REQUEST',
      canBeHonestlyCorrected: false,
      reason: 'The goods were shipped in more than one lot (or short-shipped). Documents cannot honestly show a single complete shipment, so the buyer must amend Field 43P to allow partial shipments or agree to accept the documents.',
    };
  }
  if (isPortMismatch) {
    return {
      fixType: 'LC_AMENDMENT_REQUEST',
      canBeHonestlyCorrected: false,
      reason: 'The bill of lading reflects the port the goods actually left from. It cannot honestly be changed, so the buyer must amend Field 44E / 44F or agree to accept the documents.',
    };
  }
  if (isPhysicalVoyageMismatch) {
    return {
      fixType: 'LC_AMENDMENT_REQUEST',
      canBeHonestlyCorrected: false,
      reason: 'Actual vessel call mismatch: The ship called at an alternate port. Transport document reflects true physical voyage; buyer must amend Field 44E / 44F in the credit.',
    };
  }

  // All other discrepancies are typographical, calculation, or omission issues in documents
  // that CAN honestly be corrected and re-issued by the beneficiary or issuer:
  // - Typo in goods description, proforma invoice citation
  // - Missing certification statement (e.g. Oeko-Tex, origin, non-wooden packing)
  // - Gross/Net weight mismatch between internal Packing List and B/L
  // - Invoice mathematical error (unit price * qty)
  // - Insurance policy wording / cover attachment endorsement
  // - Consignee / Applicant name spelling typo on invoice
  return {
    fixType: 'CORRECTED_TEXT',
    canBeHonestlyCorrected: true,
    reason: 'Internal document error or omission: This document is prepared by the exporter or service provider. The typo, calculation, or missing clause can honestly be corrected and the document re-issued prior to bank submission.',
  };
}

/**
 * Generates an export-ready, pristine "Corrected text" block or "LC amendment request" email
 * for any discrepancy finding.
 */
export function generateDiscrepancyFix(
  finding: Finding,
  lc: Partial<LCDocumentData>,
  docName?: string
): DiscrepancyFix {
  const targetDocument = docName || finding.documents_involved?.[0] || 'Presented Document';
  const { fixType, canBeHonestlyCorrected, reason } = determineFixType({
    title: finding.title,
    description: finding.description,
    ruleCitation: finding.ruleCitation,
    targetDoc: targetDocument,
  });

  const lcNum = lc.lcNumber || 'LC-UNSPECIFIED';
  const buyerName = lc.applicant || 'The Buyer / Applicant';
  const sellerName = lc.beneficiary || 'The Beneficiary / Exporter';
  const issuingBank = lc.issuingBank || 'Issuing Bank';
  const amountStr = `${lc.currency || 'USD'} ${Number(lc.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  if (fixType === 'LC_AMENDMENT_REQUEST') {
    // Generate an LC amendment request email to the buyer
    const isLateShipment = /late shipment|after lc latest shipment|exceeds latest shipment/i.test(`${finding.title} ${finding.description}`);
    
    const lowerAll = `${finding.title} ${finding.description}`.toLowerCase();
    const subject = isLateShipment
      ? `URGENT: Request for LC Amendment (MT707) - LC #${lcNum} - Extension of Latest Shipment Date`
      : lowerAll.includes('partial shipment')
      ? `URGENT: Request for LC Amendment (MT707) - LC #${lcNum} - Allow Partial Shipments`
      : lowerAll.includes('port')
      ? `URGENT: Request for LC Amendment (MT707) - LC #${lcNum} - Port of Loading / Discharge`
      : `URGENT: Request for LC Amendment (MT707) - LC #${lcNum} - Presentation Terms Amendment`;

    const proposedShipmentDate = finding.foundValue || lc.latestShipmentDate || 'Actual on-board date';
    const proposedExpiryDate = lc.expiryDate || 'Extended expiry date';
    const ft = `${finding.title} ${finding.description}`.toLowerCase();
    const clauses: string[] = [];
    if (ft.includes('partial shipment')) clauses.push('Field 43P (Partial Shipments): Amend to read "ALLOWED".');
    else if (ft.includes('port')) clauses.push(`Field 44E / 44F (Ports): Amend to the ports shown on the bill of lading (${finding.foundValue || 'as shipped'}).`);
    else if (ft.includes('present') && !ft.includes('expir')) clauses.push(`Field 48 (Period for Presentation): Extend to cover the actual presentation date; Field 31D extended if needed (currently ${proposedExpiryDate}).`);
    else if (ft.includes('expir')) clauses.push(`Field 31D (Date and Place of Expiry): Extend beyond the presentation date (currently ${proposedExpiryDate}).`);
    else {
      clauses.push(`Field 44C (Latest Date of Shipment): Amend to cover the actual on-board date (${proposedShipmentDate}).`);
      clauses.push(`Field 31D (Date and Place of Expiry): Extend accordingly (currently ${proposedExpiryDate}).`);
    }
    clauses.push(`All other terms and conditions of LC #${lcNum} remain unchanged.`);
    const amendmentClauses = clauses.map((c, i) => `${i + 1}. ${c}`).join('\n');

    const emailBody = `Dear Trade Finance Team / Import Dept at ${buyerName},

RE: URGENT AMENDMENT REQUEST (SWIFT MT707) FOR LETTER OF CREDIT NO. ${lcNum}

We are currently preparing the document presentation for our consignment under LC #${lcNum} (Value: ${amountStr}).

During our internal compliance pre-audit under UCP 600 standards, an unavoidable discrepancy was identified that cannot be modified at document level:

DISCREPANCY DETAILS:
- Issue: ${finding.title}
- Rule: ${finding.ruleCitation}
- Observed Fact: ${finding.foundValue || 'Vessel on-board date exceeds credit limit'}
- Required Terms: ${finding.expectedValue || 'On or before latest date in credit'}
- Reason for Amendment: ${reason}

To ensure smooth presentation and prevent payment refusal (MT734), we kindly request that you immediately instruct your issuing bank (${issuingBank}) to transmit a SWIFT MT707 amendment with the following terms:

REQUESTED MT707 AMENDMENT CLAUSES:
--------------------------------------------------
1. Field 44C (Latest Date of Shipment):
   Amend to read: "${proposedShipmentDate}" (or later)

2. Field 31D (Date and Place of Expiry):
   Amend to read: "${proposedExpiryDate}" at counters of negotiating bank

3. All other terms and conditions of LC #${lcNum} remain unchanged.
--------------------------------------------------

Please confirm receipt and provide us with the copy of the MT707 amendment swift transmission at your earliest convenience so we may finalize our bank presentation.

Thank you for your prompt cooperation and continued partnership.

Sincerely,
Trade Finance & Export Operations Department
${sellerName}`;

    return {
      id: `fix-${finding.id || Math.random().toString(36).slice(2, 8)}`,
      findingId: finding.id,
      targetDoc: targetDocument,
      discrepancyTitle: finding.title,
      fixType: 'LC_AMENDMENT_REQUEST',
      fixTypeLabel: 'LC amendment request',
      canBeHonestlyCorrected: false,
      reason,
      copyableContent: `Subject: ${subject}\n\n${emailBody}`,
      emailSubject: subject,
      emailBody,
      emailRecipient: `${buyerName} (c/o ${issuingBank})`,
      actionSummary: `Send MT707 amendment request email to buyer (${buyerName}) to extend credit dates.`,
    };
  }

  // Otherwise: fixType === 'CORRECTED_TEXT' (re-issuable internal document)
  let correctedSnippet = '';
  let actionSummary = '';
  const textLower = `${finding.title} ${finding.description}`.toLowerCase();

  if (textLower.includes('goods description') || textLower.includes('18(c)')) {
    actionSummary = `Re-issue ${targetDocument} with verbatim goods description matching LC Field 45A.`;
    correctedSnippet = `${targetDocument.toUpperCase()} — DESCRIPTION OF GOODS (RE-ISSUE):
--------------------------------------------------
${lc.descriptionOfGoods || finding.expectedValue || 'Full goods description strictly corresponding with LC Field 45A'}
--------------------------------------------------`;
  } else if (textLower.includes('certification') || textLower.includes('47a')) {
    actionSummary = `Add mandatory Field 47A certification clause onto ${targetDocument}.`;
    correctedSnippet = `SPECIAL CERTIFICATION CLAUSE (FOR RE-ISSUE ON ${targetDocument.toUpperCase()}):
--------------------------------------------------
"${finding.expectedValue || finding.remediation || 'Mandatory certification per LC Field 47A'}"

FOR AND ON BEHALF OF:
${sellerName}
[AUTHORIZED SIGNATURE & STAMP]
--------------------------------------------------`;
  } else if (textLower.includes('weight') || textLower.includes('gross weight')) {
    actionSummary = `Re-issue ${targetDocument} to align Gross Weight to ${finding.expectedValue || 'Bill of Lading VGM'}.`;
    correctedSnippet = `${targetDocument.toUpperCase()} — WEIGHT SPECIFICATION (RE-ISSUE):
--------------------------------------------------
GROSS WEIGHT: ${finding.expectedValue || finding.remediation || 'Aligned gross weight'}
(Conforms without conflict per UCP 600 Art 14(d))
--------------------------------------------------`;
  } else if (textLower.includes('insurance') || textLower.includes('28(e)')) {
    actionSummary = 'Obtain Underwriter Endorsement confirming cover attachment on or prior to shipment date.';
    correctedSnippet = `INSURANCE POLICY COVER ATTACHMENT ENDORSEMENT
--------------------------------------------------
LC NUMBER: ${lcNum}
"IT IS HEREBY CERTIFIED AND ENDORSED THAT COVERAGE UNDER THIS POLICY ATTACHED ON OR PRIOR TO THE ACTUAL SHIPPED ON BOARD DATE."
AUTHORIZED SIGNATURE FOR THE UNDERWRITERS
--------------------------------------------------`;
  } else {
    actionSummary = `Correct ${finding.foundValue || 'discrepant wording'} in ${targetDocument} to ${finding.expectedValue || 'LC compliant standard'}.`;
    correctedSnippet = `CORRECTED CLAUSE FOR RE-ISSUE IN ${targetDocument.toUpperCase()}:
--------------------------------------------------
AS PER LC NO. ${lcNum} / ${finding.ruleCitation}:
REQUIRED COMPLIANT TEXT:
"${finding.expectedValue || finding.remediation || 'Compliant condition'}"
--------------------------------------------------`;
  }

  return {
    id: `fix-${finding.id || Math.random().toString(36).slice(2, 8)}`,
    findingId: finding.id,
    targetDoc: targetDocument,
    discrepancyTitle: finding.title,
    fixType: 'CORRECTED_TEXT',
    fixTypeLabel: 'Corrected text',
    canBeHonestlyCorrected: true,
    reason,
    copyableContent: correctedSnippet,
    correctedSnippet,
    actionSummary,
  };
}

/**
 * Builds the comprehensive Final Summary Card containing:
 * - Discrepancies caught
 * - Time taken
 * - Estimated bank refusal avoided
 */
export function buildFinalSummaryCard(params: {
  discrepanciesCount: number;
  durationMs: number;
  lcAmount?: number | string;
  lcCurrency?: string;
  lcAdditionalConditions?: string[] | string;
  reissuableCount?: number;
  amendmentCount?: number;
}): FinalSummaryCard {
  const { discrepanciesCount, durationMs, lcAmount, lcCurrency = 'USD', lcAdditionalConditions } = params;
  
  const numAmount = typeof lcAmount === 'string' 
    ? parseFloat(lcAmount.replace(/[^0-9.]/g, '')) 
    : (typeof lcAmount === 'number' && !isNaN(lcAmount) ? lcAmount : 0);

  const formattedVal = numAmount > 0 
    ? `${lcCurrency} ${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `${lcCurrency} 0.00`;

  const durationSec = (durationMs / 1000).toFixed(1);

  // Check if Field 47A states a discrepancy fee
  let feeStr = discrepanciesCount > 0 ? 'None stipulated in LC' : `${lcCurrency} 0.00`;
  if (lcAdditionalConditions && discrepanciesCount > 0) {
    const text47A = Array.isArray(lcAdditionalConditions) ? lcAdditionalConditions.join('\n') : String(lcAdditionalConditions);
    const feeMatch = text47A.match(/(?:discrepan(?:cy|t)\s*(?:fee|charge|deduction)|fee\s*of)\s*(?:of\s*)?([A-Z]{3}|[$€£¥])?\s*([0-9,]+(?:\.[0-9]{2})?)/i) ||
                     text47A.match(/([A-Z]{3}|[$€£¥])\s*([0-9,]+(?:\.[0-9]{2})?)\s*(?:will\s*be\s*deducted|per\s*discrepan)/i);
    if (feeMatch) {
      const cur = feeMatch[1] || lcCurrency;
      const val = feeMatch[2];
      feeStr = `${cur} ${val}`;
    }
  }

  return {
    discrepanciesCaught: discrepanciesCount,
    timeTakenMs: durationMs,
    timeTakenFormatted: `${durationSec}s`,
    estimatedBankRefusalAvoided: discrepanciesCount > 0 
      ? `${formattedVal} Presentation Protected from Bank Refusal (MT734)`
      : `${formattedVal} 100% Clean Presentation — Immediate Honor`,
    discrepancyFeeSaved: feeStr,
    delayPreventedDays: discrepanciesCount > 0 ? 'Fix before presenting to avoid a refusal and payment delay' : 'None',
    reissuableFixesCount: params.reissuableCount ?? 0,
    amendmentRequestsCount: params.amendmentCount ?? 0,
  };
}
