import { GEMINI_CONFIG } from '../config/geminiConfig.ts';

/**
 * Checks whether an error is a 429 / quota exhaustion / rate-limit error.
 */
export function isRateLimitOrQuotaError(err: any): boolean {
  if (!err) return false;
  if (err.status === 429 || err.statusCode === 429) return true;
  if (err.error?.code === 429 || err.error?.status === 'RESOURCE_EXHAUSTED') return true;
  const msg = String(err.message || err.error?.message || err);
  return /429|quota|rate\s*limit|resource_exhausted|too\s*many\s*requests/i.test(msg);
}

export interface RetryOptions {
  maxRetries?: number;
  initialBackoffMs?: number;
  contextName?: string;
  onRetry?: (message: string, delayMs: number, attempt: number) => void;
  sleepFn?: (ms: number) => Promise<void>;
}

/**
 * Calls a Gemini API function with fast, controlled retry on 429 / quota errors.
 * Does not block for minutes if quota limit is exhausted.
 */
export async function callGeminiWithRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? GEMINI_CONFIG.maxRetries;
  const initialBackoffMs = options.initialBackoffMs ?? GEMINI_CONFIG.initialBackoffMs;
  const contextName = options.contextName ?? 'Gemini API';
  const sleep = options.sleepFn ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation(attempt);
    } catch (err: any) {
      lastError = err;
      const isQuota = isRateLimitOrQuotaError(err);

      // If error details indicate a long retry delay (> 10s), do not wait
      const retryDelayViolation = err?.error?.details?.find?.((d: any) => d['@type']?.includes('RetryInfo'));
      const retryDelayStr = retryDelayViolation?.retryDelay;
      if (retryDelayStr && parseInt(retryDelayStr, 10) > 10) {
        throw err;
      }

      if (!isQuota || attempt >= maxRetries) {
        throw err;
      }

      const exponentialDelay = initialBackoffMs * Math.pow(2, attempt - 1);
      const delayMs = Math.min(exponentialDelay, 2000);

      const friendlyMessage = `Busy, retrying... (Attempt ${attempt} of ${maxRetries} for ${contextName}; waiting ${(delayMs / 1000).toFixed(1)}s)`;
      console.warn(`[Gemini Backoff] ${friendlyMessage}`);

      if (options.onRetry) {
        options.onRetry(friendlyMessage, delayMs, attempt);
      }

      await sleep(delayMs);
    }
  }

  throw lastError;
}

/**
 * Helper to pause execution between consecutive document operations.
 */
export async function delayBetweenDocuments(ms = GEMINI_CONFIG.interDocumentDelayMs): Promise<void> {
  if (ms > 0) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
