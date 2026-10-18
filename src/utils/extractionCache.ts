import crypto from 'node:crypto';
import type { ExtractedFieldsMap } from '../types/compliance.ts';

/**
 * In-memory cache for extracted document fields, keyed by content hash.
 * Ensures re-running the same file never calls Gemini again.
 */
const cache = new Map<string, ExtractedFieldsMap>();
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Computes a deterministic SHA-256 hash of a document's content and type.
 * Works with text content, base64 payloads, or combined files.
 */
export function computeFileContentHash(
  docType: string,
  rawText?: string | null,
  fileBase64?: string | null
): string {
  const hasher = crypto.createHash('sha256');
  hasher.update(`type:${docType || 'OTHER'}\n`);
  
  if (rawText && rawText.trim().length > 0) {
    hasher.update(`raw:${rawText.trim()}\n`);
  }
  
  if (fileBase64 && fileBase64.length > 0) {
    // Strip metadata prefix if present and hash binary content
    const cleanB64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
    hasher.update(`b64:${cleanB64}\n`);
  }

  return hasher.digest('hex');
}

/**
 * Retrieves cached extraction results if available.
 */
export function getCachedExtraction(hash: string): ExtractedFieldsMap | undefined {
  if (!hash) return undefined;
  const result = cache.get(hash);
  if (result) {
    cacheHits++;
  } else {
    cacheMisses++;
  }
  return result;
}

/**
 * Stores extraction results in cache keyed by content hash.
 */
export function setCachedExtraction(hash: string, fields: ExtractedFieldsMap): void {
  if (!hash || !fields) return;
  cache.set(hash, fields);
}

/**
 * Checks if a document content hash is cached.
 */
export function hasCachedExtraction(hash: string): boolean {
  return cache.has(hash);
}

/**
 * Clears the extraction cache (useful for testing).
 */
export function clearExtractionCache(): void {
  cache.clear();
  cacheHits = 0;
  cacheMisses = 0;
}

/**
 * Returns cache diagnostics (hit count, miss count, size).
 */
export function getExtractionCacheStats(): { size: number; hits: number; misses: number } {
  return {
    size: cache.size,
    hits: cacheHits,
    misses: cacheMisses,
  };
}
