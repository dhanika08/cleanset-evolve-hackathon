import test from 'node:test';
import assert from 'node:assert/strict';
import { extractFieldsWithDeterministicRules } from './fieldExtractor.ts';

test('extracts Letter of Credit fields with exact source snippet', () => {
  const lcText = `
:20: LC/2026/EUR/88921
:31D: 261120 DHAKA, BANGLADESH
:32B: EUR 148500,00
:44E: CHITTAGONG PORT, BANGLADESH
:44F: HAMBURG PORT, GERMANY
:44C: 261010
:43P: PROHIBITED
:43T: ALLOWED
:45A: 15,000 PCS OF 100% COMBED RINGSPUN COTTON MEN'S KNITTED POLO SHIRTS.
:48: 21 DAYS AFTER SHIPMENT DATE
+ INSURANCE POLICY FOR 110 PCT CIF
`;

  const fields = extractFieldsWithDeterministicRules('LETTER_OF_CREDIT', lcText);

  // LC Number
  assert.equal(fields.lc_number.value, 'LC/2026/EUR/88921');
  assert.ok(fields.lc_number.source_snippet?.includes(':20: LC/2026/EUR/88921'));

  // Dates
  assert.equal(fields.expiry_date.value, '2026-11-20');
  assert.ok(fields.expiry_date.source_snippet?.includes(':31D: 261120'));

  assert.equal(fields.latest_shipment_date.value, '2026-10-10');
  assert.ok(fields.latest_shipment_date.source_snippet?.includes(':44C: 261010'));

  // Ports
  assert.equal(fields.port_of_loading.value, 'CHITTAGONG PORT, BANGLADESH');
  assert.equal(fields.port_of_discharge.value, 'HAMBURG PORT, GERMANY');

  // Amount & Currency
  assert.equal(fields.amount.value, 148500);
  assert.equal(fields.currency.value, 'EUR');

  // Partial shipment & transshipment
  assert.equal(fields.partial_shipments_allowed.value, false);
  assert.equal(fields.transshipment_allowed.value, true);

  // Insurance %
  assert.equal(fields.insurance_percentage_required.value, '110%');
});

test('extracts Commercial Invoice fields with exact source snippet', () => {
  const invText = `
COMMERCIAL INVOICE
Apex Global Textiles Ltd
Invoice No: EXP-INV-2026-441
Date: 11 October 2026
LC Reference: LC/2026/EUR/88921
Bill To: Hanseatic Fashion Retailers GmbH
Total Amount: EUR 148,500.00
Gross Weight: 12,500.00 KGS
Net Weight: 11,800.00 KGS
Incoterm: CIF Hamburg
`;

  const fields = extractFieldsWithDeterministicRules('COMMERCIAL_INVOICE', invText);

  assert.equal(fields.invoice_number.value, 'EXP-INV-2026-441');
  assert.ok(fields.invoice_number.source_snippet?.includes('EXP-INV-2026-441'));

  assert.equal(fields.total_amount.value, 148500);
  assert.ok(fields.total_amount.source_snippet?.includes('148,500.00'));

  assert.equal(fields.gross_weight.value, '12,500.00 KGS');
  assert.ok(fields.gross_weight.source_snippet?.includes('12,500.00 KGS'));

  assert.equal(String(fields.incoterm.value).includes('CIF'), true);
});

test('returns null value and null source_snippet for missing fields without guessing', () => {
  const bareText = `
PACKING LIST
Date: 10 October 2026
Packages: 50 Cartons
`;

  const fields = extractFieldsWithDeterministicRules('PACKING_LIST', bareText);

  assert.equal(fields.gross_weight.value, null);
  assert.equal(fields.gross_weight.source_snippet, null);

  assert.equal(fields.container_numbers.value, null);
  assert.equal(fields.container_numbers.source_snippet, null);
});
