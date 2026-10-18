import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Mail, 
  FileEdit, 
  Sparkles, 
  ShieldAlert, 
  Info,
  ChevronDown,
  ChevronUp,
  Send,
  FileCheck
} from 'lucide-react';
import type { DiscrepancyFix } from '../types/compliance.ts';

interface DiscrepancyFixCardProps {
  fix: DiscrepancyFix;
  stepNumber?: number;
  priority?: 'URGENT' | 'HIGH' | 'MEDIUM';
}

export const DiscrepancyFixCard: React.FC<DiscrepancyFixCardProps> = ({
  fix,
  stepNumber,
  priority,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(fix.copyableContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const isReissuable = fix.fixType === 'CORRECTED_TEXT';

  return (
    <div
      className={`rounded-xl border transition-all overflow-hidden ${
        isReissuable
          ? 'border-emerald-500/30 bg-emerald-950/10 hover:border-emerald-500/50'
          : 'border-amber-500/30 bg-amber-950/10 hover:border-amber-500/50'
      }`}
    >
      {/* Card Header */}
      <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900/50 border-b border-slate-800/80">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {stepNumber !== undefined && (
              <span className="font-mono text-xs font-bold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                Fix #{stepNumber}
              </span>
            )}

            {/* Clear Fix Type Marker */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wide border shadow-sm ${
                isReissuable
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              {isReissuable ? (
                <>
                  <FileEdit className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Corrected text (Ready to Re-issue)</span>
                </>
              ) : (
                <>
                  <Mail className="h-3.5 w-3.5 text-amber-400" />
                  <span>LC amendment request (Email to Buyer)</span>
                </>
              )}
            </span>

            {priority && (
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                  priority === 'URGENT'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : priority === 'HIGH'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                }`}
              >
                {priority}
              </span>
            )}

            <span className="rounded bg-slate-800 px-2.5 py-0.5 text-[11px] font-mono text-slate-300 border border-slate-700">
              Target: {fix.targetDoc}
            </span>
          </div>

          <h3 className="text-sm font-bold text-white tracking-tight">
            {fix.discrepancyTitle}
          </h3>
        </div>

        {/* Action Buttons: Copy & Toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow-sm ${
              copied
                ? 'bg-emerald-600 text-white'
                : isReissuable
                ? 'bg-emerald-600/90 text-white hover:bg-emerald-500 active:scale-95'
                : 'bg-amber-600 text-white hover:bg-amber-500 active:scale-95'
            }`}
            title="Copy fix to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy {isReissuable ? 'Corrected Text' : 'Amendment Email'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Toggle fix details"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-3.5 text-xs">
          {/* Banking / Practical Reason */}
          <div className="rounded-lg bg-slate-900/80 p-3 border border-slate-800/80 text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-white text-[11px] uppercase tracking-wider">
              <Info className="h-3.5 w-3.5 text-teal-400" />
              <span>Why this fix format was selected:</span>
            </div>
            <p className="text-slate-300 leading-relaxed pl-5">
              {fix.reason}
            </p>
          </div>

          {/* If LC Amendment Request: Show Recipient and Subject */}
          {!isReissuable && fix.emailSubject && (
            <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-mono">
                  TO: <strong className="text-white">{fix.emailRecipient || 'The Buyer / Applicant'}</strong>
                </span>
                <span className="text-amber-400 font-mono font-semibold">
                  SWIFT MT707 Instruction
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-300">
                <span className="text-slate-500">SUBJECT: </span>
                <span className="text-amber-200 font-bold">{fix.emailSubject}</span>
              </div>
            </div>
          )}

          {/* Copyable Block Preview */}
          <div className="relative group">
            <div className="flex items-center justify-between pb-1.5 text-[10px] uppercase font-bold tracking-wider">
              <span className={isReissuable ? 'text-emerald-400' : 'text-amber-400'}>
                {isReissuable ? 'Ready-to-copy corrected text snippet:' : 'Ready-to-send amendment request email:'}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-slate-400 hover:text-white inline-flex items-center gap-1 font-mono text-[10px]"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copied!' : 'Click to copy'}</span>
              </button>
            </div>

            <pre className="rounded-xl bg-slate-950 p-4 font-mono text-[11px] sm:text-xs text-slate-200 border border-slate-800/90 whitespace-pre-wrap overflow-x-auto leading-relaxed selection:bg-teal-500 selection:text-slate-950">
              {fix.copyableContent}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
