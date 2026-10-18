import React from 'react';
import { X, BookOpen, CheckCircle, AlertTriangle } from 'lucide-react';

interface UCPGuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UCPGuidelinesModal: React.FC<UCPGuidelinesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ucp-rules-title"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 id="ucp-rules-title" className="text-lg font-bold text-white">
                ICC UCP 600 & ISBP 821 Examination Rules
              </h2>
              <p className="text-xs text-slate-400">International banking standards applied by document examiners</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm text-slate-300">
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="font-semibold text-emerald-400 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              UCP 600 Article 14: Standard for Examination of Documents
            </h3>
            <ul className="mt-2 list-disc list-inside space-y-1.5 text-xs text-slate-300">
              <li><strong>Article 14(a):</strong> A nominated bank or issuing bank must examine a presentation to determine, on the basis of the documents alone, whether or not the documents appear on their face to constitute a complying presentation.</li>
              <li><strong>Article 14(c):</strong> A presentation including one or more original transport documents must be made not later than 21 calendar days after the date of shipment, but in any event not later than the expiry date of the credit.</li>
              <li><strong>Article 14(d):</strong> Data in a document, when read in context with the credit, the document itself and international standard banking practice, need not be identical to, but must not conflict with, data in that document, any other stipulated document or the credit.</li>
              <li><strong>Article 14(e):</strong> In documents other than the commercial invoice, the description of goods may be in general terms not conflicting with their description in the credit.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="font-semibold text-emerald-400 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              UCP 600 Article 18: Commercial Invoice
            </h3>
            <ul className="mt-2 list-disc list-inside space-y-1.5 text-xs text-slate-300">
              <li><strong>Article 18(a)(i-iii):</strong> Must appear to have been issued by the beneficiary, made out in the name of the applicant, and issued in the same currency as the credit.</li>
              <li><strong>Article 18(b):</strong> A nominated bank may accept a commercial invoice issued for an amount in excess of the amount permitted by the credit, and its decision will be binding upon all parties, provided it has not honoured or negotiated for an amount in excess of that permitted.</li>
              <li><strong>Article 18(c):</strong> The description of the goods, services or performance in a commercial invoice <strong>must correspond with that in the credit</strong> (strict compliance).</li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="font-semibold text-emerald-400 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              UCP 600 Article 20: Bill of Lading (Transport Documents)
            </h3>
            <ul className="mt-2 list-disc list-inside space-y-1.5 text-xs text-slate-300">
              <li><strong>Article 20(a)(ii):</strong> Must indicate that the goods have been shipped on board a named vessel at the port of loading stated in the credit, by pre-printed wording or an on-board notation indicating the date on which the goods have been shipped on board.</li>
              <li><strong>Article 20(a)(iii):</strong> Must indicate shipment from the port of loading to the port of discharge stated in the credit.</li>
              <li><strong>Article 27:</strong> A bank will only accept a clean transport document. A clean transport document is one bearing no clause or notation expressly declaring a defective condition of the goods or their packaging.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4 text-amber-200">
            <h3 className="font-semibold text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              UCP 600 Article 28: Insurance Document and Coverage
            </h3>
            <p className="mt-1 text-xs text-amber-200/90">
              The date of the insurance document must be <strong>no later than the date of shipment</strong>, unless it appears from the insurance document that the cover is effective from a date not later than the date of shipment. Minimum coverage is 110% of CIF or CIP value.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            Close Rules Reference
          </button>
        </div>
      </div>
    </div>
  );
};
