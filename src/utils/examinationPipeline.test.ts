import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_CONSIGNMENTS } from '../data/sampleConsignments.ts';
import { prepareLC, prepareDocument, lcDataToMT700, parseMT700 } from './fieldExtractor.ts';
import { evaluateDeterministicRules } from './deterministicEngine.ts';
import { evaluateJudgementsFallback, verifyJudgementFindings } from './geminiJudgement.ts';
import { assembleExamination } from './examinationPipeline.ts';
import type { JudgementResult, ShippingDocument } from '../types/compliance.ts';

/** Runs the same steps as POST /api/examine, with the AI step replaced by `judgements` (or the fallback). */
function runExamination(sample: (typeof SAMPLE_CONSIGNMENTS)[number], judgements?: JudgementResult[]) {
  const lc = prepareLC({ ...sample.lc, extractedFields: undefined });
  const documents = sample.documents.map((d) => prepareDocument(d)) as ShippingDocument[];
  const rules = evaluateDeterministicRules({ lc, documents, presentationDate: sample.presentationDate });
  const input = {
    lc: { title: 'LC', fields: lc.extractedFields || {}, requiredDocuments: lc.requiredDocuments, additionalConditions: lc.additionalConditions },
    documents: documents.map((d) => ({ id: d.id, docType: d.type, title: d.title, fields: d.extractedFields || {}, rawText: d.rawText })),
  };
  const v = verifyJudgementFindings(judgements ?? evaluateJudgementsFallback(input), input);
  return assembleExamination({
    lc,
    documents,
    presentationDate: sample.presentationDate,
    rules,
    judgements: v.verifiedJudgements,
    discardedFindings: v.discardedFindings,
    aiStatus: { extraction: 'off', judgement: judgements ? 'gemini' : 'fallback', fixes: 'off' },
    modelUsed: 'test',
    durationMs: 1,
  });
}

for (const sample of SAMPLE_CONSIGNMENTS) {
  test(`sample ${sample.id}: verdict and every count agree (${sample.expectedDiscrepancyCount} discrepancies)`, () => {
    const r = runExamination(sample);
    const listed = r.documentAudits.reduce((n, a) => n + a.findings.length, 0);
    const perAuditCounts = r.documentAudits.reduce((n, a) => n + a.discrepancyCount, 0);
    const ruleDiscrepancies = (r.ruleEvaluations || []).filter((x) => x.status === 'DISCREPANCY').length;

    assert.equal(r.totalDiscrepancies, sample.expectedDiscrepancyCount);
    assert.equal(listed, r.totalDiscrepancies, 'findings listed per document = total');
    assert.equal(perAuditCounts, r.totalDiscrepancies, 'document badges = total');
    assert.equal(r.finalSummary?.discrepanciesCaught, r.totalDiscrepancies, 'final summary card = total');
    assert.equal(r.remediationPlan.length, r.totalDiscrepancies, 'one fix per discrepancy');
    assert.equal(r.ruleDiscrepancyCount + r.aiDiscrepancyCount, r.totalDiscrepancies);
    assert.equal(ruleDiscrepancies, r.ruleDiscrepancyCount, 'rule section count = rule share of total');
    assert.equal(r.status, sample.expectedOutcome === 'CLEAN' ? 'CLEAN' : 'DISCREPANCIES_FOUND');
    for (const a of r.documentAudits) {
      assert.equal(a.status, a.findings.length ? 'Discrepancy Identified' : 'Pass');
    }
  });
}

test('an AI judgement repeating a rule finding is shown but not counted twice', () => {
  const garments = SAMPLE_CONSIGNMENTS.find((s) => s.id === 'sample-garments-hamburg')!;
  const dup: JudgementResult = {
    verdict: 'discrepancy',
    title: 'Gross weight conflict between packing list and bill of lading',
    explanation: 'Packing list gross weight differs from the bill of lading gross weight.',
    ucp_article: 'UCP 600 Art 14(d)',
    source: 'Judgement',
    cites: [
      { document: 'Packing List #PL-441', field: 'gross_weight' },
      { document: 'Ocean Bill of Lading #OSLU88291040', field: 'gross_weight' },
    ],
  };
  const r = runExamination(garments, [dup]);
  assert.equal(r.totalDiscrepancies, 4);
  const j = (r.judgements || []).find((x) => x.title === dup.title);
  if (j) assert.equal(j.counted, false);
});

