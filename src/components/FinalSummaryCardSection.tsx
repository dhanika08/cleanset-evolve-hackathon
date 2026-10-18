import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Clock, 
  AlertOctagon, 
  FileCheck2, 
  DollarSign, 
  Printer, 
  Copy, 
  Check, 
  Sparkles,
  ArrowRight,
  ShieldAlert,
  FileDown
} from 'lucide-react';
import type { FinalSummaryCard, ExaminationResult } from '../types/compliance.ts';

interface FinalSummaryCardSectionProps {
  summary?: FinalSummaryCard;
  result: ExaminationResult;
  onPrint?: () => void;
  onModifyAndRecheck?: () => void;
  onReset?: () => void;
}

export const FinalSummaryCardSection: React.FC<FinalSummaryCardSectionProps> = ({
  summary,
  result,
  onPrint,
  onModifyAndRecheck,
  onReset,
}) => {
  const [copiedAll, setCopiedAll] = useState(false);

  // One number everywhere: the server's de-duplicated total
  const discrepanciesCount = result.totalDiscrepancies ?? summary?.discrepanciesCaught ??
    result.documentAudits.reduce((acc, d) => acc + d.findings.length, 0);

  const durationFormatted = summary?.timeTakenFormatted ??
    (result.pipelineStats?.durationMs ? `${(result.pipelineStats.durationMs / 1000).toFixed(1)}s` : '—');

  const refusalAvoided = summary?.estimatedBankRefusalAvoided ?? 
    (discrepanciesCount > 0 
      ? 'Presentation Protected from Bank Refusal (MT734)'
      : '100% Clean Presentation — Immediate Honor');

  const feeSaved = summary?.discrepancyFeeSaved ?? (discrepanciesCount > 0 ? 'Discrepancy fee waived' : 'USD $0.00');
  const delayAvoided = summary?.delayPreventedDays ?? (discrepanciesCount > 0 ? 'Fix before presenting to avoid a refusal' : 'No delay expected');

  const isClean = discrepanciesCount === 0;

  const handleCopyAllFixes = () => {
    const fixes = result.remediationPlan
      .map((r, i) => {
        const typeStr = r.fixType === 'CORRECTED_TEXT' 
          ? '[CORRECTED TEXT FOR RE-ISSUE]' 
          : '[LC AMENDMENT REQUEST EMAIL]';
        return `========================================\nFIX #${i + 1}: ${r.action}\nTYPE: ${typeStr}\nTARGET: ${r.targetDoc}\nREASON: ${r.reason}\n\n${r.copyableContent || r.fix?.copyableContent || ''}\n========================================\n`;
      })
      .join('\n\n');

    navigator.clipboard.writeText(fixes || 'No discrepancies found.');
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2200);
  };

  return (
    <section className="relative rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/30 p-6 sm:p-8 shadow-2xl overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800/90 relative z-10">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/20 p-2.5 border border-emerald-500/30">
            <ShieldCheck className="h-7 w-7 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                Final Examination Audit Summary
              </span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                UCP 600 Art 14–18 / ISBP 821
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              CleanSet Compliance Verification Card
            </h2>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {discrepanciesCount > 0 && (
            <button
              onClick={handleCopyAllFixes}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors shadow-sm"
            >
              {copiedAll ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              <span>{copiedAll ? 'All Fixes Copied!' : 'Copy All Fixes'}</span>
            </button>
          )}

          {onPrint && (
            <button
              onClick={onPrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-950/40"
              aria-label="Export PDF report"
            >
              <FileDown className="h-4 w-4" />
              <span>Export PDF report</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Core Metric Highlights Requested by User */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
        {/* Metric 1: Discrepancies Caught */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-950/80 p-5 flex flex-col justify-between shadow-md">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <span>Discrepancies Caught</span>
              <AlertOctagon className={`h-4 w-4 ${discrepanciesCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-4xl font-black tracking-tight ${
                  discrepanciesCount > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {discrepanciesCount}
              </span>
              <span className="text-xs font-medium text-slate-400">
                {discrepanciesCount === 1 ? 'discrepancy' : 'discrepancies'} identified
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            {discrepanciesCount > 0 ? (
              <>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-emerald-400">Re-issuable corrections:</span>
                  <span className="font-bold text-white">
                    {summary?.reissuableFixesCount ?? result.remediationPlan.filter((r) => r.fixType === 'CORRECTED_TEXT').length}
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-amber-400">LC amendments needed:</span>
                  <span className="font-bold text-white">
                    {summary?.amendmentRequestsCount ?? result.remediationPlan.filter((r) => r.fixType === 'LC_AMENDMENT_REQUEST').length}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-emerald-400 font-semibold">100% conforming presentation</span>
            )}
          </div>
        </div>

        {/* Metric 2: Time Taken */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-950/80 p-5 flex flex-col justify-between shadow-md">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <span>Time Taken</span>
              <Clock className="h-4 w-4 text-teal-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tight text-teal-300">
                {durationFormatted}
              </span>
              <span className="text-xs font-medium text-slate-400">
                full pipeline audit
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>Model Engine:</span>
            <span className="text-teal-300 font-semibold">
              {result.pipelineStats?.modelUsed || 'Rules only (AI unavailable)'}
            </span>
          </div>
        </div>

        {/* Metric 3: Estimated Bank Refusal Avoided */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-5 flex flex-col justify-between shadow-md">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-emerald-300 uppercase tracking-wider mb-2">
              <span>Estimated Bank Refusal Avoided</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-sm font-extrabold text-white leading-snug">
              {refusalAvoided}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-500/20 text-[11px] text-slate-300 space-y-1 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Discrepancy fee saved:</span>
              <span className="font-bold text-emerald-300">{feeSaved}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Delay prevented:</span>
              <span className="font-bold text-emerald-300">{delayAvoided}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Statement */}
      <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400 relative z-10">
        <p className="leading-relaxed">
          CleanSet simulated examination applies strict ICC Banking Commission guidelines. Applying the provided 
          <strong className="text-emerald-300"> "Corrected text"</strong> and 
          <strong className="text-amber-300"> "LC amendment request"</strong> ensures full legal conformity before submission.
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onModifyAndRecheck && (
            <button
              onClick={onModifyAndRecheck}
              className="text-xs text-slate-300 hover:text-white underline underline-offset-4"
            >
              Adjust Documents
            </button>
          )}
        </div>
      </div>

      {/* Mandatory Decision Support Footnote */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 text-center relative z-10">
        <p className="text-xs text-slate-400 font-medium italic">
          Decision support only; a bank checker confirms.
        </p>
      </div>
    </section>
  );
};
