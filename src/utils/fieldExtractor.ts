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


export const FIELD_DEFINITIONS: Record<DocumentType, { key: string; label: string; placeholder?: string }[]> = {
  LETTER_OF_CREDIT: [
    { key: 'lc_number', label: 'LC Number (Field 20)' },
    { key: 'expiry_date', label: 'Expiry Date (Field 31D)' },
    { key: 'latest_shipment_date', label: 'Latest Shipment Date (Field 44C)' },
    { key: 'amount', label: 'Amount (Field 32B)' },
    { key: 'currency', label: 'Currency (Field 32B)' },
    { key: 'port_of_loading', label: 'Port of Loading (Field 44E)' },
    { key: 'port_of_discharge', label: 'Port of Discharge (Field 44F)' },
    { key: 'goods_description', label: 'Goods Description (Field 45A)' },
    { key: 'presentation_period', label: 'Presentation Period (Field 48)' },
    { key: 'partial_shipments_allowed', label: 'Partial Shipments Allowed (Field 43P)' },
    { key: 'transshipment_allowed', label: 'Transshipment Allowed (Field 43T)' },
    { key: 'quantity_tolerance', label: 'Quantity Tolerance (Field 39A/B)' },
    { key: 'required_documents', label: 'Required Documents (Field 46A)' },
    { key: 'insurance_percentage_required', label: 'Insurance % Required (Field 46A/47A)' },
    { key: 'applicant', label: 'Applicant / Buyer (Field 50)' },
    { key: 'beneficiary', label: 'Beneficiary / Exporter (Field 59)' },
    { key: 'issuing_bank', label: 'Issuing Bank' },
    { key: 'issue_date', label: 'Date of Issue (Field 31C)' },
    { key: 'expiry_place', label: 'Place of Expiry (Field 31D)' },
    { key: 'additional_conditions', label: 'Additional Conditions (Field 47A)' },
  ],
  COMMERCIAL_INVOICE: [
    { key: 'invoice_number', label: 'Invoice Number' },
    { key: 'invoice_date', label: 'Invoice Date' },
    { key: 'lc_reference', label: 'LC Reference Number' },
    { key: 'applicant_buyer', label: 'Buyer / Consignee' },
    { key: 'beneficiary_seller', label: 'Seller / Beneficiary' },
    { key: 'goods_description', label: 'Goods Description' },
    { key: 'currency', label: 'Currency' },
    { key: 'total_amount', label: 'Total Invoice Amount' },
    { key: 'unit_price', label: 'Unit Price' },
    { key: 'gross_weight', label: 'Gross Weight' },
    { key: 'net_weight', label: 'Net Weight' },
    { key: 'port_of_loading', label: 'Port of Loading' },
    { key: 'port_of_discharge', label: 'Port of Discharge' },
    { key: 'incoterm', label: 'Incoterm (e.g. CIF, FOB)' },
    { key: 'container_numbers', label: 'Container Numbers' },
    { key: 'clauses_and_certifications', label: 'Special Clauses & Certifications' },
  ],
  BILL_OF_LADING: [
    { key: 'bl_number', label: 'B/L Number' },
    { key: 'shipped_on_board_date', label: 'Shipped On Board Date' },
    { key: 'issue_date', label: 'B/L Issue Date' },
    { key: 'carrier_name', label: 'Carrier / Shipping Line' },
    { key: 'shipper', label: 'Shipper' },
    { key: 'consignee', label: 'Consignee / Endorsement' },
    { key: 'notify_party', label: 'Notify Party' },
    { key: 'vessel_and_voyage', label: 'Vessel & Voyage Number' },
    { key: 'port_of_loading', label: 'Port of Loading' },
    { key: 'port_of_discharge', label: 'Port of Discharge' },
    { key: 'goods_description', label: 'Goods Description / Said to Contain' },
    { key: 'gross_weight', label: 'Gross Weight' },
    { key: 'measurement_volume', label: 'Measurement / Volume' },
    { key: 'container_numbers', label: 'Container Numbers' },
    { key: 'seal_numbers', label: 'Seal Numbers' },
    { key: 'freight_clause', label: 'Freight Status (Prepaid/Collect)' },
    { key: 'clean_on_board_clause', label: 'Clean on Board Notation' },
  ],
  PACKING_LIST: [
    { key: 'packing_list_number', label: 'Packing List Ref / Number' },
    { key: 'date', label: 'Date of Issue' },
    { key: 'invoice_reference', label: 'Invoice Reference' },
    { key: 'lc_reference', label: 'LC Reference' },
    { key: 'goods_description', label: 'Goods Description' },
    { key: 'packages_count', label: 'Total Packages / Cartons' },
    { key: 'gross_weight', label: 'Gross Weight' },
    { key: 'net_weight', label: 'Net Weight' },
    { key: 'measurement_volume', label: 'Measurement / Volume' },
    { key: 'container_numbers', label: 'Container Numbers' },
    { key: 'seal_numbers', label: 'Seal Numbers' },
  ],
  INSURANCE_CERTIFICATE: [
    { key: 'policy_number', label: 'Policy / Certificate Number' },
    { key: 'effective_inception_date', label: 'Cover Effective / Inception Date' },
    { key: 'issue_date', label: 'Date of Issue' },
    { key: 'insured_party', label: 'Insured Party' },
    { key: 'loss_payable_to', label: 'Loss Payable To / Consignee' },
    { key: 'sum_insured_amount', label: 'Sum Insured Amount' },
    { key: 'currency', label: 'Currency' },
    { key: 'percentage_of_cif', label: 'Coverage % of CIF / CIP' },
    { key: 'clauses_and_risks', label: 'Clauses Covered (e.g. ICC A)' },
    { key: 'voyage', label: 'Voyage (Origin to Destination)' },
  ],
  CERTIFICATE_OF_ORIGIN: [
    { key: 'certificate_number', label: 'Certificate Number' },
    { key: 'issue_date', label: 'Date of Issue' },
    { key: 'issuing_authority', label: 'Issuing Chamber / Authority' },
    { key: 'country_of_origin', label: 'Certified Country of Origin' },
    { key: 'consignor', label: 'Consignor / Exporter' },
    { key: 'consignee', label: 'Consignee' },
    { key: 'goods_description', label: 'Goods Description' },
    { key: 'gross_weight', label: 'Gross Weight' },
    { key: 'lc_reference', label: 'LC Reference' },
  ],
  INSPECTION_CERTIFICATE: [
    { key: 'certificate_number', label: 'Certificate / Inspection Number' },
    { key: 'inspection_date', label: 'Inspection Date' },
    { key: 'inspecting_agency', label: 'Inspecting Authority / Body' },
    { key: 'certification_findings', label: 'Findings / Quality Statement' },
  ],
  OTHER: [
    { key: 'document_title', label: 'Document Title' },
    { key: 'reference_number', label: 'Reference Number' },
    { key: 'date', label: 'Date' },
    { key: 'issuer', label: 'Issuer / Organization' },
    { key: 'content_summary', label: 'Content Summary' },
  ]
};

/**
 * Safely parses financial amounts from strings, numbers, or objects.
 * Handles US (150,000.00), European (150.000,00), Swift comma (150000,), and currency symbol prefixes.
 */
export function parseFinancialAmount(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const str = String(val).trim();
  if (!str) return null;

  // Strip SWIFT field tags like :32B: or Field 32B:
  let s = str.replace(/(?:field\s*)?:?32[AB]:?[^\d$€£¥A-Z]*(?:\d{6}\s*)?(?:currency(?:\s*code)?(?:,\s*amount)?)?:?/i, ' ');
  // Strip common label prefixes including CIF, FOB, Total CIF Amount, Grand Total
  s = s.replace(/(?:credit\s*amount|amount\s*of\s*credit|documentary\s*credit\s*amount|total\s*credit\s*amount|total\s*(?:cif\s*)?(?:amount|value)?|grand\s*total|lc\s*amount|amount|credit\s*value|value|invoice\s*(?:total|value|amount)?|cif\s*(?:amount|value)?|fob\s*(?:amount|value)?|amount\s*due|total)[:\s]*/gi, ' ');

  const numberMatch = s.match(/(?:(?:USD|EUR|GBP|JPY|CNY|CHF|AUD|CAD|SGD|HKD|[A-Z]{3}|[$€£¥])\s*)?([0-9][0-9,.\s]*[0-9]|[0-9])/i);
  if (!numberMatch) return null;

  let raw = numberMatch[1].trim();
  if (raw.endsWith(',')) raw = raw.slice(0, -1).trim();
  raw = raw.replace(/\s+/g, '');

  if (raw.includes(',') && !raw.includes('.')) {
    if (/^\d{1,3}(?:,\d{3})+$/.test(raw)) {
      raw = raw.replace(/,/g, '');
    } else if (/^\d+,\d{1,2}$/.test(raw)) {
      raw = raw.replace(',', '.');
    } else {
      raw = raw.replace(/,/g, '');
    }
  } else if (raw.includes('.') && !raw.includes(',')) {
    if (/^\d{1,3}(?:\.\d{3})+$/.test(raw)) {
      raw = raw.replace(/\./g, '');
    }
  } else if (raw.includes(',') && raw.includes('.')) {
    const lastComma = raw.lastIndexOf(',');
    const lastDot = raw.lastIndexOf('.');
    if (lastComma > lastDot) {
      raw = raw.replace(/\./g, '').replace(',', '.');
    } else {
      raw = raw.replace(/,/g, '');
    }
  }

  const num = parseFloat(raw);
  return isNaN(num) ? null : num;
}

/**
 * Maps currency symbols ($ -> USD, € -> EUR, £ -> GBP, ¥ -> JPY) or normalizes 3-letter currency code.
 */
