import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callGeminiWithRetry, isRateLimitOrQuotaError } from './geminiRetry.ts';

test('isRateLimitOrQuotaError detects 429 status and quota strings', () => {
  assert.equal(isRateLimitOrQuotaError({ status: 429 }), true);
  assert.equal(isRateLimitOrQuotaError({ error: { code: 429 } }), true);
  assert.equal(isRateLimitOrQuotaError(new Error('RESOURCE_EXHAUSTED: quota exceeded')), true);
  assert.equal(isRateLimitOrQuotaError(new Error('Rate limit exceeded: 429')), true);
  assert.equal(isRateLimitOrQuotaError(new Error('Syntax error')), false);
  assert.equal(isRateLimitOrQuotaError(null), false);
});

test('callGeminiWithRetry succeeds immediately on successful operation', async () => {
  let callCount = 0;
  const result = await callGeminiWithRetry(async () => {
    callCount++;
    return 'success-payload';
  });

  assert.equal(result, 'success-payload');
  assert.equal(callCount, 1);
});

test('callGeminiWithRetry retries with exponential backoff on 429 and succeeds', async () => {
  let callCount = 0;
  const retryMessages: string[] = [];
  const sleepCalls: number[] = [];

  const result = await callGeminiWithRetry(
    async (attempt) => {
      callCount++;
      if (attempt < 3) {
        const quotaError = new Error('429 RESOURCE_EXHAUSTED: quota limit reached');
        (quotaError as any).status = 429;
        throw quotaError;
      }
      return 'recovered-after-backoff';
    },
    {
      maxRetries: 4,
      initialBackoffMs: 10,
      contextName: 'Test Extraction',
      onRetry: (msg) => retryMessages.push(msg),
      sleepFn: async (ms) => {
        sleepCalls.push(ms);
      },
    }
  );

  assert.equal(result, 'recovered-after-backoff');
  assert.equal(callCount, 3);
  assert.equal(retryMessages.length, 2);
  assert.ok(retryMessages[0].includes('Busy, retrying...'));
  assert.equal(sleepCalls.length, 2);
  // First sleep delay >= 10ms, second sleep delay >= 20ms
  assert.ok(sleepCalls[0] >= 10);
  assert.ok(sleepCalls[1] >= 20);
});

test('callGeminiWithRetry stops after maxRetries (4 tries) if 429 persists', async () => {
  let callCount = 0;
  const sleepCalls: number[] = [];

  await assert.rejects(
    async () => {
      await callGeminiWithRetry(
        async () => {
          callCount++;
          const err = new Error('Quota 429');
          (err as any).status = 429;
          throw err;
        },
        {
          maxRetries: 4,
          initialBackoffMs: 5,
          sleepFn: async (ms) => {
            sleepCalls.push(ms);
          },
        }
      );
    },
    /Quota 429/
  );

  assert.equal(callCount, 4);
  assert.equal(sleepCalls.length, 3);
});
