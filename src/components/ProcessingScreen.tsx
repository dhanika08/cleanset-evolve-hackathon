import React, { useEffect, useState } from 'react';
import { 
  FileSearch, 
  Scale, 
  BrainCircuit, 
  CheckCircle, 
  Award, 
  Loader2,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

interface ProcessingScreenProps {
  onComplete: () => void;
  isBackendReady: boolean;
}

interface PipelineStep {
  id: number;
  name: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: 1,
    name: '1. Read',
    subtitle: 'OCR & MT700 Document Ingestion',
    icon: FileSearch,
    description: 'Parsing SWIFT fields, invoice line items, transport identifiers, and certificates.',
  },
  {
    id: 2,
    name: '2. Rule Checks',
    subtitle: 'UCP 600 & ISBP 821 Standards',
    icon: Scale,
    description: 'Applying international standard banking practice rules (Art 14, 18, 20, 28, 30).',
  },
  {
    id: 3,
    name: '3. Judgement',
    subtitle: 'Cross-Document Consistency',
    icon: BrainCircuit,
    description: 'Comparing gross weights, container numbers, ports, Incoterms, and descriptions.',
  },
  {
    id: 4,
    name: '4. Verify',
    subtitle: 'Calculations & Calendar Boundaries',
    icon: CheckCircle,
    description: 'Auditing arithmetic multiplication, latest shipment deadlines, and presentation windows.',
  },
  {
    id: 5,
    name: '5. Verdict',
    subtitle: 'Compliance Scoring & Remediation',
    icon: Award,
    description: 'Synthesizing bank readiness verdict, risk score, and step-by-step fix roadmap.',
  },
];

const LOG_MESSAGES = [
  'Ingesting MT700 message and parsing Fields 20, 31D, 44C, 45A, 46A...',
  'Extracting line items and unit prices from Commercial Invoice...',
  'Scanning Bill of Lading for Shipped on Board notation and carrier signatures...',
  'Matching gross weights across Packing List and Transport Document...',
  'Evaluating goods description correspondence under UCP 600 Article 18(c)...',
  'Auditing insurance policy inception date against B/L on-board date (Art 28e)...',
  'Verifying container and seal numbers across shipping documents (ISBP 821)...',
  'Calculating 21-day presentation window and LC expiry margins...',
  'Checking arithmetic: Unit Price × Quantity = Line Total = Grand Total...',
  'Compiling prioritized exporter remediation roadmap...',
];

export const ProcessingScreen: React.FC<ProcessingScreenProps> = ({
  onComplete,
  isBackendReady,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentLogIndex, setCurrentLogIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(12);

  useEffect(() => {
    // Step progression timer
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < PIPELINE_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1100);

    // Logs ticker
    const logInterval = setInterval(() => {
      setCurrentLogIndex((prev) => (prev + 1) % LOG_MESSAGES.length);
    }, 900);

    // Progress bar
    const progressInterval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 95 && !isBackendReady) {
          return 95;
        }
        if (prev < 100) {
          return prev + 3;
        }
        return 100;
      });
    }, 120);

    return () => {
      clearInterval(stepInterval);
      clearInterval(logInterval);
      clearInterval(progressInterval);
    };
  }, [isBackendReady]);

  // When backend is ready and progress reaches high, complete
  useEffect(() => {
    if (isBackendReady && currentStepIndex >= 4) {
      const timeout = setTimeout(() => {
        onComplete();
      }, 700);
      return () => clearTimeout(timeout);
    }
  }, [isBackendReady, currentStepIndex, onComplete]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {/* Central Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-300 mb-4">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
          <span>Simulating Issuing &amp; Negotiating Bank Document Checker</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Executing Banking Compliance Examination
        </h2>
        <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto">
          Auditing every document clause against UCP 600 and ISBP 821 international trade finance standards.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mt-8">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-medium text-slate-300">
            Pipeline Stage {currentStepIndex + 1} of {PIPELINE_STEPS.length}: {PIPELINE_STEPS[currentStepIndex].name}
          </span>
          <span className="font-mono font-bold text-emerald-400">{progressPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-teal-500 via-emerald-500 to-emerald-400 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 5-Step Pipeline Card Grid */}
      <div className="mt-8 space-y-3">
        {PIPELINE_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const isPending = idx > currentStepIndex;

          return (
            <div
              key={step.id}
              className={`flex items-center justify-between rounded-2xl border p-4 transition-all duration-300 ${
                isCurrent
                  ? 'border-emerald-500/50 bg-slate-900 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                  : isDone
                  ? 'border-slate-800 bg-slate-950/70 text-slate-400'
                  : 'border-slate-800/40 bg-slate-950/30 opacity-60'
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${
                    isCurrent
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : isDone
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-bold ${isCurrent ? 'text-white' : isDone ? 'text-slate-200' : 'text-slate-400'}`}>
                      {step.name}
                    </h3>
                    <span className="text-xs text-slate-400">&mdash; {step.subtitle}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400 truncate">
                    {step.description}
                  </p>
                </div>
              </div>

              <div className="ml-4 flex-shrink-0">
                {isCurrent && (
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking
                  </span>
                )}
                {isDone && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                    <CheckCircle className="h-4 w-4" />
                    Verified
                  </span>
                )}
                {isPending && (
                  <span className="text-xs text-slate-500 font-mono">Queued</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Checker Audit Ticker */}
      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-teal-400" />
          <span>Real-time Checker Audit Stream</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs text-slate-300 bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800/80">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="truncate">{LOG_MESSAGES[currentLogIndex]}</span>
        </div>
      </div>
    </div>
  );
};
