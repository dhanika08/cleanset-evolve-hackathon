import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { UploadScreen } from './components/UploadScreen';
import { ProcessingScreen } from './components/ProcessingScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { UCPGuidelinesModal } from './components/UCPGuidelinesModal';
import { PrintableReport } from './components/PrintableReport';
import { CurrentSessionBanner } from './components/CurrentSessionBanner';
import { SAMPLE_CONSIGNMENTS } from './data/sampleConsignments';
import { LCDocumentData, ShippingDocument, ExaminationResult } from './types/compliance';
import { prepareLC, prepareDocument } from './utils/fieldExtractor';

export const EMPTY_LC: LCDocumentData = {
  lcNumber: '',
  issuingBank: '',
  applicant: '',
  beneficiary: '',
  currency: 'USD',
  amount: 0,
  expiryDate: '',
  expiryPlace: '',
  latestShipmentDate: '',
  presentationPeriodDays: 21,
  partialShipment: 'ALLOWED',
  transshipment: 'ALLOWED',
  portOfLoading: '',
  portOfDischarge: '',
  descriptionOfGoods: '',
  requiredDocuments: [],
  additionalConditions: [],
  rawText: '',
  extractedFields: {},
};

export default function App() {
  // Navigation step: upload -> processing -> results
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'results'>('upload');

  // Active consignment data: starts EMPTY on page reload
  const [activeLC, setActiveLC] = useState<LCDocumentData>(EMPTY_LC);
  const [documents, setDocuments] = useState<ShippingDocument[]>([]);

  // Examination outcome and session audit timestamps
  const [examResult, setExamResult] = useState<ExaminationResult | null>(null);
  const [lastExamTime, setLastExamTime] = useState<number | null>(null);
  const [lastDocChangeTime, setLastDocChangeTime] = useState<number | null>(null);
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [presentationDate, setPresentationDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [health, setHealth] = useState<{ geminiConfigured: boolean; model: string | null } | null>(null);

  // Modals
  const [isUCPGuideOpen, setIsUCPGuideOpen] = useState(false);
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

  // Scroll to top on step transitions
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Ask the server whether Gemini is configured and which model answers (the key never reaches the browser)
  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((h) => h && setHealth({ geminiConfigured: Boolean(h.geminiConfigured), model: h.model || null }))
      .catch(() => setHealth({ geminiConfigured: false, model: null }));
  }, []);

  // "Start new check": confirms with user, clears all LC, documents, fields, results, browser storage and server-side session cache
  const handleConfirmStartNewCheck = async () => {
    // 1. Clear browser storage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }

    // 2. Clear server-side session cache
    try {
      await fetch('/api/clear-session', { method: 'POST' }).catch(() => {});
    } catch {
      // ignore
    }

    // 3. Reset all state to clean empty
    setActiveLC(EMPTY_LC);
    setDocuments([]);
    setExamResult(null);
    setLastExamTime(null);
    setLastDocChangeTime(null);
    setErrorMessage(null);
    setCurrentStep('upload');
    setIsConfirmResetOpen(false);
  };

  // Preset loader: first clears all existing data, then loads the demo scenario
  const handleLoadSample = async (sampleId: string) => {
    // 1. Clear all existing data, storage, and server cache first
    try {
      localStorage.clear();
      sessionStorage.clear();
      await fetch('/api/clear-session', { method: 'POST' }).catch(() => {});
    } catch {
      // ignore
    }

    setExamResult(null);
    setDocuments([]);
    setLastExamTime(null);
    setLastDocChangeTime(null);
    setErrorMessage(null);

    // 2. Load the requested demo scenario
    const sample = SAMPLE_CONSIGNMENTS.find((s) => s.id === sampleId);
    if (sample) {
      if (sample.presentationDate) {
        setPresentationDate(sample.presentationDate);
      }
      const now = Date.now();
      // The raw MT700 is the source: Fields and Form are both built from it, so the three tabs agree
      const lc = prepareLC({ ...sample.lc, extractedFields: undefined });
      setActiveLC({
        ...lc,
        fileName: `MT700_${(lc.lcNumber || 'sample').replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`,
        uploadTime: now,
      });
      setDocuments(sample.documents.map((d) => ({ ...prepareDocument(d), uploadTime: now })));
      if (currentStep === 'results') setCurrentStep('upload');
      setLastDocChangeTime(now);
    }
  };

  // Add document: record upload time and clear results screen
  const handleAddDocument = (newDoc: ShippingDocument) => {
    const now = Date.now();
    const docWithTime: ShippingDocument = {
      ...newDoc,
      uploadTime: newDoc.uploadTime || now,
    };
    setDocuments((prev) => [...prev, docWithTime]);
    // The results screen must be cleared when any document is added, removed or replaced
    setExamResult(null);
    if (currentStep === 'results') setCurrentStep('upload');
    setLastDocChangeTime(now);
  };

  // Remove document: clear results screen
  const handleRemoveDocument = (docId: string) => {
    const now = Date.now();
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    // The results screen must be cleared when any document is added, removed or replaced
    setExamResult(null);
    if (currentStep === 'results') setCurrentStep('upload');
    setLastDocChangeTime(now);
  };

  // Update/replace document: record new upload/replace time and clear results screen
  const handleUpdateDocument = (updatedDoc: ShippingDocument) => {
    const now = Date.now();
    const docWithTime: ShippingDocument = {
      ...updatedDoc,
      uploadTime: now,
    };
    setDocuments((prev) => prev.map((d) => (d.id === updatedDoc.id ? docWithTime : d)));
    // The results screen must be cleared when any document is added, removed or replaced
    setExamResult(null);
    if (currentStep === 'results') setCurrentStep('upload');
    setLastDocChangeTime(now);
  };

  // Update/replace LC: record new upload time and clear results screen
  const handleUpdateLC = (updatedLC: LCDocumentData) => {
    const now = Date.now();
    const lcWithTime: LCDocumentData = {
      ...updatedLC,
      uploadTime: now,
    };
    setActiveLC(lcWithTime);
    // The results screen must be cleared when any document is added, removed or replaced
    setExamResult(null);
    if (currentStep === 'results') setCurrentStep('upload');
    setLastDocChangeTime(now);
  };

  // Outdated warning: true whenever any document/LC changed after the last examination run
  const isOutdated = Boolean(
    lastExamTime !== null &&
    (
      (lastDocChangeTime !== null && lastDocChangeTime > lastExamTime) ||
      (activeLC.uploadTime && activeLC.uploadTime > lastExamTime) ||
      documents.some((d) => Boolean(d.uploadTime && d.uploadTime > lastExamTime))
    )
  );

  // Start examination with exponential backoff on 429 / quota error (up to 4 tries)
  const handleStartExamination = async () => {
    setErrorMessage(null);
    setIsBackendReady(false);
    setCurrentStep('processing');

    const payload = {
      lc: activeLC,
      documents,
      presentationDate,
    };

    let finalResult: ExaminationResult | null = null;
    try {
      const response = await fetch('/api/examine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      finalResult = data.result || data;
    } catch (err: any) {
      console.error('Examination error:', err);
      setErrorMessage(err.message || 'Failed to complete examination.');
      setCurrentStep('upload');
      return;
    }

    if (finalResult) {
      setLastExamTime(Date.now());
      setExamResult(finalResult);
      setIsBackendReady(true);
    }
  };

  // Reset to upload screen
  const handleReset = () => {
    setCurrentStep('upload');
    setExamResult(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navbar */}
      <Navbar
        currentStep={currentStep}
        onReset={handleReset}
        onStartNewCheck={() => setIsConfirmResetOpen(true)}
        onOpenUCPGuide={() => setIsUCPGuideOpen(true)}
        modelBadge={examResult?.pipelineStats?.modelUsed || (health === null ? 'Checking AI…' : health.geminiConfigured && health.model ? health.model : 'Rules only (no API key)')}
      />

      {/* Current Session Banner at the top */}
      <CurrentSessionBanner
        lc={activeLC}
        documents={documents}
        lastExamTime={lastExamTime}
        isOutdated={isOutdated}
        onRunExamination={handleStartExamination}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {errorMessage && (
          <div className="mx-auto max-w-5xl px-4 pt-4">
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-xs text-rose-300 flex items-center justify-between">
              <span><strong>Notice:</strong> {errorMessage}</span>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {currentStep === 'upload' && (
          <UploadScreen
            lc={activeLC}
            documents={documents}
            presentationDate={presentationDate}
            onUpdatePresentationDate={setPresentationDate}
            onUpdateLC={handleUpdateLC}
            onAddDocument={handleAddDocument}
            onRemoveDocument={handleRemoveDocument}
            onUpdateDocument={handleUpdateDocument}
            onLoadSample={handleLoadSample}
            onStartExamination={handleStartExamination}
          />
        )}

        {currentStep === 'processing' && (
          <ProcessingScreen
            isBackendReady={isBackendReady}
            onComplete={() => setCurrentStep('results')}
          />
        )}

        {currentStep === 'results' && examResult && (
          <ResultsScreen
            result={examResult}
            onReset={handleReset}
            onPrint={() => setIsPrintReportOpen(true)}
            onModifyAndRecheck={() => setCurrentStep('upload')}
          />
        )}
      </main>

      {/* Confirmation Modal: Start New Check */}
      {isConfirmResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 flex-shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Start new check?</h3>
                <p className="text-xs text-slate-400">Confirmation required</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Are you sure? This will remove the Letter of Credit, all uploaded documents, extracted fields, examination results, and all saved session data.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmResetOpen(false)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStartNewCheck}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition-colors shadow-lg shadow-rose-950/40"
              >
                Yes, Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-300">CleanSet</span>
            <span>&bull; AI Trade Finance &amp; LC Document Compliance Examination</span>
          </div>
          <div className="text-slate-400 font-medium italic">
            Decision support only; a bank checker confirms.
          </div>
          <div className="text-slate-500 text-[11px]">
            ICC UCP 600 &amp; ISBP 821
          </div>
        </div>
      </footer>

      {/* Modals */}
      <UCPGuidelinesModal
        isOpen={isUCPGuideOpen}
        onClose={() => setIsUCPGuideOpen(false)}
      />

      {examResult && (
        <PrintableReport
          isOpen={isPrintReportOpen}
          result={examResult}
          lc={activeLC}
          documents={documents}
          onClose={() => setIsPrintReportOpen(false)}
        />
      )}
    </div>
  );
}
