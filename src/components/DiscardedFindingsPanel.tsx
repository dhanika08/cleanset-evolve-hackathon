import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  CheckCircle2, 
  FileX2, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import type { DiscardedFinding } from '../types/compliance';

interface DiscardedFindingsPanelProps {
  discardedFindings?: DiscardedFinding[];
  survivingCount?: number;
  onSimulateHallucination?: () => void;
  onResetSimulation?: () => void;
  isSimulated?: boolean;
}

export const DiscardedFindingsPanel: React.FC<DiscardedFindingsPanelProps> = ({
  discardedFindings = [],
  survivingCount = 0,
  onSimulateHallucination,
  onResetSimulation,
  isSimulated = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(discardedFindings.length > 0);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const count = discardedFindings.length;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-lg overflow-hidden">
      {/* Panel Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className={`rounded-xl p-2.5 border shadow-inner ${
            count > 0 
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }`}>
            {count > 0 ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                Verification Step: Discarded Findings Debug Panel
              </h3>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-mono text-cyan-300 border border-slate-700">
                Deterministic Guard
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                count > 0 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {count} Discarded
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Every Judgement finding is verified in plain code. If any cited document or field is missing or null, the finding is discarded to guarantee 0 hallucinations.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onSimulateHallucination && !isSimulated && (
            <button
              onClick={onSimulateHallucination}
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-950/40 px-2.5 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-900/50 transition-colors shadow-sm"
              title="Test the plain-code verification step with a candidate finding citing missing data"
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              <span>Simulate Hallucination</span>
            </button>
          )}

          {isSimulated && onResetSimulation && (
            <button
              onClick={onResetSimulation}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <span>{isExpanded ? 'Collapse' : 'Expand Debug Details'}</span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4 bg-slate-950/40">
          {count === 0 ? (
            <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/10 p-4 text-xs text-emerald-300 flex items-start sm:items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="font-bold text-white">
                  All {survivingCount} Judgement Findings Passed Plain-Code Verification
                </p>
                <p className="text-emerald-300/90 mt-0.5">
                  Every cited {'{document, field}'} exists in the extracted document data with a confirmed, non-null value and verified source snippet. Zero hallucinated findings were detected or discarded.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 text-xs text-amber-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  <span>
                    <strong>Anti-Hallucination Guard Triggered:</strong> {count} candidate finding(s) cited missing, unextracted, or null fields. They were safely discarded before reaching the bank officer examination report.
                  </span>
                </div>
              </div>

              {discardedFindings.map((df, idx) => {
                const isOpen = expandedItems[df.id] !== false;
                return (
                  <div
                    key={df.id || idx}
                    className="rounded-xl border border-amber-900/30 bg-slate-950 p-4 space-y-2.5 transition-all shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30 uppercase tracking-wide">
                          DISCARDED FINDING
                        </span>
                        {df.verdict && (
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-700">
                            Candidate Verdict: {df.verdict}
                          </span>
                        )}
                        <h4 className="text-xs sm:text-sm font-bold text-white">{df.title}</h4>
                      </div>

                      <button
                        onClick={() => toggleItem(df.id)}
                        className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 self-start sm:self-auto"
                      >
                        <span>{isOpen ? 'Hide Discard Reason' : 'Show Discard Reason'}</span>
                        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    {isOpen && (
                      <div className="space-y-2.5 text-xs pt-1">
                        {/* Reason Box */}
                        <div className="rounded-lg bg-amber-950/20 border border-amber-900/30 p-2.5 text-amber-200">
                          <strong className="text-amber-300 block mb-0.5">Verification Discard Reason:</strong>
                          <span>{df.reason}</span>
                        </div>

                        {/* Missing Cites breakdown */}
                        {df.missingCites && df.missingCites.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Missing or Null Cited Fields Detected:
                            </span>
                            <div className="flex items-center gap-2 flex-wrap">
                              {df.missingCites.map((mc, mIdx) => (
                                <span
                                  key={mIdx}
                                  className="inline-flex items-center gap-1.5 rounded bg-rose-950/40 border border-rose-800/40 px-2 py-1 font-mono text-[11px] text-rose-300"
                                >
                                  <FileX2 className="h-3.5 w-3.5 text-rose-400" />
                                  <span>{mc.document}:</span>
                                  <strong className="text-rose-200">{mc.field} (MISSING/NULL)</strong>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Raw Candidate JSON Inspector */}
                        <details className="rounded-lg bg-slate-900/80 p-2 border border-slate-800 text-[11px]">
                          <summary className="font-mono text-slate-400 cursor-pointer hover:text-slate-200 select-none">
                            Inspect Raw Candidate Finding Payload
                          </summary>
                          <pre className="mt-2 p-2 bg-slate-950 rounded text-slate-300 font-mono text-[10px] overflow-x-auto border border-slate-800/80">
                            {JSON.stringify(df.originalFinding || df, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
