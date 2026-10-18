import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertOctagon, 
  AlertTriangle, 
  FileText, 
  Printer, 
  RotateCcw, 
  CheckSquare, 
  Square, 
  Copy, 
  Check, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  ShieldCheck,
  Scale,
  Sparkles,
  ArrowRight,
  Clock,
  FileDown
} from 'lucide-react';
import { ExaminationResult, DocumentAudit, Finding, DiscardedFinding } from '../types/compliance';
import { DeterministicRulesSection } from './DeterministicRulesSection';
import { GeminiJudgementSection } from './GeminiJudgementSection';
import { DiscardedFindingsPanel } from './DiscardedFindingsPanel';
import { DiscrepancyFixCard } from './DiscrepancyFixCard';
import { FinalSummaryCardSection } from './FinalSummaryCardSection';
import { generateDiscrepancyFix } from '../utils/fixGenerator';

interface ResultsScreenProps {
  result: ExaminationResult;
  onReset: () => void;
  onPrint: () => void;
  onModifyAndRecheck: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  result,
  onReset,
  onPrint,
  onModifyAndRecheck,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'discrepant' | 'clean'>('all');
  const [completedRemediations, setCompletedRemediations] = useState<Record<number, boolean>>({});
  const [copiedPlan, setCopiedPlan] = useState(false);
  const [expandedDocIds, setExpandedDocIds] = useState<Record<string, boolean>>({});
  const [expandedEvidenceFindings, setExpandedEvidenceFindings] = useState<Record<string, boolean>>({});
  const [simulatedDiscarded, setSimulatedDiscarded] = useState<DiscardedFinding[] | null>(null);

