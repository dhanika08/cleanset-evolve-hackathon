import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDeterministicRules, type DeterministicEngineInput } from './deterministicEngine.ts';

test('Rule 1: flags late shipment when B/L date exceeds LC latest shipment date', () => {
  const input: DeterministicEngineInput = {
    lc: {
      latestShipmentDate: '2026-10-10',
      expiryDate: '2026-11-20',
      amount: 100000,
    },
    documents: [
      {
        id: 'bl-1',
        type: 'BILL_OF_LADING',
        title: 'Ocean B/L',
        extractedFields: {
          shipped_on_board_date: { value: '2026-10-12', source_snippet: 'Shipped On Board: 12 October 2026' },
        },
      },
    ],
  };

  const results = evaluateDeterministicRules(input);
  const rule = results.find((r) => r.id === 'rule-shipment-date');
  assert.ok(rule);
  assert.equal(rule.status, 'DISCREPANCY');
  assert.equal(rule.source, 'Rule');
  assert.equal(rule.ucp_article, 'UCP 600 Article 20(a)(ii) & ISBP 821');
  assert.ok(rule.explanation.includes('Late Shipment'));
});

test('Rule 2: passes presentation period when within 21 days', () => {
  const input: DeterministicEngineInput = {
    lc: {
      latestShipmentDate: '2026-10-10',
      expiryDate: '2026-11-20',
    },
    documents: [
      {
        id: 'bl-1',
        type: 'BILL_OF_LADING',
        title: 'Ocean B/L',
        extractedFields: {
          shipped_on_board_date: { value: '2026-10-05', source_snippet: 'On Board: 2026-10-05' },
        },
      },
    ],
    presentationDate: '2026-10-20', // 15 days later (<= 21 days)
  };

  const results = evaluateDeterministicRules(input);
  const rule = results.find((r) => r.id === 'rule-presentation-period');
  assert.ok(rule);
  assert.equal(rule.status, 'PASS');
  assert.equal(rule.source, 'Rule');
});

test('Rule 3: allows 10% tolerance for "about" and flags overdrawn invoice', () => {
  const inputWithTolerance: DeterministicEngineInput = {
    lc: {
      amount: 100000,
      currency: 'USD',
      descriptionOfGoods: 'About 1,000 MT of Wheat',
    },
    documents: [
      {
        id: 'inv-1',
        type: 'COMMERCIAL_INVOICE',
        title: 'Invoice',
        extractedFields: {
          total_amount: { value: 108000, source_snippet: 'Total: USD 108,000' }, // 8% over, within 10%
        },
      },
    ],
  };

  const passResults = evaluateDeterministicRules(inputWithTolerance);
  const rulePass = passResults.find((r) => r.id === 'rule-invoice-amount-tolerance');
  assert.ok(rulePass);
  assert.equal(rulePass.status, 'PASS');

  // Overdrawn past 10%
  inputWithTolerance.documents[0].extractedFields!.total_amount.value = 115000;
  const failResults = evaluateDeterministicRules(inputWithTolerance);
  const ruleFail = failResults.find((r) => r.id === 'rule-invoice-amount-tolerance');
  assert.ok(ruleFail);
  assert.equal(ruleFail.status, 'DISCREPANCY');
});

test('Rule 4: checks insurance coverage >= 110% of CIF and attachment date <= shipment date', () => {
  const inputLateInsurance: DeterministicEngineInput = {
    lc: {
      amount: 100000,
      requiredDocuments: ['Insurance Policy covering 110% CIF'],
    },
    documents: [
      {
        id: 'inv-1',
        type: 'COMMERCIAL_INVOICE',
        title: 'Invoice',
        extractedFields: { total_amount: { value: 100000, source_snippet: 'USD 100,000' } },
      },
      {
        id: 'bl-1',
        type: 'BILL_OF_LADING',
        title: 'Ocean B/L',
        extractedFields: { shipped_on_board_date: { value: '2026-10-10', source_snippet: '10 Oct 2026' } },
      },
      {
        id: 'ins-1',
        type: 'INSURANCE_CERTIFICATE',
        title: 'Insurance',
        extractedFields: {
          sum_insured_amount: { value: 110000, source_snippet: 'USD 110,000' }, // 110% OK
          effective_inception_date: { value: '2026-10-14', source_snippet: '14 Oct 2026' }, // 4 days after shipment!
        },
      },
    ],
  };

  const results = evaluateDeterministicRules(inputLateInsurance);
  const rule = results.find((r) => r.id === 'rule-insurance-date');
  assert.ok(rule);
  assert.equal(rule.status, 'DISCREPANCY');
  assert.ok(rule.explanation.includes('after the date of shipment'));
  assert.equal(rule.source, 'Rule');
});