export function normalizeCurrency(cur?: string | null): string {
  if (!cur) return 'USD';
  const c = cur.trim().toUpperCase();
  if (c === '$' || c.startsWith('$')) return 'USD';
  if (c === '€' || c.startsWith('€')) return 'EUR';
  if (c === '£' || c.startsWith('£')) return 'GBP';
  if (c === '¥' || c.startsWith('¥')) return 'JPY';
  const match = c.match(/\b([A-Z]{3})\b/);
  return match ? match[1] : 'USD';
}

/**
 * Helper to safely extract a regex pattern and capture exact matching source snippet.
 */
function findMatchAndSnippet(
  text: string, 
  pattern: RegExp, 
  transformValue?: (match: RegExpExecArray) => any
): { value: any; source_snippet: string | null } {
  const match = pattern.exec(text);
  if (!match) {
    return { value: null, source_snippet: null };
  }
  const fullSnippet = match[0].trim();
  const val = transformValue ? transformValue(match) : (match[1] ? match[1].trim() : fullSnippet);
  return {
    value: val,
    source_snippet: fullSnippet,
  };
}

/**
 * Extracts real container numbers (4 letters ending in U, J, or Z, then 6 digits and a check digit).
 * Strips B/L numbers and headers to ensure B/L numbers are never mistaken for container numbers.
 */
