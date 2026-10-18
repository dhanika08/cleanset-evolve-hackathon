import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkShipmentAndPresentationDates,
  verifyInvoiceCalculations,
  verifyCrossDocumentWeights,
  verifyContainerNumbers,
  verifyInvoiceGoodsDescriptionMatch,
} from './complianceRules.ts';

test('checkShipmentAndPresentationDates passes for timely shipment and presentation', () => {
  const result = checkShipmentAndPresentationDates({
    latestShipmentDate: '2026-11-15',
    blOnBoardDate: '2026-11-10',
    lcExpiryDate: '2026-12-05',
    presentationDate: '2026-11-20',
    presentationPeriodDays: 21,
  });

  assert.equal(result.isShippedOnTime, true);
  assert.equal(result.isPresentedWithinPeriod, true);
  assert.equal(result.isPresentedBeforeExpiry, true);
  assert.equal(result.errors.length, 0);
});

test('checkShipmentAndPresentationDates flags late shipment past Field 44C', () => {
  const result = checkShipmentAndPresentationDates({
    latestShipmentDate: '2026-11-15',
    blOnBoardDate: '2026-11-18', // 3 days late
    lcExpiryDate: '2026-12-05',
    presentationDate: '2026-11-20',
    presentationPeriodDays: 21,
  });

  assert.equal(result.isShippedOnTime, false);
  assert.ok(result.errors.some((err) => err.includes('Late shipment')));
});

test('checkShipmentAndPresentationDates flags stale presentation over 21 days', () => {
  const result = checkShipmentAndPresentationDates({
    latestShipmentDate: '2026-11-15',
    blOnBoardDate: '2026-11-01',
    lcExpiryDate: '2026-12-05',
    presentationDate: '2026-11-25', // 24 days later
    presentationPeriodDays: 21,
  });

  assert.equal(result.isPresentedWithinPeriod, false);
  assert.ok(result.errors.some((err) => err.includes('Stale presentation')));
});

test('verifyInvoiceCalculations detects math discrepancy in item line and grand total', () => {
  const lineItems = [
    { description: 'Item A', quantity: 100, unitPrice: 25.50, total: 2550.00 },
    { description: 'Item B', quantity: 50, unitPrice: 40.00, total: 2100.00 }, // 50 * 40 = 2000, mismatch!
  ];
  const claimedTotal = 4650.00; // sum of mistaken totals

  const result = verifyInvoiceCalculations(lineItems, claimedTotal, 'USD');
  assert.equal(result.isAccurate, false);
  assert.ok(result.discrepancies.length > 0);
  assert.ok(result.discrepancies.some((d) => d.includes('Item B')));
});

test('verifyCrossDocumentWeights catches mismatch between PL and BL', () => {
  const result = verifyCrossDocumentWeights({
    packingListGrossWeight: 12500,
    blGrossWeight: 12050,
  });

  assert.equal(result.isMatching, false);
  assert.equal(result.differenceKg, 450);
  assert.ok(result.message?.includes('Weight discrepancy'));
});

test('verifyCrossDocumentWeights passes when weights match', () => {
  const result = verifyCrossDocumentWeights({
    packingListGrossWeight: 18450,
    blGrossWeight: 18450,
  });

  assert.equal(result.isMatching, true);
  assert.equal(result.differenceKg, 0);
});

test('verifyContainerNumbers detects missing container in Bill of Lading', () => {
  const plContainers = ['MSKU9281742', 'TGHU1827490'];
  const blContainers = ['MSKU9281742']; // missing second container

  const result = verifyContainerNumbers(plContainers, blContainers);
  assert.equal(result.isMatching, false);
  assert.deepEqual(result.missingInBL, ['TGHU1827490']);
});

test('verifyInvoiceGoodsDescriptionMatch detects missing crucial keywords', () => {
  const lcDesc = '100% Combed Cotton Mens T-Shirts GSM 180 Color Navy Blue and White as per Proforma Invoice 9821';
  const invDesc = 'Mens T-Shirts 100% Polyester'; // totally wrong fabric and details

  const result = verifyInvoiceGoodsDescriptionMatch(lcDesc, invDesc);
  assert.equal(result.isMatch, false);
});