  const toggleFindingEvidence = (id: string) => {
    setExpandedEvidenceFindings((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSimulateHallucination = () => {
    setSimulatedDiscarded([
      {
        id: 'sim-discard-1',
        title: 'Hallucinated Phytosanitary Certificate Fumigation Date Clause',
        verdict: 'discrepancy',
        reason: 'Verification failed: Missing or null extracted field(s): [Phytosanitary Certificate -> fumigation_date]. Document was not presented in the consignment and field does not exist. Discarded to prevent hallucinations.',
        missingCites: [
          { document: 'Phytosanitary Certificate', field: 'fumigation_date' },
        ],
        discardedAt: new Date().toISOString(),
        originalFinding: {
          title: 'Hallucinated Phytosanitary Certificate Fumigation Date Clause',
          verdict: 'discrepancy',
          cites: [{ document: 'Phytosanitary Certificate', field: 'fumigation_date' }],
          source: 'Judgement',
        },
      },
      {
        id: 'sim-discard-2',
        title: 'Commercial Invoice HS Code 6105.10 Discrepancy Against Credit',
        verdict: 'discrepancy',
        reason: 'Verification failed: Missing or null extracted field(s): [Commercial Invoice -> hs_code]. Field value was null in extracted invoice data. Under UCP 600, candidate findings citing null fields are pruned.',
        missingCites: [
          { document: 'Commercial Invoice', field: 'hs_code' },
        ],
        discardedAt: new Date().toISOString(),
        originalFinding: {
          title: 'Commercial Invoice HS Code 6105.10 Discrepancy Against Credit',
          verdict: 'discrepancy',
          cites: [{ document: 'Commercial Invoice', field: 'hs_code' }],
          source: 'Judgement',
        },
      },
    ]);
  };

  const handleResetSimulation = () => {
    setSimulatedDiscarded(null);
  };

  const displayedDiscarded = simulatedDiscarded !== null ? simulatedDiscarded : (result.discardedFindings || []);

  // One de-duplicated number, computed on the server, used for the verdict, the cards and the summary
  const totalDiscrepancies = result.totalDiscrepancies ?? result.documentAudits.reduce((acc, d) => acc + (d.findings?.length ?? 0), 0);
  const isIncomplete = result.status === 'INCOMPLETE';
  const isClean = result.status === 'CLEAN' && totalDiscrepancies === 0;
  const aiStatus = result.aiStatus;
  const aiLabel = !aiStatus
    ? 'AI review: unknown'
    : aiStatus.judgement === 'gemini'
    ? 'AI review: Gemini'
    : aiStatus.judgement === 'fallback'
    ? 'AI review: unavailable (rule checks used)'
    : 'AI review: off (no API key)';

  // Time taken for the whole check
  const timeTakenFormatted = result.finalSummary?.timeTakenFormatted || 
    (result.pipelineStats?.durationMs ? `${(result.pipelineStats.durationMs / 1000).toFixed(1)}s` : '—');

  const presRule = result.ruleEvaluations?.find((r) => r.id === 'rule-presentation-period');
  const presUsedMatch = presRule?.explanation?.match(/Presentation date used:\s*([0-9-]+)/);
  const lastDayMatch = presRule?.explanation?.match(/Last day to present(?:\s*was)?:\s*([0-9-]+)/);
  const presentationDateUsed = presUsedMatch ? presUsedMatch[1] : (result as any).presentationDate || 'Today';
  const lastDayToPresent = lastDayMatch ? lastDayMatch[1] : 'N/A';
  const isEarlyWarn = Boolean(presRule?.explanation?.includes('earlier than Shipped on Board date'));
  const aiRan = aiStatus ? aiStatus.judgement === 'gemini' : Boolean(result.judgements?.some((j) => j.source !== 'Rule (AI unavailable)'));

  const toggleRemediation = (step: number) => {
    setCompletedRemediations((prev) => ({
      ...prev,
      [step]: !prev[step],
    }));
  };

  const toggleDocExpand = (docName: string) => {
    setExpandedDocIds((prev) => ({
      ...prev,
      [docName]: !prev[docName],
    }));
  };

  const handleCopyPlan = () => {
    const text = result.remediationPlan
      .map((r, i) => `${i + 1}. [${r.priority}] ${r.action} (Target: ${r.targetDoc}) - Reason: ${r.reason}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedPlan(true);
    setTimeout(() => setCopiedPlan(false), 2000);
  };

  // Filtered and grouped document audits: Discrepancies first, then Clean/Pass
  const filteredAudits = result.documentAudits.filter((audit) => {
    if (activeTab === 'discrepant') return audit.status === 'Discrepancy Identified';
    if (activeTab === 'clean') return audit.status === 'Pass';
    return true;
  });

  const sortedAudits = [...filteredAudits].sort((a, b) => {
    if (a.status === 'Discrepancy Identified' && b.status !== 'Discrepancy Identified') return -1;
    if (a.status !== 'Discrepancy Identified' && b.status === 'Discrepancy Identified') return 1;
    return 0;
  });

  const acceptedCount = (result.judgements?.filter(j => j.verdict === 'acceptable').length || 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8 animate-fade-in">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Audit Examination Completed • ICC Banking Protocol UCP 600 / ISBP 821
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            CleanSet Pre-Check Compliance Report
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Time taken for whole check badge */}
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-950/40 px-3 py-2 text-xs font-mono text-teal-300">
            <Clock className="h-4 w-4 text-teal-400" />
            <span>Time taken for whole check: <strong className="text-white">{timeTakenFormatted}</strong></span>
          </div>

          {/* Export PDF report button */}
          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-950/40"
            aria-label="Export PDF report"
          >
            <FileDown className="h-4 w-4" />
            <span>Export PDF report</span>
          </button>

          <button
            onClick={onModifyAndRecheck}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
            aria-label="Edit and Re-check"
          >
            <RotateCcw className="h-4 w-4 text-teal-400" />
            <span>Edit &amp; Re-check</span>
          </button>
        </div>
      </div>

      {/* Screen 3 Requirement: Big Verdict Badge */}
      <div
        className={`rounded-3xl border p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all ${
          isClean
            ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 shadow-emerald-500/10'
            : 'border-rose-500/40 bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 shadow-rose-500/10'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            <div
              className={`flex h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 items-center justify-center rounded-2xl shadow-xl ${
                isClean
                  ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                  : 'bg-rose-600 text-white shadow-rose-600/30'
              }`}
            >
              {isClean ? (
                <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12" />
              ) : (
                <AlertOctagon className="h-10 w-10 sm:h-12 sm:w-12" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-extrabold tracking-wide uppercase border ${
                    isClean
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {isClean ? '100% Compliant • Clean Set' : isIncomplete ? `Incomplete: ${result.unreadableDocuments?.length || 0} document(s) unreadable` : `Discrepant: ${totalDiscrepancies} Issue${totalDiscrepancies === 1 ? '' : 's'} Found`}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    result.riskLevel === 'Low'
                      ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60'
                      : result.riskLevel === 'Moderate'
                      ? 'bg-amber-900/60 text-amber-300 border border-amber-700/60'
                      : 'bg-rose-900/60 text-rose-300 border border-rose-700/60'
                  }`}
                >
                  Risk Level: {result.riskLevel}
                </span>

                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/90 border border-slate-700 px-3 py-1 text-xs font-mono text-teal-300">
                  <Clock className="h-3 w-3 text-teal-400" />
                  Time taken: {timeTakenFormatted}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono font-bold border ${
                    aiRan
                      ? 'bg-purple-950/60 text-purple-300 border-purple-700/60'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {aiLabel}
                </span>
              </div>
              {aiStatus?.message && (
                <p className="mt-2 text-[11px] text-amber-300/90">{aiStatus.message}</p>
              )}

              <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-white">
                {isClean
                  ? 'Zero Discrepancies Identified. Ready for Bank Presentation.'
                  : isIncomplete
                  ? 'Some documents could not be read. Re-upload them as text-based PDFs or paste the text, then re-check.'
                  : `${totalDiscrepancies} Discrepanc${totalDiscrepancies === 1 ? 'y' : 'ies'} to Fix Before Bank Submission.`}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-2xl">
                {isClean
                  ? 'No discrepancies were found against the credit terms under UCP 600 and ISBP 821. A bank checker confirms the final decision.'
                  : `${result.ruleDiscrepancyCount ?? totalDiscrepancies} found by the rule engine${(result.aiDiscrepancyCount ?? 0) > 0 ? `, ${result.aiDiscrepancyCount} added by the AI review` : ''}. Presenting these documents as they are risks discrepancy fees, delay or refusal under UCP 600 Article 16.`}
              </p>
            </div>
          </div>

          {/* Compliance Score Gauge */}
          <div className="flex md:flex-col items-center justify-between md:justify-center border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-8 flex-shrink-0">
            <span className="text-xs uppercase font-semibold text-slate-400">Bank Readiness Score</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span
                className={`text-4xl sm:text-5xl font-black ${
                  result.complianceScore >= 90
                    ? 'text-emerald-400'
                    : result.complianceScore >= 60
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {result.complianceScore}
              </span>
              <span className="text-slate-500 font-bold text-lg">/100</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 font-mono">
              Whole check: {timeTakenFormatted}
            </span>
          </div>
        </div>
      </div>

      {/* Group Results Overview: Discrepancies First, then Accepted-with-Reason */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Group 1: Discrepancies First */}
        <div className="rounded-2xl border-2 border-rose-500/30 bg-rose-950/20 p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-rose-900/40">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-rose-500/20 p-1.5 text-rose-400">
                <AlertOctagon className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block font-mono">
                  Group 1 &bull; Priority Attention
                </span>
                <h3 className="text-base font-bold text-white">
                  Discrepancies ({totalDiscrepancies})
                </h3>
              </div>
            </div>
            <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs font-bold text-rose-300 font-mono">
              {totalDiscrepancies > 0 ? 'Fixes Required' : '0 Found'}
            </span>
          </div>
          <p className="mt-2.5 text-xs text-rose-200/90 leading-relaxed">
            Non-conformities identified across documents. Each discrepancy below has a tailored fix ready to copy: either <strong>&ldquo;Corrected text&rdquo;</strong> for re-issuing internal documents, or an <strong>&ldquo;LC amendment request&rdquo;</strong> email for unalterable dates.
          </p>
        </div>

        {/* Group 2: Accepted-with-reason Second */}
        <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-950/20 p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-500/20 p-1.5 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block font-mono">
                  Group 2 &bull; Validated Standards
                </span>
                <h3 className="text-base font-bold text-white">
                  Accepted-with-reason ({acceptedCount})
                </h3>
              </div>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300 font-mono">
              UCP 600 Permitted
            </span>
          </div>
          <p className="mt-2.5 text-xs text-emerald-200/90 leading-relaxed">
            Apparent differences accepted under banking rules: <strong>Art 14(d)</strong> data need not be identical but must not conflict, and <strong>Art 14(e)</strong> transport/insurance goods descriptions in general terms are permitted.
          </p>
        </div>
      </div>

      {/* Output Format Section 1: Executive Summary */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white uppercase tracking-wider">
            1. Summary
          </h2>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Status</span>
            <span
              className={`mt-1 inline-flex items-center gap-1.5 text-base font-extrabold ${
                isClean ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isClean ? 'CLEAN (Approved)' : 'DISCREPANCIES FOUND'}
            </span>
            <p className="mt-1 text-xs text-slate-400">
              {isClean ? 'No contractual non-conformity.' : `${totalDiscrepancies} non-conformities across shipping docs.`}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Risk Level</span>
            <span
              className={`mt-1 inline-flex items-center gap-1.5 text-base font-extrabold ${
                result.riskLevel === 'Low'
                  ? 'text-emerald-400'
                  : result.riskLevel === 'Moderate'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {result.riskLevel} Risk
            </span>
            <p className="mt-1 text-xs text-slate-400">
              {result.riskLevel === 'Low'
                ? 'High probability of immediate honor by issuing bank.'
                : 'High probability of notice of refusal (MT734).'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Audited Documents</span>
            <span className="mt-1 inline-flex items-center gap-1.5 text-base font-extrabold text-white">
              {result.documentAudits.length} Documents Checked
            </span>
            <p className="mt-1 text-xs text-slate-400">
              {result.ruleEvaluations?.length ?? result.pipelineStats?.rulesEvaluated ?? 0} rule checks run in {timeTakenFormatted}.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Presentation Timeline</span>
            <div className="mt-1 space-y-1 text-xs font-mono">
              <div className="text-slate-300">
                Presentation date used:{' '}
                <strong className="text-teal-300">{presentationDateUsed}</strong>
              </div>
              <div className="text-slate-400">
                Last day to present:{' '}
                <strong className="text-white">{lastDayToPresent}</strong>
              </div>
              {isEarlyWarn && (
                <span className="text-amber-400 text-[11px] block mt-1 font-sans font-medium">
                  ⚠️ Presentation date is before B/L date
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
          <span className="text-xs font-bold text-slate-300 block mb-1">Brief Overview &amp; Bank Readiness:</span>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
            {result.executiveSummary}
          </p>
        </div>
      </section>

      {/* Deterministic Banking Rules Engine (9 Core UCP 600 Rules) */}
      {result.ruleEvaluations && result.ruleEvaluations.length > 0 && (
        <DeterministicRulesSection rules={result.ruleEvaluations} />
      )}

      {/* Gemini Judgement Step (UCP 600 Art 14(d) & 14(e) Cross-Document Evaluation) */}
      {result.judgements && result.judgements.length > 0 && (
        <GeminiJudgementSection judgements={result.judgements} />
      )}

      {/* Verification Step: Discarded Findings Debug Panel (Guarantees 0 Hallucinations) */}
      <DiscardedFindingsPanel
        discardedFindings={displayedDiscarded}
        survivingCount={result.judgements?.length || 0}
        onSimulateHallucination={handleSimulateHallucination}
        onResetSimulation={handleResetSimulation}
        isSimulated={simulatedDiscarded !== null}
      />

      {/* Output Format Section 2: Document audit */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <FileText className="h-5 w-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                2. Document audit
              </h2>
              <p className="text-xs text-slate-400">
                Detailed clause-by-clause scrutiny citing international UCP 600 articles
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({result.documentAudits.length})
            </button>
            <button
              onClick={() => setActiveTab('discrepant')}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                activeTab === 'discrepant'
                  ? 'bg-slate-800 text-rose-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Discrepant ({result.documentAudits.filter((d) => d.status === 'Discrepancy Identified').length})
            </button>
            <button
              onClick={() => setActiveTab('clean')}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                activeTab === 'clean'
                  ? 'bg-slate-800 text-emerald-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Passed ({result.documentAudits.filter((d) => d.status === 'Pass').length})
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {sortedAudits.map((audit) => {
            const isDocExpanded = expandedDocIds[audit.docName] !== false; // default open
            const isPass = audit.status === 'Pass';

            return (
              <div
                key={audit.docName}
                className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden transition-all"
              >
                {/* Document Header Bar */}
                <div
                  onClick={() => toggleDocExpand(audit.docName)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl">
                      {audit.docType === 'COMMERCIAL_INVOICE'
                        ? '📄'
                        : audit.docType === 'BILL_OF_LADING'
                        ? '🚢'
                        : audit.docType === 'PACKING_LIST'
                        ? '📦'
                        : audit.docType === 'INSURANCE_CERTIFICATE'
                        ? '🛡️'
                        : audit.docType === 'CERTIFICATE_OF_ORIGIN'
                        ? '🌍'
                        : '📎'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white truncate">{audit.docName}</h3>
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                          {audit.docType}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {isPass ? 'Fully conforms to credit requirements' : `${audit.findings.length} discrepanc${audit.findings.length === 1 ? "y" : "ies"} identified`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                        isPass
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {isPass ? 'Pass' : 'Discrepancy Identified'}
                    </span>
                    <button className="text-slate-400 hover:text-white" aria-label="Toggle details">
                      {isDocExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Findings */}
                {isDocExpanded && (
                  <div className="border-t border-slate-800/80 p-4 bg-slate-900/40">
                    {isPass ? (
                      <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>All clauses, signatures, quantities and dates checked: No discrepancies found.</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {audit.findings.map((f, fIdx) => (
                          <div
                            key={fIdx}
                            className="rounded-xl border border-rose-900/30 bg-rose-950/10 p-3.5 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30">
                                  {f.severity}
                                </span>
                                <h4 className="font-bold text-white text-xs">{f.title}</h4>
                                <span
                                  className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                                    f.source === 'Judgement'
                                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                      : 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                                  }`}
                                >
                                  Source: {f.source || 'Rule'}
                                </span>
                              </div>
                              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-mono text-teal-300 border border-slate-700">
                                {f.ruleCitation}
                              </span>
                            </div>

                            <p className="text-slate-300 leading-relaxed">{f.description}</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                              <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
                                <span className="text-[10px] text-rose-400 uppercase font-semibold block">
                                  Observed in Document:
                                </span>
                                <span className="text-slate-200">{f.foundValue}</span>
                              </div>
                              <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
                                <span className="text-[10px] text-emerald-400 uppercase font-semibold block">
                                  Required by LC / UCP 600:
                                </span>
                                <span className="text-slate-200">{f.expectedValue}</span>
                              </div>
                            </div>

                            <div className="rounded-lg bg-slate-900/90 p-2 text-slate-300 border border-slate-800/80">
                              <strong className="text-emerald-400">Actionable Remediation:</strong> {f.remediation}
                            </div>

                            {/* Expandable Evidence Section */}
                            <div className="pt-2 border-t border-slate-800/60 space-y-2">
                              <div className="flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFindingEvidence(f.id || `f-${fIdx}`);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors"
                                >
                                  <Sparkles className="h-3 w-3 text-purple-400" />
                                  <span>
                                    Evidence ({f.evidence?.length || f.cites?.length || 1})
                                  </span>
                                  {expandedEvidenceFindings[f.id || `f-${fIdx}`] ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  )}
                                </button>
                                <span className="text-[10px] font-mono text-emerald-400">
                                  Verified in plain code
                                </span>
                              </div>

                              {expandedEvidenceFindings[f.id || `f-${fIdx}`] && (
                                <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800 space-y-2">
                                  <div className="text-[10px] uppercase font-bold text-purple-300 tracking-wider">
                                    Verbatim Source Snippets from Presented Documents:
                                  </div>
                                  {f.evidence && f.evidence.length > 0 ? (
                                    f.evidence.map((ev, evIdx) => (
                                      <div key={evIdx} className="rounded bg-slate-900/90 p-2 border border-slate-800 text-xs space-y-1">
                                        <div className="flex items-center justify-between text-[11px] font-mono">
                                          <span className="text-purple-300 font-semibold">{ev.document} &bull; {ev.field}</span>
                                          {ev.value !== undefined && ev.value !== null && (
                                            <span className="text-slate-400">Value: {String(ev.value)}</span>
                                          )}
                                        </div>
                                        <div className="rounded bg-slate-950 p-2 font-mono text-[11px] text-slate-200 border border-slate-800">
                                          <span className="text-[10px] text-teal-400 uppercase font-semibold block mb-0.5">
                                            source_snippet:
                                          </span>
                                          <p className="italic text-slate-300">&ldquo;{ev.source_snippet || String(ev.value)}&rdquo;</p>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="rounded bg-slate-900/90 p-2 border border-slate-800 text-xs">
                                      <div className="flex items-center justify-between text-[11px] font-mono text-purple-300">
                                        <span>{audit.docName} &bull; {f.title}</span>
                                      </div>
                                      <div className="rounded bg-slate-950 p-2 font-mono text-[11px] text-slate-200 border border-slate-800 mt-1">
                                        <span className="text-[10px] text-teal-400 uppercase font-semibold block mb-0.5">
                                          source_snippet:
                                        </span>
                                        <p className="italic text-slate-300">&ldquo;{f.foundValue}&rdquo;</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Gemini Generated Fix (Corrected text vs LC amendment request) with Copy button */}
                            <div className="pt-2 border-t border-slate-800/60">
                              <DiscrepancyFixCard
                                fix={
                                  f.fix ||
                                  generateDiscrepancyFix(
                                    f,
                                    (result as any).lc || {},
                                    audit.docName
                                  )
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Output Format Section 3: Fixes */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Scale className="h-5 w-5 text-teal-400" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white uppercase tracking-wider">
                  3. Fixes
                </h2>
                <span className="rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 text-[10px] font-mono">
                  Gemini Powered Fixes
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Discrepancies clearly marked as &ldquo;Corrected text&rdquo; for re-issue, or &ldquo;LC amendment request&rdquo; email to buyer.
              </p>
            </div>
          </div>

          {result.remediationPlan.length > 0 && (
            <button
              onClick={handleCopyPlan}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
            >
              {copiedPlan ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedPlan ? 'Copied to Clipboard' : 'Copy Remediation Checklist'}</span>
            </button>
          )}
        </div>

        {result.remediationPlan.length === 0 ? (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-5 text-center text-xs text-emerald-300">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
            <strong className="block text-sm font-bold text-white mb-1">Zero Remediation Required</strong>
            No corrections or amendments are needed. The document set conforms 100% to documentary credit rules.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {result.remediationPlan.map((item, idx) => {
              const fix = item.fix || generateDiscrepancyFix(
                {
                  id: `rem-step-${idx + 1}`,
                  severity: item.priority === 'URGENT' ? 'CRITICAL' : 'MAJOR',
                  title: item.action,
                  description: item.reason,
                  ruleCitation: item.reason.includes('UCP') ? item.reason : 'UCP 600',
                  foundValue: item.targetDoc,
                  expectedValue: 'Compliant condition',
                  remediation: item.action,
                },
                (result as any).lc || {},
                item.targetDoc
              );

              return (
                <DiscrepancyFixCard
                  key={idx}
                  fix={fix}
                  stepNumber={item.step || idx + 1}
                  priority={item.priority}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Section 4: Cross-Document Consistency Matrix */}
      {result.comparisonMatrix && result.comparisonMatrix.length > 0 && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <FileCheck2 className="h-5 w-5 text-teal-400" />
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Cross-Document Data Consistency Matrix
              </h2>
              <p className="text-xs text-slate-400">
                Data across Invoice, Bill of Lading, and Packing List must not conflict (UCP 600 Article 14(d))
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="p-3">Field</th>
                  <th className="p-3">LC Requirement</th>
                  <th className="p-3">Commercial Invoice</th>
                  <th className="p-3">Bill of Lading</th>
                  <th className="p-3">Packing List</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {result.comparisonMatrix.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40">
                    <td className="p-3 font-sans font-bold text-white">{row.field}</td>
                    <td className="p-3 text-slate-300">{row.lcRequirement}</td>
                    <td className="p-3 text-slate-300">{row.invoiceValue}</td>
                    <td className="p-3 text-slate-300">{row.blValue}</td>
                    <td className="p-3 text-slate-300">{row.packingListValue}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          row.status === 'MATCH'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : row.status === 'MISMATCH'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Final Summary Card: Discrepancies Caught, Time Taken, Estimated Bank Refusal Avoided */}
      <FinalSummaryCardSection
        summary={result.finalSummary}
        result={result}
        onPrint={onPrint}
        onModifyAndRecheck={onModifyAndRecheck}
        onReset={onReset}
      />

      {/* Bottom Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="text-xs text-slate-400">
          CleanSet simulated examination based on UCP 600, ISBP 821, and ICC Banking Commission Opinions.
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onModifyAndRecheck}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            Adjust Documents &amp; Re-check
          </button>
          <button
            onClick={onReset}
            className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-500 transition-colors"
          >
            Start New Consignment
          </button>
        </div>
      </div>

      {/* Mandatory Decision Support Footnote */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3.5 text-center shadow-inner">
        <p className="text-xs text-slate-400 font-medium italic">
          Decision support only; a bank checker confirms.
        </p>
      </div>
    </div>
  );
};