test('a new AI finding is added once and counted', () => {
  const auto = SAMPLE_CONSIGNMENTS.find((s) => s.id === 'sample-auto-dubai')!;
  const extra: JudgementResult = {
    verdict: 'discrepancy',
    title: 'Packing list shows a different number of cartons than the bill of lading',
    explanation: 'Package count differs between documents.',
    ucp_article: 'UCP 600 Art 14(d)',
    source: 'Judgement',
    cites: [{ document: auto.documents.find((d) => d.type === 'PACKING_LIST')!.title, field: 'packages_count' }],
  };
  const r = runExamination(auto, [extra, { ...extra }]);
  assert.ok(r.totalDiscrepancies <= 1);
  assert.equal(r.totalDiscrepancies, r.documentAudits.reduce((n, a) => n + a.findings.length, 0));
  assert.equal(r.status, r.totalDiscrepancies ? 'DISCREPANCIES_FOUND' : 'CLEAN');
});

test('an unreadable document makes the verdict INCOMPLETE and invents no findings for it', () => {
  const auto = SAMPLE_CONSIGNMENTS.find((s) => s.id === 'sample-auto-dubai')!;
  const broken = {
    ...auto,
    documents: auto.documents.map((d) => (d.type === 'COMMERCIAL_INVOICE' ? { ...d, rawText: '[PDF document: scan.pdf]', extractedFields: undefined } : d)),
  };
  const r = runExamination(broken);
  assert.equal(r.status, 'INCOMPLETE');
  const inv = r.documentAudits.find((a) => a.docType === 'COMMERCIAL_INVOICE')!;
  assert.equal(inv.findings.length, 0);
});

test('LC: Fields, Form and Raw MT700 stay in sync (form -> MT700 -> fields round trip)', () => {
  for (const s of SAMPLE_CONSIGNMENTS) {
    const a = prepareLC({ ...s.lc, extractedFields: undefined });
    const b = prepareLC({ rawText: lcDataToMT700(a) });
    for (const k of ['lcNumber', 'currency', 'amount', 'expiryDate', 'latestShipmentDate', 'presentationPeriodDays', 'partialShipment', 'transshipment', 'portOfLoading', 'portOfDischarge'] as const) {
      assert.equal(String(b[k]).toUpperCase(), String(a[k]).toUpperCase(), `${s.id} ${k}`);
    }
    assert.equal(b.requiredDocuments.length, a.requiredDocuments.length);
    assert.equal(b.additionalConditions.length, a.additionalConditions.length);
  }
});

test('LC: labelled print-out, raw FIN block and pasted text all parse the same', () => {
  const labelled = `MT700 ISSUE OF A DOCUMENTARY CREDIT
:20: Documentary Credit Number
     MGB/ILC/26/30715
:31C: Date of Issue
     260901
:31D: Date and Place of Expiry
     261115 DUBAI
:32B: Currency Code, Amount
     USD87500,00
:43P: Partial Shipments
     NOT ALLOWED
:44C: Latest Date of Shipment
     261015
:48: Period for Presentation in Days
     21`;
  const fin = `{1:F01MGBKAEADXXX0000000000}{2:O7001200260901MGBKAEADXXXX}{4:
:20:MGB/ILC/26/30715
:31C:260901
:31D:261115DUBAI
:32B:USD87500,00
:43P:NOT ALLOWED
:44C:261015
:48:21
-}`;
  for (const text of [labelled, fin]) {
    const f = parseMT700(text);
    assert.equal(f.lc_number.value, 'MGB/ILC/26/30715');
    assert.equal(f.expiry_date.value, '2026-11-15');
    assert.equal(f.latest_shipment_date.value, '2026-10-15');
    assert.equal(f.amount.value, 87500);
    assert.equal(f.currency.value, 'USD');
    assert.equal(f.partial_shipments_allowed.value, false);
    assert.equal(Number(String(f.presentation_period.value).match(/\d+/)?.[0]), 21);
  }
});
