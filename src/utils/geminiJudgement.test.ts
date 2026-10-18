import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  buildJudgementPrompt, 
  evaluateJudgementsFallback, 
  verifyJudgementFindings,
  type JudgementEngineInput 
} from './geminiJudgement.ts';
import { extractFieldsWithDeterministicRules } from './fieldExtractor.ts';

test('buildJudgementPrompt constructs prompt with real extracted fields without inventing fields', () => {
  const lcFields = extractFieldsWithDeterministicRules('LETTER_OF_CREDIT', `:20: LC/2026/EUR/88921\n:45A: 15,000 PCS OF 100% COMBED RINGSPUN COTTON MEN'S KNITTED POLO SHIRTS\n:44C: 261010`);
  const invFields = extractFieldsWithDeterministicRules('COMMERCIAL_INVOICE', `Invoice No: EXP-441\nDescription of Goods: 15,000 PCS Men's Knitted Polo Shirts\nTotal Amount: EUR 148,500.00\nGross Weight: 12,500.00 KGS`);
  const blFields = extractFieldsWithDeterministicRules('BILL_OF_LADING', `B/L No: MSKU8829\nSaid to Contain: 15,000 PCS Cotton Polo Shirts\nGross Weight: 12,050.00 KGS`);

  const input: JudgementEngineInput = {
    lc: { title: 'Letter of Credit MT700', fields: lcFields },
    documents: [
      { docType: 'COMMERCIAL_INVOICE', title: 'Commercial Invoice #EXP-441', fields: invFields },
      { docType: 'BILL_OF_LADING', title: 'Bill of Lading MSKU8829', fields: blFields },
    ],
  };

  const prompt = buildJudgementPrompt(input);
  assert.equal(prompt.includes('TASK: Perform Gemini Trade Finance Judgement Step'), true);
  assert.equal(prompt.includes('COMMERCIAL_INVOICE'), true);
  assert.equal(prompt.includes('BILL_OF_LADING'), true);
  assert.equal(prompt.includes('goods_description'), true);
});

test('evaluateJudgementsFallback detects invoice discrepancy (Art 18c) and transport document general term acceptance (Art 14e)', () => {
  const lcText = `:20: LC/2026/EUR/88921
:32B: EUR 148500,00
:45A: 15,000 PCS OF 100% COMBED RINGSPUN COTTON MEN'S KNITTED POLO SHIRTS AS PER PROFORMA INVOICE PFI-092.
:44E: CHITTAGONG PORT
:44F: HAMBURG PORT`;

  const invText = `COMMERCIAL INVOICE
Invoice No: EXP-INV-2026-441
Description of Goods:
15,000 PCS Men's Knitted Polo Shirts
Total Amount: EUR 148,500.00
Gross Weight: 12,500.00 KGS
Port of Loading: Chittagong Port`;

  const blText = `OCEAN BILL OF LADING
B/L Number: MSKU88291040
Consignee: To Order of Deutsche Bank AG, Hamburg Branch, Germany
Said to Contain: 15,000 PCS Cotton Polo Shirts
Gross Weight: 12,050.00 KGS
Port of Loading: Chittagong Port`;

  const plText = `PACKING LIST
Invoice Ref: EXP-INV-2026-441
Total Quantity: 15,000 PCS
Gross Weight: 12,500.00 KGS`;

  const lcFields = extractFieldsWithDeterministicRules('LETTER_OF_CREDIT', lcText);
  const invFields = extractFieldsWithDeterministicRules('COMMERCIAL_INVOICE', invText);
  const blFields = extractFieldsWithDeterministicRules('BILL_OF_LADING', blText);
  const plFields = extractFieldsWithDeterministicRules('PACKING_LIST', plText);

  const input: JudgementEngineInput = {
    lc: { title: 'Letter of Credit', fields: lcFields },
    documents: [
      { docType: 'COMMERCIAL_INVOICE', title: 'Commercial Invoice', fields: invFields },
      { docType: 'BILL_OF_LADING', title: 'Ocean Bill of Lading', fields: blFields },
      { docType: 'PACKING_LIST', title: 'Packing List', fields: plFields },
    ],
  };

  const results = evaluateJudgementsFallback(input);

  // 1. Must contain discrepancy on Gross Weight (12,500 KG on PL vs 12,050 KG on BL) under Art 14(d)
  const weightJudgement = results.find((j) => j.cites.some((c) => c.field === 'gross_weight'));
  assert.ok(weightJudgement);
  assert.equal(weightJudgement?.verdict, 'discrepancy');
  assert.equal(weightJudgement?.source, 'Rule (AI unavailable)');
  assert.equal(weightJudgement?.ucp_article.includes('14(d)'), true);

  // 2. Must contain acceptable result for consignee under Art 14(d) / 20(a)(v)
  const consigneeJudgement = results.find((j) => j.cites.some((c) => c.field === 'consignee'));
  assert.ok(consigneeJudgement);
  assert.equal(consigneeJudgement?.verdict, 'acceptable');
  assert.equal(consigneeJudgement?.source, 'Rule (AI unavailable)');
});

