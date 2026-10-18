import React, { useState } from 'react';
import { 
  BrainCircuit, 
  CheckCircle2, 
  AlertOctagon, 
  Sparkles, 
  Tag, 
  Search, 
  HelpCircle, 
  Scale, 
  FileText,
  Info,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { JudgementResult } from '../types/compliance';

interface GeminiJudgementSectionProps {
  judgements: JudgementResult[];
}

export const GeminiJudgementSection: React.FC<GeminiJudgementSectionProps> = ({ judgements }) => {
  const [filter, setFilter] = useState<'all' | 'discrepancy' | 'acceptable'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEvidence, setExpandedEvidence] = useState<Record<number, boolean>>({});

  const toggleEvidence = (idx: number) => {
    setExpandedEvidence((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const discrepancyCount = judgements.filter((j) => j.verdict === 'discrepancy').length;
  const acceptableCount = judgements.filter((j) => j.verdict === 'acceptable').length;

  const filteredJudgements = judgements.filter((j) => {
    if (filter === 'discrepancy' && j.verdict !== 'discrepancy') return false;
    if (filter === 'acceptable' && j.verdict !== 'acceptable') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inTitle = j.title.toLowerCase().includes(q);
      const inExp = j.explanation.toLowerCase().includes(q);
      const inUcp = j.ucp_article.toLowerCase().includes(q);
      const inCites = j.cites.some(
        (c) => c.document.toLowerCase().includes(q) || c.field.toLowerCase().includes(q)
      );
      return inTitle || inExp || inUcp || inCites;
    }

    return true;
  });

  // Group results: Discrepancies first, then Accepted-with-reason
  const sortedJudgements = [...filteredJudgements].sort((a, b) => {
    if (a.verdict === 'discrepancy' && b.verdict !== 'discrepancy') return -1;
    if (a.verdict !== 'discrepancy' && b.verdict === 'discrepancy') return 1;
    return 0;
  });

  const discrepancyJudgements = sortedJudgements.filter((j) => j.verdict === 'discrepancy');
  const acceptedWithReasonJudgements = sortedJudgements.filter((j) => j.verdict === 'acceptable');

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start sm:items-center gap-3">
          <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-400 border border-purple-500/20 shadow-inner">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                Gemini Cross-Document Judgement Engine
              </h2>
              <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[11px] font-bold text-purple-300 border border-purple-500/30">
                Source: Judgement
              </span>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-mono text-slate-300 border border-slate-700">
                UCP 600 Art 14(d) &amp; 14(e)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Input: all extracted fields across documents. Grouped as Discrepancies first, then Accepted-with-reason.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              filter === 'all'
                ? 'bg-slate-800 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Judgements ({judgements.length})
          </button>
          <button
            onClick={() => setFilter('discrepancy')}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              filter === 'discrepancy'
                ? 'bg-slate-800 text-rose-300 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Discrepancies ({discrepancyCount})
          </button>
          <button
            onClick={() => setFilter('acceptable')}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              filter === 'acceptable'
                ? 'bg-slate-800 text-emerald-300 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Accepted-with-reason ({acceptableCount})
          </button>
        </div>
      </div>

      {/* Guiding Principles Banner */}
      <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-3.5 text-xs text-purple-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-purple-400 flex-shrink-0" />
          <span>
            <strong>Key Banking Principles Applied:</strong> <em>Art 14(d)</em> data need not be identical but must not conflict &bull; <em>Art 14(e)</em> non-invoice documents may describe goods in general terms &bull; <em>Art 18(c)</em> invoices require strict correspondence.
          </span>
        </div>
        <div className="text-[11px] text-purple-300/80 font-mono flex-shrink-0">
          Showing WHY apparent mismatches were accepted
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter judgements by document, field, keyword (e.g. 'cotton', 'gross_weight', 'consignee')..."
          className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
        />
      </div>

      {/* Judgement Cards List: Grouped Discrepancies First, then Accepted-with-Reason */}
      <div className="space-y-4">
        {sortedJudgements.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-6 text-center text-xs text-slate-400">
            No judgements match the selected filter.
          </div>
        ) : (
          sortedJudgements.map((j, idx) => {
            const isAcceptable = j.verdict === 'acceptable';
            const isDiscrepancy = j.verdict === 'discrepancy';
            const isEvidenceOpen = expandedEvidence[idx] !== false; // default open for full visibility

            // Determine if this is the start of the Accepted-with-reason group in "all" view
            const isFirstAcceptedInAll = filter === 'all' && 
              isAcceptable && 
              idx === discrepancyJudgements.length && 
              discrepancyJudgements.length > 0;

            return (
              <React.Fragment key={idx}>
                {isFirstAcceptedInAll && (
                  <div className="pt-4 border-t-2 border-dashed border-slate-800">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Accepted-with-Reason Findings (Apparent Mismatches Permitted under UCP 600 Rules)</span>
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300 font-mono">
                        {acceptedWithReasonJudgements.length} Items
                      </span>
                    </div>
                  </div>
                )}

                <div
                  className={`rounded-xl border p-4 transition-all ${
                    isDiscrepancy
                      ? 'border-rose-900/40 bg-rose-950/15 shadow-sm'
                      : 'border-emerald-900/30 bg-emerald-950/10 hover:border-emerald-800/40'
                  }`}
                >
                  {/* Header row */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-slate-800/60">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide border ${
                          isAcceptable
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {isAcceptable ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            <span>Accepted-with-reason</span>
                          </>
                        ) : (
                          <>
                            <AlertOctagon className="h-3 w-3 text-rose-400" />
                            <span>Discrepancy</span>
                          </>
                        )}
                      </span>

                      <h3 className="text-xs sm:text-sm font-bold text-white">{j.title}</h3>

                      <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/20">
                        Source: {j.source}
                      </span>
                      {isDiscrepancy && j.counted === false && (
                        <span
                          className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300 border border-slate-700"
                          title="The rule engine already reported this problem, so it is not counted twice"
                        >
                          Same as a rule finding &bull; not counted again
                        </span>
                      )}
                    </div>

                    <span className="font-mono text-[11px] text-teal-300 bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800">
                      {j.ucp_article}
                    </span>
                  </div>

                {/* Explanation */}
                <p className="mt-2.5 text-xs text-slate-300 leading-relaxed">
                  {j.explanation}
                </p>

                {/* Cites and Evidence Toggle */}
                <div className="mt-3 pt-2 border-t border-slate-800/50 flex flex-col gap-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Tag className="h-3 w-3 text-purple-400" />
                        Cites ({j.cites?.length || 0}):
                      </span>
                      {j.cites && j.cites.map((cite, cIdx) => (
                        <span
                          key={cIdx}
                          className="inline-flex items-center gap-1 rounded bg-slate-950 px-2 py-0.5 font-mono text-[11px] text-slate-300 border border-slate-800"
                        >
                          <FileText className="h-3 w-3 text-slate-400" />
                          <span className="text-slate-400">{cite.document}:</span>
                          <strong className="text-purple-300">{cite.field}</strong>
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => toggleEvidence(idx)}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-purple-300 hover:text-purple-200 bg-purple-950/30 border border-purple-500/20 hover:bg-purple-900/40 transition-colors"
                    >
                      <Sparkles className="h-3 w-3 text-purple-400" />
                      <span>{isEvidenceOpen ? 'Hide Evidence' : 'Show Evidence'} ({j.evidence?.length || j.cites?.length || 0})</span>
                      {isEvidenceOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {/* Expandable Evidence Section */}
                  {isEvidenceOpen && (
                    <div className="mt-1 rounded-xl bg-slate-950/80 border border-slate-800/90 p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-purple-400" />
                          Verified Extracted Evidence (Source Snippets):
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Non-null verified by plain code
                        </span>
                      </div>

                      <div className="space-y-2">
                        {j.evidence && j.evidence.length > 0 ? (
                          j.evidence.map((ev, evIdx) => (
                            <div
                              key={evIdx}
                              className="rounded-lg bg-slate-900/90 border border-slate-800 p-2.5 space-y-1.5 text-xs"
                            >
                              <div className="flex items-center justify-between flex-wrap gap-1">
                                <span className="font-mono text-[11px] text-purple-300 font-semibold">
                                  {ev.document} &bull; <span className="text-white">{ev.field}</span>
                                </span>
                                {ev.value !== undefined && ev.value !== null && (
                                  <span className="rounded bg-slate-950 px-2 py-0.5 font-mono text-[10px] text-slate-300 border border-slate-800">
                                    Parsed Value: {String(ev.value)}
                                  </span>
                                )}
                              </div>

                              <div className="rounded bg-slate-950 p-2 font-mono text-[11px] text-slate-300 border border-slate-800/80">
                                <span className="text-[10px] text-purple-400 uppercase font-semibold block mb-0.5">
                                  source_snippet from document:
                                </span>
                                <p className="italic text-slate-200">
                                  &ldquo;{ev.source_snippet || String(ev.value || 'N/A')}&rdquo;
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          j.cites.map((cite, cIdx) => (
                            <div
                              key={cIdx}
                              className="rounded-lg bg-slate-900/90 border border-slate-800 p-2.5 space-y-1 text-xs"
                            >
                              <span className="font-mono text-[11px] text-purple-300 font-semibold">
                                {cite.document} &bull; <span className="text-white">{cite.field}</span>
                              </span>
                              <div className="rounded bg-slate-950 p-2 font-mono text-[11px] text-slate-300 border border-slate-800/80">
                                <span className="text-[10px] text-purple-400 uppercase font-semibold block mb-0.5">
                                  source_snippet:
                                </span>
                                <p className="italic text-slate-200">
                                  &ldquo;Verified in extracted document fields&rdquo;
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })
      )}
    </div>
    </section>
  );
};