function extractContainerSnippet(
  text: string,
  blNumber?: string | null
): { value: string | null; source_snippet: string | null } {
  // Strip lines that declare B/L Number or Ocean B/L title
  let cleanText = text
    .replace(/(?:B\/?L|Bill\s*of\s*Lading)\s*(?:Number|No\.?)?[:\s#]+[A-Z0-9\/-]+/gi, '')
    .replace(/Ocean\s*B\/?L[^\r\n]*/gi, '');

  if (blNumber) {
    const cleanBl = blNumber.replace(/[^A-Za-z0-9]/g, '');
    cleanText = cleanText.replace(new RegExp(cleanBl, 'gi'), '');
  }

  // Look for ISO 6346 container numbers: 4 letters where the 4th letter MUST be U, J, or Z,
  // followed by 6 digits and a check digit (total 7 digits), optional dashes or spaces.
  // Must NOT be followed by additional digits (which occurs with 8-digit B/L numbers).
  const prefixedMatch = cleanText.match(/(?:Container(?:\s*No\.?|\s*Number)?|Cont\.?)[:\s]+([A-Z]{3}[UJZ][- ]?\d{6}[- ]?\d(?!\d))\b/i);
  if (prefixedMatch) {
    return {
      value: prefixedMatch[1].trim(),
      source_snippet: prefixedMatch[0].trim(),
    };
  }

  const isoMatch = cleanText.match(/\b([A-Z]{3}[UJZ][- ]?\d{6}[- ]?\d(?!\d))\b/i);
  if (isoMatch) {
    return {
      value: isoMatch[1].trim(),
      source_snippet: isoMatch[0].trim(),
    };
  }

  return { value: null, source_snippet: null };
}

/**
 * Fast deterministic fallback parser for standard banking documents.
 * Extracts field values along with the EXACT text snippet from which they originated.
 */
export function extractFieldsWithDeterministicRules(
  docType: DocumentType,
  rawText: string
): ExtractedFieldsMap {
  const result: ExtractedFieldsMap = {};
  const text = rawText || '';

  // Placeholder for a PDF/photo whose text has not been read: nothing to extract (no default values)
  if (!text.trim() || /^\[(PDF|Image|Uploaded image)[^\]]*\]\s*$/i.test(text.trim())) {
    return completeFieldMap(docType, {});
  }

  // Structured SWIFT MT700 / MT701 text (labelled print-outs, raw FIN blocks or pasted text):
  // parse tag by tag. This is exact and does not need AI.
  if (docType === 'LETTER_OF_CREDIT' && looksLikeMT700(text)) {
    return completeFieldMap('LETTER_OF_CREDIT', parseMT700(text));
  }

  if (docType === 'LETTER_OF_CREDIT') {
    // 1. LC Number (Field 20)
    result.lc_number = findMatchAndSnippet(text, /(?::20:\s*|LC\s*(?:Reference|No|Number)?[:\s]+)([A-Z0-9\/-]+)/i, (m) => m[1]);
    
    // 2. Expiry Date (Field 31D)
    result.expiry_date = findMatchAndSnippet(text, /(?::31D:[^\r\n]*\r?\n\s*(\d{6})|:31D:\s*(\d{6})[^\r\n]*|Expiry\s*Date[:\s]+([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}\s+[A-Za-z]+\s+[0-9]{4}))/i, (m) => {
      const d = m[1] || m[2];
      if (d) {
        // Format YYMMDD e.g. 261120 -> 2026-11-20
        const yy = '20' + d.slice(0, 2);
        const mm = d.slice(2, 4);
        const dd = d.slice(4, 6);
        return `${yy}-${mm}-${dd}`;
      }
      return m[3];
    });

    // 3. Latest Shipment Date (Field 44C)
    result.latest_shipment_date = findMatchAndSnippet(
      text,
      /(?::44C:[^\r\n]*\r?\n\s*(\d{6})|:44C:\s*(\d{6})|(?:Field\s*44C|44C|Latest\s*Shipment\s*Date|Latest\s*Date\s*of\s*Shipment)[^\r\n]*\r?\n\s*(\d{6})|Latest\s*(?:Shipment\s*Date|Date\s*of\s*Shipment)[:\s]+([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4}))/i,
      (m) => {
        const d = m[1] || m[2] || m[3];
        if (d) {
          const yy = '20' + d.slice(0, 2);
          const mm = d.slice(2, 4);
          const dd = d.slice(4, 6);
          return `${yy}-${mm}-${dd}`;
        }
        return m[4];
      }
    );

    // 4. Amount & Currency (Field 32B, 32A, Credit Amount, Documentary Credit Amount)
    const amountRegex = /(?:(?::?32[AB]:[^\d$€£¥A-Z]*(?:\d{6}\s*)?(?:currency(?:\s*code)?(?:,\s*amount)?)?:?)|(?:Credit\s*Amount|Amount\s*of\s*Credit|Documentary\s*Credit\s*Amount|Total\s*Credit\s*Amount|Total\s*Amount|LC\s*Amount|Amount|Credit\s*Value|LC\s*Value|Not\s*Exceeding|Up\s*to(?:\s*an\s*aggregate)?\s*amount\s*of)[:\s]*)\s*(?:([A-Z]{3}|[$€£¥])\s*)?([0-9][0-9,.\s]*[0-9]|[0-9])(?:\s*([A-Z]{3}))?/i;

    result.amount = findMatchAndSnippet(text, amountRegex, (m) => {
      return parseFinancialAmount(m[0]);
    });

    // Fallback amount check: look for any 32B tag or explicit Amount line if not matched
    if (result.amount.value === null || result.amount.value === undefined) {
      const lineMatch = text.match(/(?:(?::32[AB]:|\b(?:Credit\s*Amount|LC\s*Amount)\b)[^\n]*)/i);
      if (lineMatch) {
        const val = parseFinancialAmount(lineMatch[0]);
        if (val !== null) {
          result.amount = { value: val, source_snippet: lineMatch[0].trim() };
        }
      }
    }

    result.currency = findMatchAndSnippet(text, amountRegex, (m) => {
      const c = m[1] || m[3];
      return normalizeCurrency(c);
    });
    if (!result.currency.value) {
      const curMatch = text.match(/\b(USD|EUR|GBP|JPY|CNY|CHF|AUD|CAD|SGD|HKD)\b/i) || text.match(/([$€£¥])/);
      result.currency = { value: curMatch ? normalizeCurrency(curMatch[1]) : 'USD', source_snippet: curMatch ? curMatch[0] : null };
    }

    // Aliases for broad compatibility across rules and UI
    result.lc_amount = result.amount;
    result.credit_amount = result.amount;
    result.total_amount = result.amount;

    // 5. Port of loading (Field 44E)
    result.port_of_loading = findMatchAndSnippet(text, /(?::44E:\s*([^\r\n]+)|Port\s*of\s*Loading[:\s]+([^\r\n]+))/i, (m) => (m[1] || m[2]).trim());

    // 6. Port of discharge (Field 44F)
    result.port_of_discharge = findMatchAndSnippet(text, /(?::44F:\s*([^\r\n]+)|Port\s*of\s*Discharge[:\s]+([^\r\n]+))/i, (m) => (m[1] || m[2]).trim());

    // 7. Goods description (Field 45A)
    result.goods_description = findMatchAndSnippet(text, /(?::45A:\s*([\s\S]*?)(?=(?::[0-9]{2}[A-Z]?:|$))|Description\s*of\s*Goods[:\s]+([\s\S]*?)(?=\n\n|\n[A-Z0-9\s]+:|$))/i, (m) => (m[1] || m[2]).trim());

    // 8. Presentation Period (Field 48)
    result.presentation_period = findMatchAndSnippet(text, /(?::48:\s*([^\r\n]+)|Presentation\s*Period[:\s]+([^\r\n]+))/i, (m) => {
      const val = (m[1] || m[2] || '').trim();
      const numMatch = val.match(/\b(\d+)\b/);
      return numMatch ? `${numMatch[1]} days` : val;
    });
    if (!result.presentation_period.value) {
      result.presentation_period = { value: '21 days (UCP 600 default)', source_snippet: null };
    }

    // 9. Partial shipments (Field 43P) - treat 'NOT ALLOWED' as prohibited and support value on next line
    result.partial_shipments_allowed = findMatchAndSnippet(
      text,
      /(?::43P:[^\r\n]*\r?\n\s*(PROHIBITED|ALLOWED|NOT\s+ALLOWED)|:43P:\s*(PROHIBITED|ALLOWED|NOT\s+ALLOWED)|(?:Field\s*43P|Partial\s*Shipments?)[^\r\n]*(?:\r?\n\s*|\s*[:\s]+)(PROHIBITED|ALLOWED|NOT\s+ALLOWED))/i,
      (m) => {
        const val = (m[1] || m[2] || m[3] || '').toUpperCase();
        return val.includes('ALLOW') && !val.includes('NOT') && !val.includes('PROHIBIT');
      }
    );

    // 10. Transshipment (Field 43T) - treat 'NOT ALLOWED' as prohibited and support value on next line
    result.transshipment_allowed = findMatchAndSnippet(
      text,
      /(?::43T:[^\r\n]*\r?\n\s*(PROHIBITED|ALLOWED|NOT\s+ALLOWED)|:43T:\s*(PROHIBITED|ALLOWED|NOT\s+ALLOWED)|(?:Field\s*43T|Transshipments?)[^\r\n]*(?:\r?\n\s*|\s*[:\s]+)(PROHIBITED|ALLOWED|NOT\s+ALLOWED))/i,
      (m) => {
        const val = (m[1] || m[2] || m[3] || '').toUpperCase();
        return val.includes('ALLOW') && !val.includes('NOT') && !val.includes('PROHIBIT');
      }
    );

    // 11. Required documents (Field 46A)
    result.required_documents = findMatchAndSnippet(text, /(?::46A:\s*([\s\S]*?)(?=(?::[0-9]{2}[A-Z]?:|$))|Documents\s*Required[:\s]+([\s\S]*?)(?=\n\n|\n[A-Z0-9\s]+:|$))/i, (m) => (m[1] || m[2]).trim());

    // 12. Insurance percentage required
    result.insurance_percentage_required = findMatchAndSnippet(text, /(?:INSURANCE[\s\S]*?([0-9]{2,3})\s*(?:PERCENT|PCT|%)\s*(?:OF\s*)?(?:CIF|CIP)?|([0-9]{2,3})%\s*CIF)/i, (m) => `${m[1] || m[2]}%`);

    // 13. Applicant (Field 50)
    result.applicant = findMatchAndSnippet(text, /(?::50:\s*([\s\S]*?)(?=(?::[0-9]{2}[A-Z]?:|$))|Applicant[:\s]+([^\r\n]+))/i, (m) => (m[1] || m[2]).trim());

    // 14. Beneficiary (Field 59)
    result.beneficiary = findMatchAndSnippet(text, /(?::59:\s*([\s\S]*?)(?=(?::[0-9]{2}[A-Z]?:|$))|Beneficiary[:\s]+([^\r\n]+))/i, (m) => (m[1] || m[2]).trim());

    // 15. Quantity tolerance (Field 39A/B)
    result.quantity_tolerance = findMatchAndSnippet(text, /(?::39[AB]:\s*([^\r\n]+)|Tolerance[:\s]+([^\r\n]+))/i, (m) => (m[1] || m[2]).trim());
  } else if (docType === 'COMMERCIAL_INVOICE') {
    result.invoice_number = findMatchAndSnippet(text, /(?:Invoice\s*No\.?|Invoice\s*Number)[:\s]+([A-Z0-9\/-]+)/i, (m) => m[1]);
    result.invoice_date = findMatchAndSnippet(text, /(?:Invoice\s*Date|Date)[:\s]+([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i, (m) => m[1]);
    const invAmountRegex = /(?:(?:Invoice\s*Total|Total\s*(?:CIF\s*)?(?:Amount|Value)?|Grand\s*Total|Total\s*Value|Amount\s*Due|Total)[:\s]*)\s*(?:([A-Z]{3}|[$€£¥])\s*)?([0-9][0-9,.\s]*[0-9]|[0-9])(?:\s*([A-Z]{3}))?/i;
    result.total_amount = findMatchAndSnippet(text, invAmountRegex, (m) => parseFinancialAmount(m[0]));
    if (result.total_amount.value === null || result.total_amount.value === undefined) {
      const lineMatch = text.match(/(?:(?:\b(?:Invoice\s*Total|Grand\s*Total|Total\s*CIF\s*Amount|Total\s*CIF\s*Value|Total\s*Amount|Total\s*CIF|Total)\b)[^\n]*)/i);
      if (lineMatch) {
        const val = parseFinancialAmount(lineMatch[0]);
        if (val !== null) {
          result.total_amount = { value: val, source_snippet: lineMatch[0].trim() };
        }
      }
    }
    result.amount = result.total_amount;
    result.invoice_amount = result.total_amount;
    result.currency = findMatchAndSnippet(text, invAmountRegex, (m) => normalizeCurrency(m[1] || m[3]));
    if (!result.currency.value) {
      const curMatch = text.match(/\b(USD|EUR|GBP|JPY|CNY|CHF|AUD|CAD)\b/i) || text.match(/([$€£¥])/);
      result.currency = { value: curMatch ? normalizeCurrency(curMatch[1]) : 'USD', source_snippet: curMatch ? curMatch[0] : null };
    }
    result.gross_weight = findMatchAndSnippet(text, /(?:Gross\s*Weight[:\s]+)([0-9,]+(?:\.[0-9]+)?)\s*(KGS?|KG|MT|LBS?)/i, (m) => `${m[1]} ${m[2]}`);
    result.net_weight = findMatchAndSnippet(text, /(?:Net\s*Weight[:\s]+)([0-9,]+(?:\.[0-9]+)?)\s*(KGS?|KG|MT|LBS?)/i, (m) => `${m[1]} ${m[2]}`);
    result.unit_price = findMatchAndSnippet(text, /(?:Price|Unit\s*Price)[:\s]+([A-Z]{3}\s*[0-9,.]+(?:\s*\/\s*[a-zA-Z]+)?)/i, (m) => m[1]);
    result.port_of_loading = findMatchAndSnippet(text, /(?:Port\s*of\s*Loading[:\s]+)([^\r\n,]+)/i, (m) => m[1].trim());
    result.port_of_discharge = findMatchAndSnippet(text, /(?:Port\s*of\s*Discharge[:\s]+)([^\r\n,]+)/i, (m) => m[1].trim());
    result.incoterm = findMatchAndSnippet(text, /(?:Incoterms?|Terms)?[:\s]*\b(CIF|FOB|CFR|DAP|FCA|CPT|CIP)\b[^\r\n]*/i, (m) => m[0].trim());
    result.goods_description = findMatchAndSnippet(text, /(?:Description\s*of\s*Goods|Item\s*Description|Goods)[:\s]+([\s\S]*?)(?=\n\n|\n[A-Z][a-zA-Z\s]+:|$)/i, (m) => m[1].trim());
    result.applicant_buyer = findMatchAndSnippet(text, /(?:Bill\s*To|Buyer)[:\s]+([^\r\n]+)/i, (m) => m[1].trim());
    result.beneficiary_seller = findMatchAndSnippet(text, /(?:COMMERCIAL INVOICE\s*\n\s*([^\r\n]+)|Seller[:\s]+([^\r\n]+))/i, (m) => (m[1] || m[2]).trim());
    result.container_numbers = extractContainerSnippet(text);
    result.clauses_and_certifications = findMatchAndSnippet(text, /(?:Certif(?:y|ied|ication)[^\r\n]+|OEKO-TEX[^\r\n]+)/i, (m) => m[0].trim());
  } else if (docType === 'BILL_OF_LADING') {
    result.bl_number = findMatchAndSnippet(text, /(?:B\/?L\s*(?:Number|No\.?)?[:\s#]+)([A-Z0-9\/-]+)/i, (m) => m[1]);
    result.shipped_on_board_date = findMatchAndSnippet(text, /(?:Shipped\s*on\s*Board\s*Date[:\s]+|On\s*Board\s*Date[:\s]+|Clean\s*On\s*Board\s*Date[:\s]+)([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i, (m) => m[1]);
    result.issue_date = findMatchAndSnippet(text, /(?:Issue\s*Date[:\s]+)([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i, (m) => m[1]);
    result.carrier_name = findMatchAndSnippet(text, /(?:OCEAN BILL OF LADING\s*\n\s*([^\r\n]+)|Carrier[:\s]+([^\r\n]+))/i, (m) => (m[1] || m[2]).trim());
    result.shipper = findMatchAndSnippet(text, /(?:Shipper[:\s]+)([^\r\n]+)/i, (m) => m[1].trim());
    result.consignee = findMatchAndSnippet(text, /(?:Consignee[:\s]+)([^\r\n]+)/i, (m) => m[1].trim());
    result.notify_party = findMatchAndSnippet(text, /(?:Notify\s*(?:Party)?[:\s]+)([^\r\n]+)/i, (m) => m[1].trim());
    result.port_of_loading = findMatchAndSnippet(text, /(?:Port\s*of\s*Loading[:\s]+)([^\r\n,]+)/i, (m) => m[1].trim());
    result.port_of_discharge = findMatchAndSnippet(text, /(?:Port\s*of\s*Discharge[:\s]+)([^\r\n,]+)/i, (m) => m[1].trim());
    result.vessel_and_voyage = findMatchAndSnippet(text, /(?:Vessel(?:\s*\/\s*Voyage)?[:\s]+)([^\r\n]+)/i, (m) => m[1].trim());
    result.gross_weight = findMatchAndSnippet(text, /(?:Gross\s*Weight[:\s]+)([0-9,]+(?:\.[0-9]+)?)\s*(KGS?|KG|MT|LBS?)/i, (m) => `${m[1]} ${m[2]}`);
    result.measurement_volume = findMatchAndSnippet(text, /(?:Measurement[:\s]+)([0-9,.]+\s*(?:CBM|M3|FT3)?)/i, (m) => m[1].trim());
    result.container_numbers = extractContainerSnippet(text, result.bl_number?.value as string);
    result.seal_numbers = findMatchAndSnippet(text, /(?:Seal[:\s]+)([A-Z0-9\/-]+)/i, (m) => m[1]);
    result.freight_clause = findMatchAndSnippet(text, /\b(Freight\s+Prepaid|Freight\s+Collect|Freight\s+Payable)\b/i, (m) => m[1]);
    result.clean_on_board_clause = findMatchAndSnippet(text, /\b(CLEAN\s+ON\s+BOARD|SHIPPED\s+ON\s+BOARD)\b/i, (m) => m[1]);
    result.goods_description = findMatchAndSnippet(text, /(?:Said\s*to\s*Contain[:\s]+|Goods[:\s]+)([^\r\n]+)/i, (m) => m[1].trim());
  } else if (docType === 'PACKING_LIST') {
    result.packing_list_number = findMatchAndSnippet(text, /(?:PACKING LIST[\s\S]*?Ref(?:\s*Inv)?[:\s]+([A-Z0-9\/-]+)|Invoice\s*Ref[:\s]+([A-Z0-9\/-]+))/i, (m) => m[1] || m[2]);
    result.date = findMatchAndSnippet(text, /(?:Date[:\s]+)([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i, (m) => m[1]);
    result.invoice_reference = findMatchAndSnippet(text, /(?:Invoice\s*Ref[:\s]+|Ref\s*Inv[:\s]+)([A-Z0-9\/-]+)/i, (m) => m[1]);
    result.lc_reference = findMatchAndSnippet(text, /(?:LC\s*Ref[:\s]+)([A-Z0-9\/-]+)/i, (m) => m[1]);
    result.packages_count = findMatchAndSnippet(text, /(?:Total\s*Quantity[:\s]+|Total\s*Packages[:\s]+|Pallet\s*Nos[:\s]+|Carton\s*Nos[:\s]+)([^\r\n]+)/i, (m) => m[1].trim());
    result.gross_weight = findMatchAndSnippet(text, /(?:Gross\s*Weight[:\s]+)([0-9,]+(?:\.[0-9]+)?)\s*(KGS?|KG|MT|LBS?)/i, (m) => `${m[1]} ${m[2]}`);
    result.net_weight = findMatchAndSnippet(text, /(?:Net\s*Weight[:\s]+)([0-9,]+(?:\.[0-9]+)?)\s*(KGS?|KG|MT|LBS?)/i, (m) => `${m[1]} ${m[2]}`);
    result.container_numbers = extractContainerSnippet(text);
    result.measurement_volume = findMatchAndSnippet(text, /(?:Measurement[:\s]+|Dimensions[:\s]+)([0-9,.]+\s*(?:CBM|M3)?)/i, (m) => m[1].trim());
  } else if (docType === 'INSURANCE_CERTIFICATE') {
    result.policy_number = findMatchAndSnippet(text, /(?:Policy\s*(?:No\.?|Number)?[:\s]+)([A-Z0-9\/-]+)/i, (m) => m[1]);
    result.effective_inception_date = findMatchAndSnippet(text, /(?:Effective\s*Date[:\s]+|Date\s*of\s*Attachment[:\s]+|Inception\s*Date[:\s]+)([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i, (m) => m[1]);
    result.insured_party = findMatchAndSnippet(text, /(?:Insured[:\s]+)([^\r\n]+)/i, (m) => m[1].trim());
    result.loss_payable_to = findMatchAndSnippet(text, /(?:Loss\s*Payable\s*to[:\s]+|Endorsement[:\s]+)([^\r\n]+)/i, (m) => m[1].trim());
    result.sum_insured_amount = findMatchAndSnippet(text, /(?:Sum\s*Insured[:\s]+)([A-Z]{3})?\s*([0-9,]+(?:\.[0-9]{2})?)/i, (m) => parseFloat(m[2].replace(/,/g, '')));
    result.currency = findMatchAndSnippet(text, /(?:Sum\s*Insured[:\s]+)?([A-Z]{3})\s*[0-9,]+(?:\.[0-9]{2})?/i, (m) => m[1]);
    result.percentage_of_cif = findMatchAndSnippet(text, /(?:([0-9]{2,3})%\s*(?:of\s*(?:CIF|Invoice)?)|110%)/i, (m) => m[1] ? `${m[1]}%` : '110%');
    result.clauses_and_risks = findMatchAndSnippet(text, /(?:Conditions[:\s]+|Clauses[:\s]+)([^\r\n]+)/i, (m) => m[1].trim());
    result.voyage = findMatchAndSnippet(text, /(?:Voyage[:\s]+)([^\r\n]+)/i, (m) => m[1].trim());
  } else if (docType === 'CERTIFICATE_OF_ORIGIN') {
    result.certificate_number = findMatchAndSnippet(text, /(?:Certificate\s*No\.?[:\s]+)([A-Z0-9\/-]+)/i, (m) => m[1]);
    result.issue_date = findMatchAndSnippet(text, /(?:Issued\s*on[:\s]+|Issued[:\s]+)([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i, (m) => m[1]);
    result.issuing_authority = findMatchAndSnippet(text, /(?:CERTIFICATE OF ORIGIN\s*\n\s*([^\r\n]+)|Authority[:\s]+([^\r\n]+))/i, (m) => (m[1] || m[2]).trim());
    result.country_of_origin = findMatchAndSnippet(text, /(?:originated\s*in\s*([A-Za-z]+)|Country\s*of\s*Origin[:\s]+([A-Za-z]+))/i, (m) => (m[1] || m[2]).trim());
    result.consignor = findMatchAndSnippet(text, /(?:Consignor[:\s]+|Exporter[:\s]+)([^\r\n]+)/i, (m) => m[1].trim());
    result.consignee = findMatchAndSnippet(text, /(?:Consignee[:\s]+)([^\r\n]+)/i, (m) => m[1].trim());
    result.gross_weight = findMatchAndSnippet(text, /(?:Gross\s*Weight[:\s]+)([0-9,]+(?:\.[0-9]+)?)\s*(KGS?|KG|MT|LBS?)/i, (m) => `${m[1]} ${m[2]}`);
    result.lc_reference = findMatchAndSnippet(text, /(?:LC\s*No\.?[:\s]+|Credit\s*Ref[:\s]+)([A-Z0-9\/-]+)/i, (m) => m[1]);
  }

  // Second pass for PDF text layers where the label sits on its own line and the value on the next
  if (docType !== 'LETTER_OF_CREDIT') enhanceFromLabelledLayout(docType, text, result);

  // Ensure every key defined in FIELD_DEFINITIONS exists in the result, defaulting to null/null if missing
  const defs = FIELD_DEFINITIONS[docType] || FIELD_DEFINITIONS.OTHER;
  for (const def of defs) {
    if (!result[def.key]) {
      result[def.key] = { value: null, source_snippet: null, label: def.label };
    } else {
      result[def.key].label = def.label;
    }
  }

  return result;
}

// ===========================================================================
// Layout-aware fallback (PDF text where "Label" and its value are on separate lines)
// ===========================================================================

const DATE_RE = /(\d{1,2}[ .\/-](?:[A-Za-z]{3,9}|\d{1,2})[ .\/-]\d{4}|\d{4}-\d{2}-\d{2}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/;
const MONEY_RE = /\b(USD|EUR|GBP|INR|AED|JPY|CNY|CHF|SGD|HKD|AUD|CAD)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\b/g;
const LAYOUT_LABELS = /^(hs code|quantity|unit price|amount|total.*|gross weight|net weight|measureme|nt|measurement|marks.*|no\. and kind of|packages|description of goods|freight and charges|freight payable at|number of original b\/ls|place and date of issue|place of receipt|place of delivery|vessel \/ voyage|port of loading|port of discharge|consignee|notify party|shipper|buyer|seller|exporter|conditions|claims|reference|voyage|conveyance|insured|amount insured|basis of valuation|subject-matter insured|packing|payment|terms of delivery|proforma invoice|-)$/i;

function isEmptyField(f?: ExtractedFieldItem | null): boolean {
  return !f || f.value === null || f.value === undefined || String(f.value).trim() === '';
}

/** A table header row such as "Description of goods HS code Quantity Unit price Amount". */
function isHeaderLine(l: string): boolean {
  const rest = l
    .toLowerCase()
    .replace(/description of goods|hs code|unit price|quantity|amount|gross weight|net weight|measurement|measureme|no\. and kind of|packages|marks \/ containers \/ seals|marks|containers|seals|\bnt\b|total/g, '')
    .replace(/[^a-z0-9]/g, '');
  return rest.length === 0;
}

function looksLikeLabel(v: any): boolean {
  const s = String(v ?? '').trim();
  return !s || LAYOUT_LABELS.test(s) || isHeaderLine(s) || /^(port-to-port shipment|\/)$/i.test(s);
}

function enhanceFromLabelledLayout(docType: DocumentType, text: string, result: ExtractedFieldsMap): void {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);

  /** Value lines that follow a label that stands alone on its line. */
  const after = (label: RegExp, maxLines = 1, skipLabels = true): { value: string; snippet: string } | null => {
    const idx = nonEmpty.findIndex((l) => label.test(l));
    if (idx < 0) return null;
    const out: string[] = [];
    for (let i = idx + 1; i < nonEmpty.length && out.length < maxLines; i++) {
      const l = nonEmpty[i];
      if (skipLabels && (LAYOUT_LABELS.test(l) || /^(No\.?\s*:|Date\s*:|ORIGINAL$|COPY$|DUPLICATE$)/i.test(l))) {
        if (out.length) break;
        continue;
      }
      out.push(l);
    }
    if (!out.length) return null;
    return { value: out.join(' '), snippet: [nonEmpty[idx], ...out].join('\n') };
  };
  const set = (key: string, value: any, snippet: string | null, force = false) => {
    if (value === null || value === undefined || String(value).trim() === '') return;
    if (force || isEmptyField(result[key]) || looksLikeLabel(result[key]?.value)) {
      result[key] = { value, source_snippet: snippet };
    }
  };
  const inlineMatch = (re: RegExp) => {
    for (const l of nonEmpty) {
      const m = l.match(re);
      if (m) return { m, line: l };
    }
    return null;
  };
  const moneyAfter = (label: RegExp) => {
    const a = after(label, 2, false);
    if (!a) return null;
    MONEY_RE.lastIndex = 0;
    const m = MONEY_RE.exec(a.value);
    return m ? { currency: m[1].toUpperCase(), amount: parseFloat(m[2].replace(/,/g, '')), snippet: a.snippet } : null;
  };
  const lcRef = inlineMatch(/\b(?:L\/?C|Credit)\s*(?:No\.?|Number|Ref(?:erence)?)\s*[:.]?\s*([A-Z0-9][A-Z0-9\/-]{5,})/i);
  if (lcRef) set('lc_reference', lcRef.m[1], lcRef.line);

  const goodsAfterHeader = () => {
    const idx = nonEmpty.findIndex((l) => /^description of goods/i.test(l));
    if (idx < 0) return null;
    const out: string[] = [];
    for (let i = idx + 1; i < Math.min(nonEmpty.length, idx + 30); i++) {
      const l = nonEmpty[i];
      const isNoise = LAYOUT_LABELS.test(l) || isHeaderLine(l) || /^[\d.,]+$/.test(l) || /^(KGS?|CBM)$/i.test(l) || /^\d+\s*\(/.test(l) || /CASE NO|\s\/\s|^VIT\b/i.test(l) || /^[A-Z]{3}\/[A-Z]{3}/.test(l);
      if (!out.length) {
        if (isNoise || l.split(/\s+/).length < 2) continue;
        if (/^(WOODEN|CARTONS?|PALLETS?|BAGS?)\b/i.test(l)) continue;
        out.push(l);
        continue;
      }
      if (isNoise || /^(L\/C|HS CODE|SHIPPER'S|\d{4}\.\d{2}$)/i.test(l) || out.length >= 5) break;
      out.push(l);
    }
    return out.length ? { value: out.join(' '), snippet: out.join('\n') } : null;
  };

  if (docType === 'COMMERCIAL_INVOICE') {
    const no = inlineMatch(/^(?:Invoice\s*)?No\.?\s*[:.]?\s*([A-Z0-9][A-Z0-9\/-]{3,})$/i);
    const prevSnip = String(result.invoice_number?.source_snippet || '');
    const fromProforma = /PRO-?\s*FORMA/i.test(prevSnip) || !/\b(no\.?|number)\b/i.test(prevSnip);
    if (no) set('invoice_number', no.m[1], no.line, fromProforma);
    const dt = inlineMatch(new RegExp('^(?:Invoice\\s*)?Date\\s*[:.]?\\s*' + DATE_RE.source, 'i'));
    if (dt) set('invoice_date', dt.m[1], dt.line);
    // Total: the largest currency amount on the invoice (unit prices are per-unit and smaller)
    if (isEmptyField(result.total_amount)) {
      let best: { cur: string; amt: number; line: string } | null = null;
      for (const l of nonEmpty) {
        if (/\/\s*(KG|PC|PCS|MT|UNIT|CTN)\b|per\s+/i.test(l)) continue;
        MONEY_RE.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = MONEY_RE.exec(l))) {
          const amt = parseFloat(m[2].replace(/,/g, ''));
          if (!best || amt > best.amt) best = { cur: m[1].toUpperCase(), amt, line: l };
        }
      }
      if (best) {
        result.total_amount = { value: best.amt, source_snippet: best.line };
        result.amount = result.total_amount;
        result.invoice_amount = result.total_amount;
        set('currency', best.cur, best.line, true);
      }
    }
    const g = goodsAfterHeader();
    if (g) set('goods_description', g.value, g.snippet);
    const buyer = after(/^(buyer|bill to|sold to|invoiced to|applicant)\s*:?$/i);
    if (buyer) set('applicant_buyer', buyer.value, buyer.snippet, /^(No\.?\s*:|Date\s*:)/i.test(String(result.applicant_buyer?.value || '')));
    const signer = [...nonEmpty].reverse().find((l) => /^For\s+\S/i.test(l) && !/^For\s+(the\s+)?(carrier|account)/i.test(l));
    if (signer && /^(plot|\d|p\.?o\.?\s*box)/i.test(String(result.beneficiary_seller?.value || ''))) {
      result.beneficiary_seller = { value: signer.replace(/^For\s+/i, '').trim(), source_snippet: signer };
    } else if (signer) set('beneficiary_seller', signer.replace(/^For\s+/i, '').trim(), signer);
    const pol = after(/^port of loading\s*:?$/i);
    if (pol) set('port_of_loading', pol.value.split(',')[0].trim(), pol.snippet);
    const pod = after(/^port of discharge\s*:?$/i);
    if (pod) set('port_of_discharge', pod.value.split(',')[0].trim(), pod.snippet);
  } else if (docType === 'BILL_OF_LADING') {
    const pol = after(/^port of loading\s*:?$/i);
    if (pol) set('port_of_loading', pol.value.split(',')[0].trim(), pol.snippet);
    const pod = after(/^port of discharge\s*:?$/i);
    if (pod) set('port_of_discharge', pod.value.split(',')[0].trim(), pod.snippet);
    const issue = after(/^(place and date of issue|date of issue|issue date)\s*:?$/i);
    const issueDate = issue?.value.match(DATE_RE)?.[1];
    if (issue && issueDate) set('issue_date', issueDate, issue.snippet);
    // On-board notation: "SHIPPED ON BOARD" stamp with "Date: ..." nearby, or "On board date"
    const obIdx = nonEmpty.findIndex((l) => /^(shipped\s+)?on\s+board(\s+date)?\s*:?\s*$/i.test(l) || /laden\s+on\s+board/i.test(l));
    let onBoard: { value: string; snippet: string } | null = null;
    const near = (from: number, to: number) => {
      for (let i = Math.max(0, from); i < Math.min(nonEmpty.length, to); i++) {
        const m = nonEmpty[i].match(new RegExp('^(?:On\\s*board\\s*)?Date\\s*[:.]?\\s*' + DATE_RE.source, 'i'));
        if (m) return { value: m[1], snippet: nonEmpty[i] };
      }
      return null;
    };
    if (obIdx >= 0) onBoard = near(obIdx - 12, obIdx + 8);
    if (!onBoard) {
      const stamp = inlineMatch(new RegExp('on\\s*board[^\\n]{0,40}?' + DATE_RE.source, 'i'));
      if (stamp) onBoard = { value: stamp.m[1], snippet: stamp.line };
    }
    if (!onBoard && issueDate && /shipped\s+on\s+board\s+the\s+vessel/i.test(text)) {
      // Pre-printed "shipped" B/L: the issue date is the shipment date (UCP 600 Art 20(a)(ii))
      onBoard = { value: issueDate, snippet: issue!.snippet };
    }
    if (onBoard) set('shipped_on_board_date', onBoard.value, onBoard.snippet);
    const carrier = inlineMatch(/(?:signed\s+)?for\s+(.+?),?\s+as\s+(?:the\s+)?carrier/i);
    if (carrier) set('carrier_name', carrier.m[1].trim(), carrier.line);
    const vv = after(/^vessel\s*\/\s*voyage\s*:?$/i);
    if (vv) set('vessel_and_voyage', vv.value, vv.snippet);
    // Gross weight: the B/L total is the largest weight shown (per-container lines are smaller)
    const gwIdx = text.search(/gross\s*weight/i);
    if (gwIdx >= 0) {
      const weights = Array.from(text.slice(gwIdx).matchAll(/([0-9][0-9,]*(?:\.[0-9]+)?)\s*(KGS?|KILOS?)\b/gi))
        .map((m) => ({ n: parseFloat(m[1].replace(/,/g, '')), m }))
        .filter((w) => !Number.isNaN(w.n));
      const best = weights.sort((a, b) => b.n - a.n)[0];
      const current = parseFloat(String(result.gross_weight?.value || '').replace(/[^0-9.]/g, ''));
      const labelledTotal = /total/i.test(String(result.gross_weight?.source_snippet || ''));
      if (best && (isEmptyField(result.gross_weight) || (!labelledTotal && (Number.isNaN(current) || best.n > current)))) {
        result.gross_weight = { value: `${best.m[1]} KGS`, source_snippet: best.m[0] };
      }
    }
    const cbm = text.match(/([0-9][0-9,]*(?:\.[0-9]+)?)\s*(CBM|M3)\b/i);
    if (cbm) set('measurement_volume', `${cbm[1]} ${cbm[2].toUpperCase()}`, cbm[0]);
    const g = goodsAfterHeader();
    if (g) set('goods_description', g.value, g.snippet, looksLikeLabel(result.goods_description?.value));
    const cons = after(/^consignee\s*:?$/i);
    if (cons) set('consignee', cons.value, cons.snippet);
    const notify = after(/^notify(\s+party)?\s*:?$/i);
    if (notify) set('notify_party', notify.value, notify.snippet);
  } else if (docType === 'INSURANCE_CERTIFICATE') {
    const cert = inlineMatch(/(?:Certificate|Policy)\s*(?:No\.?|Number)\s*[:.]?\s*([A-Z0-9][A-Z0-9\/-]{4,})/i);
    if (cert) set('policy_number', cert.m[1], cert.line, String(result.policy_number?.value || '').length < 4);
    const sum = moneyAfter(/^(amount insured|sum insured|insured (amount|value)|insured for)\s*:?$/i);
    if (sum) {
      set('sum_insured_amount', sum.amount, sum.snippet);
      set('currency', sum.currency, sum.snippet, !/^[A-Z]{3}$/.test(String(result.currency?.value || '')));
    } else {
      const inl = inlineMatch(/(?:amount|sum)\s+insured\s*[:.]?\s*(USD|EUR|GBP|INR|AED)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i);
      if (inl) {
        set('sum_insured_amount', parseFloat(inl.m[2].replace(/,/g, '')), inl.line);
        set('currency', inl.m[1].toUpperCase(), inl.line, !/^[A-Z]{3}$/.test(String(result.currency?.value || '')));
      }
    }
    const dt = inlineMatch(new RegExp('^(?:Date(?:\\s*of\\s*issue)?|Issued\\s*on)\\s*[:.]?\\s*' + DATE_RE.source, 'i'));
    if (dt) {
      set('issue_date', dt.m[1], dt.line);
      set('effective_inception_date', dt.m[1], dt.line);
    }
    const cond = after(/^(conditions|clauses|cover)\s*:?$/i, 3, false);
    if (cond) set('clauses_and_risks', cond.value, cond.snippet);
    const voy = after(/^voyage\s*:?$/i);
    if (voy) set('voyage', voy.value, voy.snippet);
    const insured = after(/^insured\s*:?$/i);
    if (insured) set('insured_party', insured.value, insured.snippet);
  } else if (docType === 'CERTIFICATE_OF_ORIGIN') {
    const cert = inlineMatch(/(?:Certificate|Cert\.?|Reference)\s*No\.?\s*[:.]?\s*([A-Z0-9][A-Z0-9\/-]{4,})/i);
    if (cert) set('certificate_number', cert.m[1], cert.line);
    const dt = inlineMatch(new RegExp('^(?:Date(?:\\s*of\\s*issue)?|Issued\\s*on|Place and date)\\s*[:.]?[^0-9A-Za-z]*(?:[A-Za-z ,]+,\\s*)?' + DATE_RE.source, 'i'));
    if (dt) set('issue_date', dt.m[1], dt.line);
    const auth = nonEmpty.find((l) => /chamber of commerce|chamber of industry|council|export promotion|chamber\b/i.test(l) && !/^(chamber bhavan|\d)/i.test(l));
    if (auth) set('issuing_authority', auth, auth, /^(\d|plot|chamber bhavan)|road|street/i.test(String(result.issuing_authority?.value || '')));
    const g = goodsAfterHeader();
    if (g) set('goods_description', g.value, g.snippet);
  } else if (docType === 'PACKING_LIST') {
    const no = inlineMatch(/^(?:Packing\s*list\s*)?No\.?\s*[:.]?\s*([A-Z0-9][A-Z0-9\/-]{3,})$/i);
    if (no) set('packing_list_number', no.m[1], no.line);
    const inv = inlineMatch(/Invoice\s*(?:No\.?|Ref\.?|Reference)?\s*[:.]?\s*([A-Z]{2,}[A-Z0-9]*\/[A-Z0-9\/-]+)/i);
    if (inv) set('invoice_reference', inv.m[1], inv.line);
    const g = goodsAfterHeader();
    if (g) set('goods_description', g.value, g.snippet);
  }
}

// ===========================================================================
// Shared helpers: dates, MT700 parsing, normalisation, document type detection
// ===========================================================================

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function validYmd(y: number, m: number, d: number): string | null {
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null;
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/**
 * Converts any common trade-document date into ISO YYYY-MM-DD, or null if it cannot be read.
 * Handles: 2026-10-15, 261015 (SWIFT YYMMDD), 15 Oct 2026, 15 OCTOBER 2026, October 15, 2026,
 * 15.10.2026, 15/10/2026 (day first), 2026/10/15. Text after the date is ignored.
 */
export function toIsoDate(value: any): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return validYmd(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{2})(\d{2})(\d{2})(?!\d)/);
  if (m) return validYmd(2000 + +m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s.-]+([A-Za-z]{3,9})[\s.,-]+(\d{4})/);
  if (m && MONTHS[m[2].toLowerCase().slice(0, m[2].toLowerCase().startsWith('sept') ? 4 : 3)]) {
    return validYmd(+m[3], MONTHS[m[2].toLowerCase().slice(0, 3)], +m[1]);
  }
  m = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/);
  if (m && MONTHS[m[1].toLowerCase().slice(0, 3)]) return validYmd(+m[3], MONTHS[m[1].toLowerCase().slice(0, 3)], +m[2]);
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) return validYmd(+m[3], +m[2], +m[1]);
  return null;
}

/** Interprets "ALLOWED" / "NOT ALLOWED" / "PROHIBITED" / booleans. Null when unknown. */
export function toAllowedBoolean(value: any): boolean | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value;
  const s = String(value).toUpperCase();
  if (/NOT\s+ALLOWED|PROHIBITED|NOT\s+PERMITTED|^NO\b|FALSE/.test(s)) return false;
  if (/ALLOWED|PERMITTED|CONDITIONAL|^YES\b|TRUE/.test(s)) return true;
  return null;
}

const MT700_LABEL_HINTS: Record<string, string> = {
  '27': 'sequence of total', '40A': 'form of documentary credit', '20': 'documentary credit number',
  '23': 'reference to pre-advice', '31C': 'date of issue', '40E': 'applicable rules', '31D': 'date and place of expiry',
  '51A': 'applicant bank', '50': 'applicant', '59': 'beneficiary', '32B': 'currency code, amount',
  '39A': 'percentage credit amount tolerance', '39B': 'maximum credit amount', '39C': 'additional amounts covered',
  '41A': 'available with', '41D': 'available with', '42C': 'drafts at', '42A': 'drawee', '42D': 'drawee',
  '42M': 'mixed payment details', '42P': 'negotiation/deferred payment details', '43P': 'partial shipments',
  '43T': 'transhipment', '44A': 'place of taking in charge', '44E': 'port of loading', '44F': 'port of discharge',
  '44B': 'place of final destination', '44C': 'latest date of shipment', '44D': 'shipment period',
  '45A': 'description of goods', '45B': 'description of goods', '46A': 'documents required', '46B': 'documents required',
  '47A': 'additional conditions', '47B': 'additional conditions', '71B': 'charges', '71D': 'charges',
  '48': 'period for presentation', '49': 'confirmation instructions', '52A': 'issuing bank', '52D': 'issuing bank',
  '53A': 'reimbursing bank', '57A': 'advise through bank', '78': 'instructions to the paying', '72Z': 'sender to receiver information',
};

const TAG_LINE = /^[ \t]*:(\d{2}[A-Z]?):[ \t]*(.*)$/;

/** True when the text contains at least three SWIFT field tags such as :20: :32B: :45A: */
export function looksLikeMT700(text: string): boolean {
  if (!text) return false;
  const tags = text.split(/\r?\n/).filter((l) => TAG_LINE.test(l)).length;
  return tags >= 3;
}

interface MT700Block {
  tag: string;
  lines: string[];
  snippet: string;
}

function lettersOnly(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, '');
}

/** Splits MT700 / MT701 text into tag blocks. Field labels printed after the tag are removed. */
export function splitMT700Blocks(text: string): MT700Block[] {
  const rawLines = (text || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks: MT700Block[] = [];
  let current: MT700Block | null = null;
  for (const rawLine of rawLines) {
    const line = rawLine.replace(/^\{4:\s*/, '');
    if (/^\s*-\}|^\s*-{1,2}\s*END OF MESSAGE/i.test(line) || /^\s*\{5:/.test(line)) {
      current = null;
      continue;
    }
    const m = line.match(TAG_LINE);
    if (m) {
      const tag = m[1].toUpperCase();
      let first = m[2].trim();
      const hint = MT700_LABEL_HINTS[tag];
      // Labelled print-out: ":44C: Latest Date of Shipment" with the value on the next line(s)
      if (first && hint && lettersOnly(first).startsWith(lettersOnly(hint).slice(0, Math.min(10, lettersOnly(hint).length)))) {
        first = '';
      } else if (first && /[a-z]/.test(first) && /^[A-Z][a-z]/.test(first) && !/\d/.test(first) && first.split(/\s+/).length <= 8) {
        // Unknown mixed-case label (values in MT700 are upper case)
        first = '';
      }
      current = { tag, lines: first ? [first] : [], snippet: rawLine.trim() };
      blocks.push(current);
      continue;
    }
    if (current) {
      const t = line.trim();
      if (!t) continue;
      // PDF print-outs put the field name on the line after the tag (":20:" / "Documentary Credit Number" / value)
      if (current.lines.length === 0) {
        const hint = MT700_LABEL_HINTS[current.tag];
        const isHint = hint && lettersOnly(t).startsWith(lettersOnly(hint).slice(0, Math.min(10, lettersOnly(hint).length)));
        const isMixedLabel = /[a-z]/.test(t) && /^[A-Z][a-z]/.test(t) && !/\d/.test(t) && t.split(/\s+/).length <= 8;
        if (isHint || isMixedLabel) {
          current.snippet += '\n' + rawLine.trimEnd();
          continue;
        }
      }
      // Page furniture of PDF print-outs
      if (/^(page \d+( of \d+)?|\S+ \| page \d+|continued( on next page)?|-- \d+ of \d+ --)$/i.test(t)) continue;
      if (/^(MT\s?70\d|SENDER\s*:|RECEIVER\s*:|FICTIONAL TEST DOCUMENT)/i.test(t)) {
        current = null;
        continue;
      }
      current.lines.push(t);
      current.snippet += '\n' + rawLine.trimEnd();
    }
  }
  return blocks;
}

/** Splits a 46A/47A style list ("+ITEM ... +ITEM ...") into clean items. */
export function splitSwiftList(lines: string[]): string[] {
  const items: string[] = [];
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) continue;
    if (/^\+/.test(l) || /^\d+[.)]\s/.test(l) || items.length === 0) {
      items.push(l.replace(/^\+\s*|^\d+[.)]\s*/, '').trim());
    } else {
      items[items.length - 1] = `${items[items.length - 1]} ${l}`.trim();
    }
  }
  return items.filter(Boolean);
}

function parseSwiftAmount(s: string): { currency: string | null; amount: number | null } {
  const m = s.replace(/\s+/g, ' ').match(/([A-Z]{3})\s?([0-9][0-9.,\s]*)/);
  if (!m) return { currency: null, amount: parseFinancialAmount(s) };
  let num = m[2].replace(/\s/g, '');
  if (/^\d+,\d{0,2}$/.test(num)) num = num.replace(',', '.');
  else num = num.replace(/,/g, '');
  const n = parseFloat(num);
  return { currency: m[1], amount: isNaN(n) ? null : n };
}

function fld(value: any, snippet: string | null): ExtractedFieldItem {
  return { value: value === undefined ? null : value, source_snippet: value === null || value === undefined ? null : snippet };
}

/** Exact, tag-based MT700 (+MT701) parser. Returns normalised values with verbatim snippets. */
export function parseMT700(text: string): ExtractedFieldsMap {
  const blocks = splitMT700Blocks(text);
  const get = (...tags: string[]) => blocks.filter((b) => tags.includes(b.tag));
  const first = (...tags: string[]) => get(...tags)[0];
  const joined = (b?: MT700Block) => (b ? b.lines.join(' ').replace(/\s+/g, ' ').trim() : '');
  const out: ExtractedFieldsMap = {};

  const b20 = first('20');
  out.lc_number = fld(b20 ? b20.lines[0] || null : null, b20?.snippet || null);

  const b31c = first('31C');
  out.issue_date = fld(b31c ? toIsoDate(joined(b31c)) : null, b31c?.snippet || null);

  const b31d = first('31D');
  if (b31d) {
    const v = joined(b31d);
    const m = v.match(/^(\d{6})\s*(.*)$/);
    out.expiry_date = fld(m ? toIsoDate(m[1]) : toIsoDate(v), b31d.snippet);
    out.expiry_place = fld(m && m[2] ? m[2].replace(/^[,\s]+/, '').trim() : null, b31d.snippet);
  }

  const b32 = first('32B', '32A');
  if (b32) {
    const { currency, amount } = parseSwiftAmount(joined(b32));
    out.amount = fld(amount, b32.snippet);
    out.currency = fld(currency, b32.snippet);
  }
  out.lc_amount = out.amount || fld(null, null);

  const b39 = first('39A');
  if (b39) {
    const v = joined(b39);
    const m = v.match(/^(\d{1,3})\s*\/\s*(\d{1,3})/);
    out.quantity_tolerance = fld(m ? `+${+m[1]}% / -${+m[2]}%` : v, b39.snippet);
  }

  const party = (b?: MT700Block) => (b ? b.lines.filter((l) => !/^\//.test(l)).join(', ').replace(/\s+/g, ' ').trim() : null);
  const b50 = first('50');
  out.applicant = fld(party(b50), b50?.snippet || null);
  const b59 = first('59');
  out.beneficiary = fld(party(b59), b59?.snippet || null);

  // Issuing bank: field 52a, else the SENDER header line, else the FIN {2:} block BIC
  const b52 = first('52A', '52D');
  const sender = (text.match(/^\s*SENDER\s*:\s*(.+)$/im) || [])[1];
  const fin = (text.match(/\{2:[IO]700(?:\d{10})?([A-Z]{6}[A-Z0-9]{2})/) || [])[1];
  if (b52) out.issuing_bank = fld(party(b52), b52.snippet);
  else if (sender) out.issuing_bank = fld(sender.replace(/^[A-Z0-9]{8,11}\s+/, '').replace(/\s*\(FICTIONAL\)\s*$/i, '').trim(), sender.trim());
  else if (fin) out.issuing_bank = fld(fin, fin);

  const bPol = first('44E', '44A');
  out.port_of_loading = fld(bPol ? joined(bPol) : null, bPol?.snippet || null);
  const bPod = first('44F', '44B');
  out.port_of_discharge = fld(bPod ? joined(bPod) : null, bPod?.snippet || null);

  const b44c = first('44C');
  out.latest_shipment_date = fld(b44c ? toIsoDate(joined(b44c)) : null, b44c?.snippet || null);
  const b44d = first('44D');
  if (b44d) out.shipment_period = fld(joined(b44d), b44d.snippet);

  const goods = get('45A', '45B');
  out.goods_description = fld(goods.length ? goods.map(joined).join(' ').trim() : null, goods.map((b) => b.snippet).join('\n') || null);

  const docs = get('46A', '46B');
  const docItems = splitSwiftList(docs.flatMap((b) => b.lines));
  out.required_documents = fld(docItems.length ? docItems.map((d) => `+${d}`).join('\n') : null, docs.map((b) => b.snippet).join('\n') || null);

  const conds = get('47A', '47B');
  const condItems = splitSwiftList(conds.flatMap((b) => b.lines));
  out.additional_conditions = fld(condItems.length ? condItems.map((d) => `+${d}`).join('\n') : null, conds.map((b) => b.snippet).join('\n') || null);

  const insItem = docItems.find((d) => /INSURANCE/i.test(d));
  const pct = insItem?.match(/(\d{2,3})\s*(?:PCT|PERCENT|%)/i);
  if (pct) {
    out.insurance_percentage_required = fld(`${pct[1]}%`, docs.map((b) => b.snippet).join('\n'));
  } else {
    // Insurance clause written outside 46A (e.g. in 47A or free text)
    const line = text.split(/\r?\n/).find((l) => /INSURANCE/i.test(l) && /\d{2,3}\s*(?:PCT|PERCENT|%)/i.test(l));
    const m = line?.match(/(\d{2,3})\s*(?:PCT|PERCENT|%)/i);
    out.insurance_percentage_required = fld(m ? `${m[1]}%` : null, m ? line!.trim() : null);
  }

  const b43p = first('43P');
  out.partial_shipments_allowed = fld(b43p ? toAllowedBoolean(joined(b43p)) : null, b43p?.snippet || null);
  const b43t = first('43T');
  out.transshipment_allowed = fld(b43t ? toAllowedBoolean(joined(b43t)) : null, b43t?.snippet || null);

  const b48 = first('48');
  if (b48) {
    const m = joined(b48).match(/(\d{1,3})/);
    out.presentation_period = fld(m ? Number(m[1]) : null, b48.snippet);
  } else {
    out.presentation_period = { value: null, source_snippet: null };
  }
  return out;
}

/** Ensures every defined field exists (null when absent) and carries its label. */
export function completeFieldMap(docType: DocumentType, fields: ExtractedFieldsMap): ExtractedFieldsMap {
  const defs = FIELD_DEFINITIONS[docType] || FIELD_DEFINITIONS.OTHER;
  const out: ExtractedFieldsMap = { ...fields };
  for (const def of defs) {
    out[def.key] = out[def.key]
      ? { ...out[def.key], label: def.label }
      : { value: null, source_snippet: null, label: def.label };
  }
  return out;
}

const AMOUNT_KEYS = new Set(['amount', 'lc_amount', 'total_amount', 'invoice_amount', 'sum_insured_amount']);
const BOOLEAN_KEYS = new Set(['partial_shipments_allowed', 'transshipment_allowed']);

/**
 * Normalises values returned by Gemini (or regex) so the rule engine can rely on them:
 * dates -> YYYY-MM-DD, amounts -> numbers, allowed/not allowed -> booleans, presentation period -> days.
 * Values that cannot be read are kept as text (the engine then reports "could not read").
 */
export function normalizeExtractedFields(docType: DocumentType, fields: ExtractedFieldsMap): ExtractedFieldsMap {
  const out: ExtractedFieldsMap = {};
  for (const [key, item] of Object.entries(fields || {})) {
    if (!item || typeof item !== 'object') continue;
    let value: any = item.value;
    if (typeof value === 'string' && value.trim() === '') value = null;
    if (value !== null && value !== undefined) {
      if (/(^|_)date$|^date$/.test(key) && typeof value === 'string') {
        value = toIsoDate(value) || value;
      } else if (AMOUNT_KEYS.has(key)) {
        const n = parseFinancialAmount(value);
        if (n !== null) value = n;
      } else if (BOOLEAN_KEYS.has(key)) {
        const b = toAllowedBoolean(value);
        if (b !== null) value = b;
      } else if (key === 'presentation_period') {
        const m = String(value).match(/(\d{1,3})/);
        if (m) value = Number(m[1]);
      } else if (Array.isArray(value)) {
        value = value.map((v) => String(v)).join('\n');
      } else if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
    }
    out[key] = { ...item, value: value ?? null, source_snippet: value === null || value === undefined ? null : item.source_snippet ?? null };
  }
  if (docType === 'LETTER_OF_CREDIT' && out.amount && !out.lc_amount) out.lc_amount = out.amount;
  if (docType === 'COMMERCIAL_INVOICE' && out.total_amount) {
    out.amount = out.amount || out.total_amount;
  }
  return completeFieldMap(docType, out);
}

/** True if at least one field carries a real value. */
export function hasAnyExtractedValue(fields?: ExtractedFieldsMap | null): boolean {
  if (!fields) return false;
  return Object.values(fields).some((f) => f && f.value !== null && f.value !== undefined && String(f.value).trim() !== '');
}

/**
 * Merges two field maps: values from `primary` win; `secondary` fills fields that are empty in primary.
 */
export function mergeFieldMaps(primary: ExtractedFieldsMap, secondary: ExtractedFieldsMap): ExtractedFieldsMap {
  const out: ExtractedFieldsMap = { ...secondary };
  for (const [k, v] of Object.entries(primary || {})) {
    if (v && v.value !== null && v.value !== undefined && String(v.value).trim() !== '') out[k] = v;
    else if (!out[k]) out[k] = v;
  }
  return out;
}

/** Detects the document type from its content (and file name as a last resort). */
export function detectDocumentType(text?: string | null, fileName?: string | null): DocumentType {
  const t = (text || '').slice(0, 4000).toUpperCase();
  // SWIFT tags (:20: + :32B:/:46A:/:45A:) mean a credit, whatever else the page mentions
  if (/:20:/.test(t) && /:(32B|46A|45A|31D):/.test(t)) return 'LETTER_OF_CREDIT';
  const checks: [DocumentType, RegExp][] = [
    ['LETTER_OF_CREDIT', /:20:|:32B:|DOCUMENTARY CREDIT|\bMT ?700\b/],
    ['INSURANCE_CERTIFICATE', /INSURANCE (CERTIFICATE|POLICY)|COVER NOTE|SUM INSURED|AMOUNT INSURED|MARINE CARGO INSURANCE/],
    ['CERTIFICATE_OF_ORIGIN', /CERTIFICATE OF ORIGIN|COUNTRY OF ORIGIN/],
    ['BILL_OF_LADING', /BILL OF LADING|\bB\/L\b|SHIPPED ON BOARD|PORT OF LOADING[\s\S]{0,400}CONSIGNEE/],
    ['PACKING_LIST', /PACKING LIST/],
    ['INSPECTION_CERTIFICATE', /CERTIFICATE OF INSPECTION|INSPECTION CERTIFICATE|PHYTOSANITARY/],
    ['COMMERCIAL_INVOICE', /COMMERCIAL INVOICE|\bINVOICE\b/],
  ];
  // Prefer the title (first lines) of the document
  const head = t.slice(0, 600);
  for (const [type, re] of checks) if (re.test(head) && type !== 'LETTER_OF_CREDIT') return type;
  for (const [type, re] of checks) if (re.test(t)) return type;
  const n = (fileName || '').toLowerCase();
  if (/invoice|\binv\b/.test(n)) return 'COMMERCIAL_INVOICE';
  if (/lading|\bb\/?l\b/.test(n)) return 'BILL_OF_LADING';
  if (/packing/.test(n)) return 'PACKING_LIST';
  if (/origin|\bcoo\b/.test(n)) return 'CERTIFICATE_OF_ORIGIN';
  if (/insur/.test(n)) return 'INSURANCE_CERTIFICATE';
  if (/inspect|phyto/.test(n)) return 'INSPECTION_CERTIFICATE';
  return 'OTHER';
}

/** Minimal shape of the LC used by the UI (mirrors LCDocumentData). */
export interface LCCoreData {
  lcNumber: string;
  issuingBank: string;
  applicant: string;
  beneficiary: string;
  currency: string;
  amount: number;
  expiryDate: string;
  expiryPlace: string;
  latestShipmentDate: string;
  presentationPeriodDays: number;
  partialShipment: 'ALLOWED' | 'PROHIBITED';
  transshipment: 'ALLOWED' | 'PROHIBITED';
  portOfLoading: string;
  portOfDischarge: string;
  descriptionOfGoods: string;
  requiredDocuments: string[];
  additionalConditions: string[];
}

/**
 * Single source of truth for the LC: builds the Form values from the extracted fields so that
 * the Fields tab, the Raw MT700 tab and the Form tab always show the same data.
 */
export function buildLCData<T extends Partial<LCCoreData>>(fields: ExtractedFieldsMap, base: T): T & LCCoreData {
  const str = (k: string) => {
    const v = fields?.[k]?.value;
    return v === null || v === undefined ? '' : String(v);
  };
  const amount = parseFinancialAmount(fields?.amount?.value ?? fields?.lc_amount?.value);
  const partial = toAllowedBoolean(fields?.partial_shipments_allowed?.value);
  const trans = toAllowedBoolean(fields?.transshipment_allowed?.value);
  const period = Number(String(fields?.presentation_period?.value ?? '').match(/\d+/)?.[0] || 0);
  const list = (k: string, fallback?: string[]) => {
    const v = str(k);
    if (!v) return fallback || [];
    return splitSwiftList(v.split(/\n/));
  };
  return {
    ...base,
    lcNumber: str('lc_number') || base.lcNumber || '',
    issuingBank: str('issuing_bank') || base.issuingBank || '',
    applicant: str('applicant') || base.applicant || '',
    beneficiary: str('beneficiary') || base.beneficiary || '',
    currency: normalizeCurrency(str('currency') || base.currency || 'USD'),
    amount: amount ?? base.amount ?? 0,
    expiryDate: toIsoDate(str('expiry_date')) || base.expiryDate || '',
    expiryPlace: str('expiry_place') || base.expiryPlace || '',
    latestShipmentDate: toIsoDate(str('latest_shipment_date')) || base.latestShipmentDate || '',
    presentationPeriodDays: period || base.presentationPeriodDays || 21,
    partialShipment: partial === null ? (base.partialShipment || 'ALLOWED') : partial ? 'ALLOWED' : 'PROHIBITED',
    transshipment: trans === null ? (base.transshipment || 'ALLOWED') : trans ? 'ALLOWED' : 'PROHIBITED',
    portOfLoading: str('port_of_loading') || base.portOfLoading || '',
    portOfDischarge: str('port_of_discharge') || base.portOfDischarge || '',
    descriptionOfGoods: str('goods_description') || base.descriptionOfGoods || '',
    requiredDocuments: list('required_documents', base.requiredDocuments),
    additionalConditions: list('additional_conditions', base.additionalConditions),
  } as T & LCCoreData;
}

/** Builds a clean MT700 text from the Form values (used when the user edits the Form tab). */
export function lcDataToMT700(lc: Partial<LCCoreData>): string {
  const yymmdd = (iso?: string) => {
    const d = toIsoDate(iso || '');
    return d ? d.slice(2, 4) + d.slice(5, 7) + d.slice(8, 10) : '';
  };
  const amount = typeof lc.amount === 'number' && !Number.isNaN(lc.amount) ? lc.amount.toFixed(2).replace('.', ',') : '';
  const lines: string[] = [':27: 1/1', ':40A: IRREVOCABLE'];
  if (lc.lcNumber) lines.push(`:20: ${lc.lcNumber}`);
  if (lc.expiryDate) lines.push(`:31D: ${yymmdd(lc.expiryDate)} ${(lc.expiryPlace || '').toUpperCase()}`.trimEnd());
  if (lc.issuingBank) lines.push(`:52A: ${lc.issuingBank}`);
  if (lc.applicant) lines.push(`:50: ${lc.applicant}`);
  if (lc.beneficiary) lines.push(`:59: ${lc.beneficiary}`);
  if (amount) lines.push(`:32B: ${(lc.currency || 'USD').toUpperCase()} ${amount}`);
  if (lc.partialShipment) lines.push(`:43P: ${lc.partialShipment}`);
  if (lc.transshipment) lines.push(`:43T: ${lc.transshipment}`);
  if (lc.portOfLoading) lines.push(`:44E: ${lc.portOfLoading}`);
  if (lc.portOfDischarge) lines.push(`:44F: ${lc.portOfDischarge}`);
  if (lc.latestShipmentDate) lines.push(`:44C: ${yymmdd(lc.latestShipmentDate)}`);
  if (lc.descriptionOfGoods) lines.push(`:45A: ${lc.descriptionOfGoods}`);
  const plus = (s: string) => (s.trim().startsWith('+') ? s.trim() : `+ ${s.trim()}`);
  if (lc.requiredDocuments?.length) lines.push(':46A:', ...lc.requiredDocuments.filter((s) => s.trim()).map(plus));
  if (lc.additionalConditions?.length) lines.push(':47A:', ...lc.additionalConditions.filter((s) => s.trim()).map(plus));
  if (lc.presentationPeriodDays) lines.push(`:48: ${lc.presentationPeriodDays} DAYS AFTER SHIPMENT DATE BUT WITHIN LC VALIDITY`);
  return lines.join('\n');
}

/**
 * Prepares an LC for examination/display: extracted fields come from the given fields if present,
 * otherwise from the exact MT700 parser over the raw text; the Form values are rebuilt from those fields.
 */
export function prepareLC<T extends Partial<LCCoreData> & { rawText?: string; extractedFields?: ExtractedFieldsMap }>(lc: T): T & LCCoreData {
  const fields = hasAnyExtractedValue(lc.extractedFields)
    ? normalizeExtractedFields('LETTER_OF_CREDIT', lc.extractedFields as ExtractedFieldsMap)
    : extractFieldsWithDeterministicRules('LETTER_OF_CREDIT', lc.rawText || '');
  return buildLCData(fields, { ...lc, extractedFields: fields });
}

/** Same for a shipping document. */
export function prepareDocument<T extends { type: DocumentType; rawText?: string; extractedFields?: ExtractedFieldsMap }>(doc: T): T {
  const fields = hasAnyExtractedValue(doc.extractedFields)
    ? normalizeExtractedFields(doc.type, doc.extractedFields as ExtractedFieldsMap)
    : extractFieldsWithDeterministicRules(doc.type, doc.rawText || '');
  return { ...doc, extractedFields: fields };
}