test('verifyJudgementFindings preserves valid findings with evidence and discards findings with missing/null fields', () => {
  const lcFields = extractFieldsWithDeterministicRules('LETTER_OF_CREDIT', `:20: LC/2026/EUR/88921\n:45A: 10,000 PCS OF 100% COMBED COTTON POLO SHIRTS`);
  const invFields = extractFieldsWithDeterministicRules('COMMERCIAL_INVOICE', `Invoice No: EXP-441\nDescription of Goods: 10,000 PCS Cotton Shirts\nTotal Amount: EUR 148,500.00`);

  const input: JudgementEngineInput = {
    lc: { title: 'Letter of Credit', fields: lcFields },
    documents: [
      { docType: 'COMMERCIAL_INVOICE', title: 'Commercial Invoice', fields: invFields },
    ],
  };

  const sampleJudgements: any[] = [
    // 1. Valid finding: cites existing LC goods_description and Invoice goods_description
    {
      verdict: 'acceptable',
      title: 'Valid description comparison',
      explanation: 'Under Art 14(d) both descriptions refer to shirts',
      ucp_article: 'UCP 600 Art 14(d)',
      cites: [
        { document: 'Letter of Credit', field: 'goods_description' },
        { document: 'Commercial Invoice', field: 'goods_description' },
      ],
      source: 'Judgement',
    },
    // 2. Invalid finding (hallucinated field): cites missing "hs_code" on invoice
    {
      verdict: 'discrepancy',
      title: 'Hallucinated HS code mismatch',
      explanation: 'HS code 6105.10 missing from invoice',
      ucp_article: 'UCP 600 Art 14(d)',
      cites: [
        { document: 'Commercial Invoice', field: 'hs_code' },
        { document: 'Letter of Credit', field: 'goods_description' },
      ],
      source: 'Judgement',
    },
    // 3. Invalid finding (hallucinated document): cites a document that does not exist
    {
      verdict: 'discrepancy',
      title: 'Missing phytosanitary inspection certificate clause',
      explanation: 'Fumigation stamp is absent',
      ucp_article: 'ISBP 821',
      cites: [
        { document: 'Phytosanitary Certificate', field: 'inspection_date' },
      ],
      source: 'Judgement',
    },
    // 4. Invalid finding (null/empty field): cites a field that exists in schema but is null
    {
      verdict: 'discrepancy',
      title: 'Container number check',
      explanation: 'Container number mismatch',
      ucp_article: 'UCP 600 Art 14(d)',
      cites: [
        { document: 'Commercial Invoice', field: 'container_numbers' }, // null in invFields
      ],
      source: 'Judgement',
    },
  ];

  const result = verifyJudgementFindings(sampleJudgements, input);

  // 1. Only 1 finding should survive
  assert.equal(result.verifiedJudgements.length, 1);
  const surviving = result.verifiedJudgements[0];
  assert.equal(surviving.title, 'Valid description comparison');
  assert.equal(surviving.source, 'Judgement');
  assert.ok(surviving.evidence);
  assert.equal(surviving.evidence.length, 2);
  assert.ok(surviving.evidence[0].source_snippet);
  assert.ok(surviving.evidence[1].source_snippet);

  // 2. Exactly 3 findings should be discarded
  assert.equal(result.discardedFindings.length, 3);

  // Check discarded reasons and missing cites
  const discardedHs = result.discardedFindings.find((d: any) => d.title.includes('HS code'));
  assert.ok(discardedHs);
  assert.ok(discardedHs.reason.includes('hs_code'));
  assert.equal(discardedHs.missingCites[0].field, 'hs_code');

  const discardedPhyto = result.discardedFindings.find((d: any) => d.title.includes('phytosanitary'));
  assert.ok(discardedPhyto);
  assert.ok(discardedPhyto.reason.includes('Phytosanitary Certificate'));

  const discardedContainer = result.discardedFindings.find((d: any) => d.title.includes('Container'));
  assert.ok(discardedContainer);
  assert.ok(discardedContainer.reason.includes('container_numbers'));
});

