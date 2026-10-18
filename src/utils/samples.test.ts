import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_CONSIGNMENTS } from '../data/sampleConsignments.ts';
import { evaluateDeterministicRules } from './deterministicEngine.ts';
import { evaluateJudgementsFallback } from './geminiJudgement.ts';

test('Sample consignment compliance validation (deterministic & fallback judgement)', async (t) => {
  await t.test('auto-dubai has zero discrepancies', () => {
    const auto = SAMPLE_CONSIGNMENTS.find((s) => s.id === 'sample-auto-dubai');
    assert.ok(auto, 'Auto dubai sample exists');

    const rules = evaluateDeterministicRules({
      lc: auto.lc,
      documents: auto.documents,
      presentationDate: auto.presentationDate,
    });
    const ruleDiscrepancies = rules.filter((r) => r.status === 'DISCREPANCY');
    assert.strictEqual(ruleDiscrepancies.length, 0, 'Auto-dubai must have 0 deterministic discrepancies');

    const judgements = evaluateJudgementsFallback({
      lc: { title: auto.lc.lcNumber, fields: auto.lc.extractedFields || {} },
      documents: auto.documents.map((d) => ({
        id: d.id,
        title: d.title,
        docType: d.type as any,
        fields: d.extractedFields || {},
      })),
    });
    const judgementDiscrepancies = judgements.filter((j) => j.verdict === 'discrepancy');
    assert.strictEqual(judgementDiscrepancies.length, 0, 'Auto-dubai must have 0 fallback judgement discrepancies');
  });

  await t.test('garments includes late shipment and gross weight discrepancies', () => {
    const garments = SAMPLE_CONSIGNMENTS.find((s) => s.id === 'sample-garments-hamburg');
    assert.ok(garments, 'Garments sample exists');

    const rules = evaluateDeterministicRules({
      lc: garments.lc,
      documents: garments.documents,
      presentationDate: garments.presentationDate,
    });
    const ruleDiscrepancies = rules.filter((r) => r.status === 'DISCREPANCY');

    // Asserts late shipment
    const hasLateShipment = ruleDiscrepancies.some((r) => r.id === 'rule-shipment-date');
    assert.ok(hasLateShipment, 'Garments must include late shipment discrepancy');

    // Asserts gross weight
    const hasGrossWeight = ruleDiscrepancies.some((r) => r.id === 'rule-cross-document-weights');
    assert.ok(hasGrossWeight, 'Garments must include gross weight discrepancy');
  });

  await t.test('coffee includes partial shipment and insurance date discrepancies', () => {
    const coffee = SAMPLE_CONSIGNMENTS.find((s) => s.id === 'sample-coffee-rotterdam');
    assert.ok(coffee, 'Coffee sample exists');

    const rules = evaluateDeterministicRules({
      lc: coffee.lc,
      documents: coffee.documents,
      presentationDate: coffee.presentationDate,
    });
    const ruleDiscrepancies = rules.filter((r) => r.status === 'DISCREPANCY');

    // Asserts partial shipment
    const hasPartialShipment = ruleDiscrepancies.some((r) => r.id === 'rule-partial-shipment-art31');
    assert.ok(hasPartialShipment, 'Coffee must include partial shipment discrepancy');

    // Asserts insurance date
    const hasInsuranceDate = ruleDiscrepancies.some((r) => r.id === 'rule-insurance-date');
    assert.ok(hasInsuranceDate, 'Coffee must include insurance date discrepancy');
  });
});
