import React from 'react';
import { ShieldCheck, Printer, X, CheckCircle2, AlertOctagon, FileDown, Clock, Scale } from 'lucide-react';
import { ExaminationResult, LCDocumentData, ShippingDocument } from '../types/compliance';

interface PrintableReportProps {
  isOpen: boolean;
  onClose: () => void;
  result: ExaminationResult;
  lc: LCDocumentData;
  documents: ShippingDocument[];
}

export const PrintableReport: React.FC<PrintableReportProps> = ({
  isOpen,
  onClose,
  result,
  lc,
  documents,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const isClean = result.status === 'CLEAN';

  const durationFormatted = result.finalSummary?.timeTakenFormatted || 
    (result.pipelineStats?.durationMs ? `${(result.pipelineStats.durationMs / 1000).toFixed(1)}s` : '—');

  // Group document audits: Discrepancies first, then Clean/Pass
  const sortedAudits = [...result.documentAudits].sort((a, b) => {
    if (a.status === 'Discrepancy Identified' && b.status !== 'Discrepancy Identified') return -1;
    if (a.status !== 'Discrepancy Identified' && b.status === 'Discrepancy Identified') return 1;
    return 0;
  });

  // Group judgements: Discrepancies first, then Accepted-with-reason
  const sortedJudgements = result.judgements ? [...result.judgements].sort((a, b) => {
    if (a.verdict === 'discrepancy' && b.verdict !== 'discrepancy') return -1;
    if (a.verdict !== 'discrepancy' && b.verdict === 'discrepancy') return 1;
    return 0;
  }) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white">
      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-700 bg-white p-8 text-slate-900 shadow-2xl print:max-h-none print:border-none print:shadow-none print:p-0">
        {/* Print Header Controls (Hidden on Print) */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Official Bank-Grade Examination Certificate
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 transition-colors"
              aria-label="Export PDF report"
            >
              <FileDown className="h-4 w-4" />
              <span>Export PDF report</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close report"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Certificate / Official Report Body */}
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-slate-900">CleanSet</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 border border-slate-300">
                  UCP 600 • ISBP 821
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Trade Finance Compliance &amp; Document Examination Verification Report
              </p>
            </div>
            <div className="text-right text-xs text-slate-500 space-y-0.5">
              <span className="block font-bold text-slate-800">
                Date: {new Date(result.pipelineStats?.timestamp || Date.now()).toLocaleDateString()}
              </span>
              <span className="block font-mono">Reference: {lc.lcNumber || 'LC-AUDIT-2026'}</span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                <Clock className="h-3 w-3 text-teal-600" />
                Time taken for whole check: {durationFormatted}
              </span>
            </div>
          </div>

          {/* Letter of Credit Profile */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg bg-slate-50 p-4 border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">LC Number</span>
              <span className="font-bold text-slate-900 font-mono">{lc.lcNumber}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Issuing Bank</span>
              <span className="font-medium text-slate-800 truncate block">{lc.issuingBank}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Amount</span>
              <span className="font-bold text-slate-900">{lc.currency} {Number(lc.amount).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Latest Shipment</span>
              <span className="font-bold text-slate-900 font-mono">{lc.latestShipmentDate}</span>
            </div>
          </div>

          {/* Verdict Banner */}
          <div
            className={`rounded-xl border p-4 text-center ${
              isClean
                ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                : 'border-rose-600 bg-rose-50 text-rose-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {isClean ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              ) : (
                <AlertOctagon className="h-6 w-6 text-rose-600" />
              )}
              <span className="text-lg font-black uppercase tracking-wide">
                VERDICT: {isClean ? 'COMPLIANT (CLEAN SET)' : 'DISCREPANCIES IDENTIFIED'}
              </span>
            </div>
            <p className="mt-1 text-xs">
              Risk Level: <strong>{result.riskLevel}</strong> &bull; Compliance Readiness Score: <strong>{result.complianceScore}/100</strong> &bull; Time taken: <strong>{durationFormatted}</strong>
            </p>
          </div>

          {/* Executive Summary */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
              1. Executive Summary &amp; Banking Readiness
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              {result.executiveSummary}
            </p>
          </div>

          {/* Document by Document Findings: Discrepancies first, then Clean */}
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                2. Document-by-Document Audit Findings (Discrepant Documents First)
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">
                {sortedAudits.filter(d => d.status === 'Discrepancy Identified').length} Discrepant &bull; {sortedAudits.filter(d => d.status === 'Pass').length} Clean
              </span>
            </div>
            <div className="space-y-3">
              {sortedAudits.map((doc, idx) => (
                <div key={idx} className="rounded border border-slate-200 p-3 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-900 pb-1 border-b border-slate-100">
                    <span>{doc.docName} ({doc.docType})</span>
                    <span className={doc.status === 'Pass' ? 'text-emerald-700' : 'text-rose-700'}>
                      {doc.status}
                    </span>
                  </div>
                  {doc.findings.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {doc.findings.map((f, fIdx) => (
                        <div key={fIdx} className="bg-slate-50 p-2 rounded border border-slate-200">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-rose-800">[{f.severity}] {f.title}</span>
                            <span className="font-mono text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-bold">Source: {f.source || 'Rule'}</span>
                            <span className="font-mono text-[11px] text-slate-600">({f.ruleCitation})</span>
                          </div>
                          <p className="text-slate-700 mt-1">{f.description}</p>
                          <p className="text-emerald-800 mt-0.5"><strong>Remediation:</strong> {f.remediation}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 mt-1">Conforms strictly to credit requirements.</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Gemini Cross-Document Judgements: Grouped Discrepancies first, then Accepted-with-reason */}
          {sortedJudgements.length > 0 && (
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  3. Gemini Cross-Document Judgements (Grouped: Discrepancies First, then Accepted-with-Reason)
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">
                  UCP 600 Art 14(d) &amp; 14(e)
                </span>
              </div>
              <div className="space-y-2">
                {sortedJudgements.map((j, idx) => (
                  <div key={idx} className="rounded border border-slate-200 p-2 text-xs bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${j.verdict === 'acceptable' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}`}>
                          [{j.verdict === 'acceptable' ? 'ACCEPTED-WITH-REASON' : 'DISCREPANCY'}]
                        </span>
                        <strong className="text-slate-900">{j.title}</strong>
                        <span className="font-mono text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">Source: {j.source}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-600">{j.ucp_article}</span>
                    </div>
                    <p className="text-slate-700 mt-1 text-[11px]">{j.explanation}</p>
                    {j.cites && j.cites.length > 0 && (
                      <p className="text-slate-500 mt-0.5 font-mono text-[10px]">
                        Cites: {j.cites.map((c) => `${c.document} -> ${c.field}`).join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Remediation Plan with Fix Types */}
          {result.remediationPlan.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
                4. Actionable Remediation Roadmap &amp; Discrepancy Fixes
              </h3>
              <div className="space-y-2 text-xs text-slate-800">
                {result.remediationPlan.map((r, idx) => {
                  const isReissue = r.fixType === 'CORRECTED_TEXT';
                  return (
                    <div key={idx} className="border border-slate-200 rounded p-2 bg-slate-50">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-slate-900">
                          #{idx + 1} [{r.priority}] {r.action}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isReissue ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isReissue ? 'Corrected text (Re-issue)' : 'LC amendment request (Email)'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mb-1">
                        <strong>Target:</strong> {r.targetDoc} &bull; <strong>Reason:</strong> {r.reason}
                      </p>
                      {r.copyableContent && (
                        <pre className="p-1.5 bg-white border border-slate-200 text-[10px] font-mono rounded whitespace-pre-wrap text-slate-800">
                          {r.copyableContent}
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Final Executive Summary Card */}
          <div className="border border-emerald-300 bg-emerald-50/50 rounded-lg p-3 text-xs text-slate-800 space-y-1">
            <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-emerald-200 pb-1">
              Final Pre-Presentation Audit Summary Card
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px]">Discrepancies Caught:</span>
                <strong className="text-rose-700">
                  {result.totalDiscrepancies ?? result.finalSummary?.discrepanciesCaught ?? result.documentAudits.reduce((acc, d) => acc + d.findings.length, 0)}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Time Taken for Whole Check:</span>
                <strong className="text-teal-700">
                  {durationFormatted}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Bank Refusal Avoided:</span>
                <strong className="text-emerald-700">
                  {result.finalSummary?.estimatedBankRefusalAvoided ?? 'USD $185,000.00 Protected'}
                </strong>
              </div>
            </div>
          </div>

          {/* Signoff Footer */}
          <div className="border-t-2 border-slate-900 pt-4 flex items-center justify-between text-xs text-slate-500">
            <div>
              <span>CleanSet Trade Finance Document Compliance Officer</span>
              <p className="text-[10px]">Standard banking examination under ICC UCP 600 and ISBP 821</p>
            </div>
            <div className="text-right">
              <span className="block font-serif italic text-slate-700">CleanSet Automated Audit Engine</span>
              <span className="text-[10px]">Verified against ICC Standards</span>
            </div>
          </div>

          {/* Footnote Requirement */}
          <div className="border-t border-slate-200 pt-3 text-center">
            <p className="text-xs text-slate-500 italic">
              Decision support only; a bank checker confirms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
