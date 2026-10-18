# CleanSet: demo-ready changes

## Run it

```bash
npm install
cp .env.example .env        # add GEMINI_API_KEY=...   (optional: GEMINI_MODEL=gemini-2.5-flash)
npm run dev                 # http://localhost:3000
npm test                    # 49 tests, including exact discrepancy counts for the 3 samples
npm run build && NODE_ENV=production npm start   # production / Cloud Run
```

The app works **without** a Gemini key or when Gemini is down. In that case the rule engine and the
rule-based cross-document checks run, and the result says "AI review: unavailable" or "off" instead of
pretending AI ran.

## What was broken and what changed

| Problem | Fix | Files |
|---|---|---|
| "Google AI stopped working". A model name that doesn't exist or isn't enabled for the key, plus silent failures | If the model returns "not found", the server tries `gemini-3.1-flash-lite`, then `gemini-3-flash-preview`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`, and keeps the first one that answers. You can force a model with `GEMINI_MODEL`. `/api/health` shows the model in use and the last Gemini error | `server.ts`, `src/config/geminiConfig.ts` |
| Possible white screen: the browser imported `geminiConfig.ts`, which reads `process.env` | Config is now server-only; the UI asks `/api/health` for the model | `App.tsx`, `Navbar.tsx`, `FinalSummaryCardSection.tsx` |
| Hard-coded baseline examination (fake "Combed"/weight findings, `gemini-4-argon`, 1.4 s, "+39 rules") | Removed. Every number now comes from the actual run | `server.ts`, `ResultsScreen.tsx`, `PrintableReport.tsx` |
| Discrepancy count differed between the verdict, the cards and the summary (duplicates; one finding attached to 2 documents) | New `examinationPipeline.ts`: each discrepancy is counted once and attached to one document. An AI finding that repeats a rule finding is shown as "Same as a rule finding • not counted again". The verdict, badges, score, summary card, PDF report and fix list all use `result.totalDiscrepancies` | `src/utils/examinationPipeline.ts`, results components |
| The Fields, Raw MT700 and Form tabs disagreed | One source of truth: `buildLCData()` builds the Form from the fields. Editing the Raw MT700 re-parses it; editing the Form updates the fields and regenerates the MT700 | `fieldExtractor.ts`, `UploadScreen.tsx`, `App.tsx` |
| MT700 parsing failed on labelled print-outs, PDF advices (label on the line after the tag), FIN `{4:` blocks, and MT701 | Exact tag parser `parseMT700()`. A structured LC is parsed in code, with no AI cost and no hallucination risk | `fieldExtractor.ts` |
| PDF text where each label sits on its own line was misread (dates, totals, weights, buyer) | Layout-aware fallback extractor | `fieldExtractor.ts` |
| Missing 46A/47A checks | New rules: freight prepaid/collect, consignee "to the order of", signed invoice, HS code, pro-forma invoice, insurance cover note, currency, ICC (A/B/C), claims place, chamber-issued certificate of origin, credit number on every document (47A). Insurance amount and insurance date are now separate findings | `deterministicEngine.ts` |
| Unreadable photos/scans produced invented discrepancies | Rules on unreadable documents become "Not checked" and the verdict becomes **INCOMPLETE** | `examinationPipeline.ts`, `fieldExtractor.ts` |
| Two B/Ls compared against the packing list one at a time | Gross weights of all B/Ls are summed | `deterministicEngine.ts`, `geminiJudgement.ts` |
| An AI "conflict" between equal numbers | The verifier discards it (shown in "Discarded findings") | `geminiJudgement.ts` |
| A wrong file in Slot 1 (invoice, MT707) was accepted silently | A warning is shown | `UploadScreen.tsx` |
| A document type couldn't be fixed when the file name was unclear | The type is detected from the content, and changing it in the dropdown re-extracts the fields | `UploadScreen.tsx` |
| "LC amendments needed" always showed 0 | Wrong fix-type constant corrected | `FinalSummaryCardSection.tsx` |

## Verified

- Samples: Garments **4**, Auto-Dubai **0**, Coffee **2**, identical with Gemini on, Gemini down (503) and no key.
- Test pack D-00 to D-16, rules only (no AI): D-00, D-01 and D-12 are clean (no false alarms). These cases match the expected count exactly: D-02 (3), D-03 (3), D-04 (2), D-05 (3), D-06 (1), D-07 (4), D-08 (2), D-10 (2), D-11 (1), D-13 (1) and D-14 (2).
  - D-09 gives 2 of 3. The package count (52 vs 50) is left to Gemini.
  - D-15 and D-16 (photos) give INCOMPLETE without AI. With Gemini on, the photos are read by vision.
- LC inputs: PDF, TXT, FIN, MT700+MT701 and the EUR LC all parse to the same values.
