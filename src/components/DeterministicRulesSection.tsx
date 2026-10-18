import React, { useState } from 'react';
import { 
  Cpu, 
  CheckCircle2, 
  AlertOctagon, 
  MinusCircle, 
  FileText, 
  Tag, 
  ArrowRight,
  ShieldCheck,
  Check,
  Code
} from 'lucide-react';
import { RuleResult } from '../types/compliance';

interface DeterministicRulesSectionProps {
  rules: RuleResult[];
}

export const DeterministicRulesSection: React.FC<DeterministicRulesSectionProps> = ({ rules }) => {
  const [filter, setFilter] = useState<'all' | 'discrepant' | 'passed'>('all');

  const discrepancyCount = rules.filter((r) => r.status === 'DISCREPANCY').length;
  const passCount = rules.filter((r) => r.status === 'PASS').length;

  const filteredRules = rules.filter((r) => {
    if (filter === 'discrepant') return r.status === 'DISCREPANCY';
    if (filter === 'passed') return r.status === 'PASS';
    return true;
  });

  const sortedRules = [...filteredRules].sort((a, b) => {
    if (a.status === 'DISCREPANCY' && b.status !== 'DISCREPANCY') return -1;
    if (a.status !== 'DISCREPANCY' && b.status === 'DISCREPANCY') return 1;
    return 0;
  });

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-teal-500/10 p-2 text-teal-400 border border-teal-500/20">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Deterministic Banking Rules Engine
              </h2>
              <span className="rounded bg-teal-500/20 px-2 py-0.5 text-[10px] font-bold text-teal-300 border border-teal-500/30">
                Source: Rule
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Evaluated in pure logic (no LLM) against international ICC UCP 600 &amp; ISBP 821 standards (Discrepancies first)
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-md px-3 py-1 font-medium transition-colors ${
              filter === 'all'
                ? 'bg-slate-800 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Rules ({rules.length})
          </button>
          <button
            onClick={() => setFilter('discrepant')}
            className={`rounded-md px-3 py-1 font-medium transition-colors ${
              filter === 'discrepant'
                ? 'bg-slate-800 text-rose-300 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Discrepancies ({discrepancyCount})
          </button>
          <button
            onClick={() => setFilter('passed')}
            className={`rounded-md px-3 py-1 font-medium transition-colors ${
              filter === 'passed'
                ? 'bg-slate-800 text-emerald-300 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Passed ({passCount})
          </button>
        </div>
      </div>

      {/* Rules Grid: Discrepancies first */}
      <div className="space-y-3">
        {sortedRules.map((rule) => {
          const isPass = rule.status === 'PASS';
          const isDiscrepancy = rule.status === 'DISCREPANCY';
          const isNA = rule.status === 'NOT_APPLICABLE';

          return (
            <div
              key={rule.id}
              className={`rounded-xl border p-4 transition-all ${
                isDiscrepancy
                  ? 'border-rose-900/40 bg-rose-950/10'
                  : isPass
                  ? 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                  : 'border-slate-800/60 bg-slate-950/40 opacity-70'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-800/60">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                      isPass
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : isDiscrepancy
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {isPass && <CheckCircle2 className="h-3 w-3" />}
                    {isDiscrepancy && <AlertOctagon className="h-3 w-3" />}
                    {isNA && <MinusCircle className="h-3 w-3" />}
                    {rule.status}
                  </span>

                  <h3 className="text-xs font-bold text-white">{rule.title}</h3>

                  <span className="rounded bg-teal-500/10 px-2 py-0.5 text-[10px] font-bold text-teal-400 border border-teal-500/20">
                    Source: {rule.source}
                  </span>
                </div>

                <span className="font-mono text-[11px] text-teal-300 bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800">
                  {rule.ucp_article}
                </span>
              </div>

              {/* Explanation */}
              <p className="mt-2.5 text-xs text-slate-300 leading-relaxed">
                {rule.explanation}
              </p>

              {/* In-depth metadata: Documents involved & Fields used */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-900 text-[11px]">
                <div className="flex items-center gap-1 text-slate-400">
                  <FileText className="h-3 w-3 text-slate-500" />
                  <span className="font-medium">Docs:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {rule.documents_involved.map((doc, idx) => (
                      <span key={idx} className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                        {doc}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-slate-400 ml-auto">
                  <Code className="h-3 w-3 text-slate-500" />
                  <span className="font-medium">Fields:</span>
                  <div className="flex items-center gap-1 flex-wrap font-mono text-[10px] text-slate-400">
                    {rule.fields_used.map((field, idx) => (
                      <span key={idx} className="rounded bg-slate-900 px-1.5 py-0.5 text-slate-400 border border-slate-800">
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* If discrepancy: show observed, required, and remediation */}
              {isDiscrepancy && (rule.expectedValue || rule.foundValue || rule.remediation) && (
                <div className="mt-3 pt-2.5 border-t border-rose-900/30 space-y-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                    {rule.foundValue && (
                      <div className="rounded bg-slate-950 p-2 border border-slate-800">
                        <span className="text-[10px] text-rose-400 uppercase font-semibold block">Observed Value:</span>
                        <span className="text-slate-200">{rule.foundValue}</span>
                      </div>
                    )}
                    {rule.expectedValue && (
                      <div className="rounded bg-slate-950 p-2 border border-slate-800">
                        <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Expected by UCP:</span>
                        <span className="text-slate-200">{rule.expectedValue}</span>
                      </div>
                    )}
                  </div>
                  {rule.remediation && (
                    <div className="rounded bg-slate-900 p-2 text-slate-300 border border-slate-800 text-xs">
                      <strong className="text-emerald-400">Remediation:</strong> {rule.remediation}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
