import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFileContentHash,
  getCachedExtraction,
  setCachedExtraction,
  clearExtractionCache,
  getExtractionCacheStats,
} from './extractionCache.ts';

test('computeFileContentHash produces deterministic hash for identical content', () => {
  const hash1 = computeFileContentHash('COMMERCIAL_INVOICE', 'Invoice No: 12345, Total: USD 50,000');
  const hash2 = computeFileContentHash('COMMERCIAL_INVOICE', 'Invoice No: 12345, Total: USD 50,000');
  assert.equal(hash1, hash2);
  assert.equal(typeof hash1, 'string');
  assert.equal(hash1.length, 64);
});

test('computeFileContentHash produces different hash for different content', () => {
  const hash1 = computeFileContentHash('COMMERCIAL_INVOICE', 'Invoice No: 12345');
  const hash2 = computeFileContentHash('COMMERCIAL_INVOICE', 'Invoice No: 99999');
  assert.notEqual(hash1, hash2);
});

test('cache stores and returns extraction without calling external functions', () => {
  clearExtractionCache();
  const fileContent = 'LC Number: LC-2026-CH-88219\nAmount: USD 185,000';
  const hash = computeFileContentHash('LETTER_OF_CREDIT', fileContent);

  assert.equal(getCachedExtraction(hash), undefined);

  const mockExtraction = {
    lc_number: { value: 'LC-2026-CH-88219', source_snippet: 'LC-2026-CH-88219', label: 'LC Number' },
    amount: { value: 185000, source_snippet: 'USD 185,000', label: 'Amount' },
  };

  setCachedExtraction(hash, mockExtraction);

  const cached = getCachedExtraction(hash);
  assert.deepEqual(cached, mockExtraction);

  const stats = getExtractionCacheStats();
  assert.equal(stats.hits, 1);
  assert.equal(stats.misses, 1);
  assert.equal(stats.size, 1);
});
