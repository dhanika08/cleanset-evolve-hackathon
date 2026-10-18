/**
 * CleanSet Gemini configuration (SERVER ONLY).
 *
 * Do not import this file from React components: it reads process.env, which does not exist in the
 * browser. The UI gets the active model from GET /api/health.
 *
 * Model choice: set GEMINI_MODEL in the environment to override. If the configured model is not
 * available to the API key (404 / "not found" / "not supported"), the server automatically tries the
 * next model in GEMINI_MODEL_CANDIDATES and remembers the first one that works.
 */

const env: Record<string, string | undefined> =
  typeof process !== 'undefined' && process.env ? process.env : {};

const primary = env.GEMINI_MODEL || env.GEMINI_JUDGEMENT_MODEL || 'gemini-3.1-flash-lite';

export const GEMINI_MODEL_CANDIDATES: string[] = Array.from(
  new Set([primary, 'gemini-3.1-flash-lite', 'gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'].filter(Boolean))
);

export const GEMINI_CONFIG = {
  model: primary,
  extractionModel: env.GEMINI_EXTRACTION_MODEL || primary,
  fixesModel: env.GEMINI_FIXES_MODEL || primary,
  judgementModel: env.GEMINI_JUDGEMENT_MODEL || primary,

  // Temperature 0: same input gives the same output
  extractionTemperature: 0,
  judgementTemperature: 0,
  fixesTemperature: 0,

  interDocumentDelayMs: 0,

  // Timeouts (ms). A step that times out falls back to code and is reported as such in the result.
  extractionTimeoutMs: 45000,
  judgementTimeoutMs: 45000,
  fixesTimeoutMs: 30000,

  // Retry on 429 / quota errors
  maxRetries: 2,
  initialBackoffMs: 800,
};

export type GeminiConfig = typeof GEMINI_CONFIG;
