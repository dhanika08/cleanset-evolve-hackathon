import React from 'react';
import { ShieldCheck, BookOpen, RotateCcw, Sparkles } from 'lucide-react';

interface NavbarProps {
  currentStep?: 'upload' | 'processing' | 'results';
  onReset?: () => void;
  onOpenUCPGuide?: () => void;
  onStartNewCheck?: () => void;
  modelBadge?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenUCPGuide,
  onStartNewCheck,
  modelBadge = 'Rules only (AI unavailable)',
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-white">CleanSet</span>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                UCP 600 • ISBP 821
              </span>
            </div>
            <p className="text-xs text-slate-400">Trade Finance AI Compliance & LC Document Checker</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-teal-400" />
            <span className="text-slate-400">Engine:</span>
            <span className="font-mono font-medium text-slate-200">{modelBadge}</span>
          </div>

          <button
            onClick={onOpenUCPGuide}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
            title="View UCP 600 and ISBP 821 Banking Rules Reference"
            aria-label="Banking Standards Reference"
          >
            <BookOpen className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Banking Rules</span>
          </button>

          {/* Clearly visible "Start new check" button in the header */}
          <button
            onClick={onStartNewCheck}
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3.5 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-900/60 hover:text-white hover:border-rose-500/60 transition-all shadow-sm"
            aria-label="Start new check"
            title="Remove all documents, LC, extracted fields, results, and start fresh"
          >
            <RotateCcw className="h-3.5 w-3.5 text-rose-400" />
            <span>Start new check</span>
          </button>
        </div>
      </div>
    </header>
  );
};