test('Rule 5: verifies ports of loading and discharge match LC', () => {
  const input: DeterministicEngineInput = {
    lc: {
      portOfLoading: 'Chittagong Port, Bangladesh',
      portOfDischarge: 'Hamburg Port, Germany',
    },
    documents: [
      {
        id: 'bl-1',
        type: 'BILL_OF_LADING',
        title: 'Ocean B/L',
        extractedFields: {
          port_of_loading: { value: 'Chittagong Port', source_snippet: 'POL: Chittagong' },
          port_of_discharge: { value: 'Rotterdam Port', source_snippet: 'POD: Rotterdam' }, // Mismatch!
        },
      },
    ],
  };

  const results = evaluateDeterministicRules(input);
  const rule = results.find((r) => r.id === 'rule-ports-match');
  assert.ok(rule);
  assert.equal(rule.status, 'DISCREPANCY');
  assert.ok(rule.explanation.includes('Port of discharge'));
});

test('Rule 6: flags foul B/L containing damaged notation per Art 27', () => {
  const inputFoul: DeterministicEngineInput = {
    lc: {},
    documents: [
      {
        id: 'bl-1',
        type: 'BILL_OF_LADING',
        title: 'Ocean B/L',
        rawText: 'Carrier issued B/L: 50 Cartons observed with torn bags and wet stains.',
      },
    ],
  };

  const results = evaluateDeterministicRules(inputFoul);
  const rule = results.find((r) => r.id === 'rule-clean-transport-document');
  assert.ok(rule);
  assert.equal(rule.status, 'DISCREPANCY');
  assert.equal(rule.ucp_article, 'UCP 600 Article 27');
  assert.ok(rule.explanation.includes('Foul B/L Discrepancy'));
});

test('Rule 7: checks that invoice is made out to LC applicant per Art 18', () => {
  const input: DeterministicEngineInput = {
    lc: {
      applicant: 'Hanseatic Fashion Retailers GmbH, Hamburg',
    },
    documents: [
      {
        id: 'inv-1',
        type: 'COMMERCIAL_INVOICE',
        title: 'Invoice',
        extractedFields: {
          applicant_buyer: { value: 'Totally Different Company Inc', source_snippet: 'Bill to: Totally Different Company' },
        },
      },
    ],
  };

  const results = evaluateDeterministicRules(input);
  const rule = results.find((r) => r.id === 'rule-invoice-applicant');
  assert.ok(rule);
  assert.equal(rule.status, 'DISCREPANCY');
  assert.equal(rule.ucp_article, 'UCP 600 Article 18(a)(ii)');
});

test('Rule 8: flags expired LC if presentation date exceeds expiry date', () => {
  const input: DeterministicEngineInput = {
    lc: {
      expiryDate: '2026-11-20',
    },
    documents: [],
    presentationDate: '2026-11-25', // 5 days after expiry
  };

  const results = evaluateDeterministicRules(input);
  const rule = results.find((r) => r.id === 'rule-lc-expiry-at-presentation');
  assert.ok(rule);
  assert.equal(rule.status, 'DISCREPANCY');
  assert.equal(rule.ucp_article, 'UCP 600 Article 6(d)(i)');
});

test('Rule 9: checks mandatory document count and flags missing required documents', () => {
  const input: DeterministicEngineInput = {
    lc: {
      requiredDocuments: [
        '+ Signed Commercial Invoice',
        '+ Ocean Bill of Lading',
        '+ Packing List',
        '+ Certificate of Origin',
        '+ Insurance Policy',
      ],
    },
    documents: [
      { id: '1', type: 'COMMERCIAL_INVOICE', title: 'Commercial Invoice' },
      { id: '2', type: 'BILL_OF_LADING', title: 'Ocean Bill of Lading' },
      // Packing List, COO, and Insurance missing!
    ],
  };

  const results = evaluateDeterministicRules(input);
  // One discrepancy per missing document, so each one is counted and fixed separately
  const missing = results.filter((r) => r.id.startsWith('rule-required-document-') && r.status === 'DISCREPANCY');
  assert.equal(missing.length, 3);
  const text = missing.map((r) => r.explanation).join(' ');
  assert.ok(text.includes('Packing List'));
  assert.ok(text.includes('Certificate of Origin'));
  assert.ok(text.includes('Insurance Document'));
  assert.ok(missing.every((r) => r.source === 'Rule'));
});
