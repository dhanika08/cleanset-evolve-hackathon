import React from 'react';
import { FileText, AlertTriangle, RefreshCw, Layers } from 'lucide-react';
import { LCDocumentData, ShippingDocument } from '../types/compliance';

export interface CurrentSessionBannerProps {
  lc: LCDocumentData;
  documents: ShippingDocument[];
  lastExamTime?: number | null;
  isOutdated: boolean;
  onRunExamination?: () => void;
}

function formatSessionTime(timestamp?: number | null): string {
  if (!timestamp) return 'Initial upload';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return 'Initial upload';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export const CurrentSessionBanner: React.FC<CurrentSessionBannerProps> = ({
  lc,
  documents,
  isOutdated,
  onRunExamination,
}) => {
  const lcName = lc.fileName || (lc.lcNumber ? `MT700_${lc.lcNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.swift` : (lc.rawText ? 'MT700_Letter_of_Credit.swift' : null));

  return (
    <div className="sticky top-[61px] z-30 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-xs text-slate-300 shadow-md transition-all">
      <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6">
        {/* Outdated Warning Notice in Orange */}
        {isOutdated && (
          <div className="mb-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-orange-500/80 bg-orange-950/60 p-3 text-orange-200 shadow-lg shadow-orange-950/40">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/30 text-orange-400 flex-shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <span className="font-extrabold text-orange-300 uppercase tracking-wide">
                  Results are outdated
                </span>
                <span className="ml-2 text-orange-100/90 text-xs">
                  One or more documents were added, removed, or modified after the last examination run.
                </span>
              </div>
            </div>
            {onRunExamination && (
              <button
                onClick={onRunExamination}
                className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-orange-400 transition-colors shadow-sm flex-shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Re-run Examination</span>
              </button>
            )}
          </div>
        )}

        {/* Main Current Session Metadata Bar (flex-wrap, non-scrollable) */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Left: Session Title Badge */}
          <div className="flex items-center gap-1.5 font-bold text-white uppercase tracking-wider text-[11px] bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700 shadow-sm flex-shrink-0">
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            <span>Current session</span>
          </div>

          {!lcName && documents.length === 0 ? (
            <span className="text-slate-400 italic text-[11px] px-2 py-0.5">
              No LC or documents in session (ready for upload or 1-click test scenario)
            </span>
          ) : (
            <>
              {/* LC Badge */}
              {lcName && (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-950/50 px-2.5 py-1 text-[11px] text-teal-300 font-mono shadow-sm flex-shrink-0">
                  <FileText className="h-3 w-3 text-teal-400 flex-shrink-0" />
                  <span className="font-semibold text-teal-200">LC:</span>
                  <span className="truncate max-w-[200px]" title={lcName}>{lcName}</span>
                  <span className="text-teal-400/80 text-[10px]">({formatSessionTime(lc.uploadTime)})</span>
                </div>
              )}

              {/* Presented Documents Badges (wrapped naturally, non-scrollable) */}
              {documents.map((doc, idx) => (
                <div
                  key={doc.id || idx}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-[11px] text-slate-300 font-mono hover:border-slate-700 transition-colors shadow-sm flex-shrink-0"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="truncate max-w-[180px]" title={doc.fileName || doc.title}>
                    {doc.fileName || doc.title}
                  </span>
                  <span className="text-slate-400 text-[10px]">({formatSessionTime(doc.uploadTime)})</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
