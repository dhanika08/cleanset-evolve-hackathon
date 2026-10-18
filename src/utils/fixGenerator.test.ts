import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 
  determineFixType, 
  generateDiscrepancyFix, 
  buildFinalSummaryCard 
} from './fixGenerator.ts';
import type { Finding, LCDocumentData } from '../types/compliance.ts';

test('determineFixType correctly marks typo and internal errors as Corrected text', () => {
  const typoFinding = {
    title: 'Goods Description Incomplete (Missing Combed Specification)',
    description: 'Commercial Invoice description does not strictly correspond with LC Field 45A',
    ruleCitation: 'UCP 600 Article 18(c)',
    targetDoc: 'Commercial Invoice',
  };
  const result = determineFixType(typoFinding);
  assert.equal(result.fixType, 'CORRECTED_TEXT');
  assert.equal(result.canBeHonestlyCorrected, true);
  assert.match(result.reason, /internal document/i);
});

test('determineFixType correctly marks weight mismatch as Corrected text', () => {
  const weightFinding = {
    title: 'Gross Weight Discrepancy Between Packing List and Bill of Lading',
    description: 'Packing list declares 12,500 KG while B/L indicates 12,050 KG',
    ruleCitation: 'UCP 600 Article 14(d)',
    targetDoc: 'Packing List',
  };
  const result = determineFixType(weightFinding);
  assert.equal(result.fixType, 'CORRECTED_TEXT');
  assert.equal(result.canBeHonestlyCorrected, true);
});

test('determineFixType correctly marks late shipment as LC amendment request', () => {
  const lateShipment = {
    title: 'Late Shipment (On-Board Date Exceeds Latest Shipment Date)',
    description: 'B/L indicates Shipped On Board on 12 October 2026, which is after Field 44C 10 October 2026',
    ruleCitation: 'UCP 600 Article 20(a)(ii)',
    targetDoc: 'Bill of Lading',
  };
  const result = determineFixType(lateShipment);
  assert.equal(result.fixType, 'LC_AMENDMENT_REQUEST');
  assert.equal(result.canBeHonestlyCorrected, false);
  assert.match(result.reason, /cannot legally or ethically be backdated/i);
});

test('determineFixType correctly marks stale presentation as LC amendment request', () => {
  const staleFinding = {
    title: 'Stale Presentation (Over 21 Days)',
    description: 'Presentation submitted 24 days after shipped on board date',
    ruleCitation: 'UCP 600 Article 14(c)',
    targetDoc: 'Transport Document',
  };
  const result = determineFixType(staleFinding);
  assert.equal(result.fixType, 'LC_AMENDMENT_REQUEST');
  assert.equal(result.canBeHonestlyCorrected, false);
});

test('generateDiscrepancyFix produces ready-to-copy corrected text for invoice description', () => {
  const mockLc: Partial<LCDocumentData> = {
    lcNumber: 'LC-TEST-999',
    issuingBank: 'Deutsche Bank Hamburg',
    applicant: 'EuroTextile GmbH',
    beneficiary: 'Apex Apparel Ltd',
    amount: 185000,
    currency: 'USD',
    descriptionOfGoods: '15,000 PCS OF 100% COMBED RINGSPUN COTTON MEN\'S KNITTED POLO SHIRTS',
  };

  const finding: Finding = {
    id: 'f-desc-1',
    severity: 'CRITICAL',
    title: 'Goods Description Incomplete (Missing Combed Specification)',
    description: 'Commercial invoice omitted combed ringspun cotton',
    ruleCitation: 'UCP 600 Article 18(c)',
    foundValue: 'Men\'s Knitted Polo Shirts',
    expectedValue: mockLc.descriptionOfGoods || '',
    remediation: 'Re-issue invoice with complete Field 45A text',
  };

  const fix = generateDiscrepancyFix(finding, mockLc, 'Commercial Invoice');
  assert.equal(fix.fixType, 'CORRECTED_TEXT');
  assert.equal(fix.fixTypeLabel, 'Corrected text');
  assert.ok(fix.copyableContent.length > 50);
  assert.match(fix.copyableContent, /COMBED RINGSPUN COTTON/);
  assert.equal(fix.canBeHonestlyCorrected, true);
});

test('generateDiscrepancyFix produces ready-to-send email for late shipment LC amendment', () => {
  const mockLc: Partial<LCDocumentData> = {
    lcNumber: 'LC-TEST-999',
    issuingBank: 'Deutsche Bank Hamburg',
    applicant: 'EuroTextile GmbH',
    beneficiary: 'Apex Apparel Ltd',
    amount: 185000,
    currency: 'USD',
  };

  const finding: Finding = {
    id: 'f-late-1',
    severity: 'CRITICAL',
    title: 'Late Shipment (On-Board Date Exceeds Latest Shipment Date)',
    description: 'Shipment sailed on 12 October 2026',
    ruleCitation: 'UCP 600 Article 20(a)(ii)',
    foundValue: '12 October 2026',
    expectedValue: '10 October 2026',
    remediation: 'Request buyer amendment',
  };

  const fix = generateDiscrepancyFix(finding, mockLc, 'Bill of Lading');
  assert.equal(fix.fixType, 'LC_AMENDMENT_REQUEST');
  assert.equal(fix.fixTypeLabel, 'LC amendment request');
  assert.ok(fix.emailSubject);
  assert.match(fix.emailSubject || '', /URGENT.*MT707.*LC-TEST-999/);
  assert.match(fix.emailBody || '', /Field 44C/);
  assert.match(fix.copyableContent, /EuroTextile GmbH/);
});

test('buildFinalSummaryCard calculates metrics correctly', () => {
  const card = buildFinalSummaryCard({
    discrepanciesCount: 3,
    durationMs: 1400,
    lcAmount: 185000,
    lcCurrency: 'USD',
    lcAdditionalConditions: ['A discrepancy fee of USD 75.00 will be deducted from the proceeds.'],
    reissuableCount: 2,
    amendmentCount: 1,
  });

  assert.equal(card.discrepanciesCaught, 3);
  assert.equal(card.timeTakenFormatted, '1.4s');
  assert.match(card.estimatedBankRefusalAvoided, /USD 185,000\.00/);
  assert.match(card.discrepancyFeeSaved, /USD 75\.00/);
  assert.equal(card.reissuableFixesCount, 2);
  assert.equal(card.amendmentRequestsCount, 1);
});
