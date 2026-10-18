import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  UploadCloud, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  FileCheck, 
  ArrowRight,
  Sparkles,
  Edit3,
  Layers,
  FileCode,
  Eye,
  Camera,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  FileX,
  Loader2
} from 'lucide-react';
import type { LCDocumentData, ShippingDocument, DocumentType, ExtractedFieldsMap } from '../types/compliance';
import { SAMPLE_CONSIGNMENTS } from '../data/sampleConsignments';
import { ExtractedFieldsPanel } from './ExtractedFieldsPanel';
import {
  extractFieldsWithDeterministicRules,
  normalizeExtractedFields,
  buildLCData,
  lcDataToMT700,
  hasAnyExtractedValue,
  detectDocumentType,
} from '../utils/fieldExtractor';

const isPlaceholder = (t?: string | null) => !t || !t.trim() || /^\[(PDF|Image|Uploaded image)/i.test(t.trim());

const EMPTY_LC_FORM: LCDocumentData = {
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

interface UploadScreenProps {
  lc: LCDocumentData;
  documents: ShippingDocument[];
  presentationDate?: string;
  onUpdatePresentationDate?: (date: string) => void;
  onUpdateLC: (updatedLC: LCDocumentData) => void;
  onAddDocument: (doc: ShippingDocument) => void;
  onRemoveDocument: (docId: string) => void;
  onUpdateDocument: (doc: ShippingDocument) => void;
  onLoadSample: (sampleId: string) => void;
  onStartExamination: () => void;
}

const DOC_TYPE_OPTIONS: { type: DocumentType; label: string; icon: string }[] = [
  { type: 'COMMERCIAL_INVOICE', label: 'Commercial Invoice', icon: '📄' },
  { type: 'BILL_OF_LADING', label: 'Bill of Lading / Transport Doc', icon: '🚢' },
  { type: 'PACKING_LIST', label: 'Packing List', icon: '📦' },
  { type: 'CERTIFICATE_OF_ORIGIN', label: 'Certificate of Origin', icon: '🌍' },
  { type: 'INSURANCE_CERTIFICATE', label: 'Insurance Policy / Certificate', icon: '🛡️' },
  { type: 'INSPECTION_CERTIFICATE', label: 'Inspection / Phyto Certificate', icon: '🔍' },
  { type: 'OTHER', label: 'Other Stipulated Document', icon: '📎' },
];

export const UploadScreen: React.FC<UploadScreenProps> = ({
  lc,
  documents,
  presentationDate,
  onUpdatePresentationDate,
  onUpdateLC,
  onAddDocument,
  onRemoveDocument,
  onUpdateDocument,
  onLoadSample,
  onStartExamination,
}) => {
  const [activeTab, setActiveTab] = useState<'extracted' | 'mt700' | 'structured'>('extracted');
  const [previewDoc, setPreviewDoc] = useState<ShippingDocument | null>(null);
  const [isAddingCustomDoc, setIsAddingCustomDoc] = useState(false);
  const [newDocType, setNewDocType] = useState<DocumentType>('COMMERCIAL_INVOICE');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  
  // Track which document field drawers are expanded in slot 2
  const [expandedDocIds, setExpandedDocIds] = useState<Record<string, boolean>>({});
  const [isExtractingLC, setIsExtractingLC] = useState(false);
  const [extractingDocIds, setExtractingDocIds] = useState<Record<string, boolean>>({});

  // Helpful error messages if a file is unreadable
  const [unreadableFileErrors, setUnreadableFileErrors] = useState<{
    id: string;
    fileName: string;
    reason: string;
    suggestion: string;
  }[]>([]);

  const addUnreadableError = (fileName: string, reason: string, suggestion: string, isLC = false) => {
    setUnreadableFileErrors((prev) => [
      ...prev.filter((e) => e.fileName !== fileName),
      {
        id: (isLC ? 'lc-err-' : 'doc-err-') + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        fileName,
        reason,
        suggestion,
      },
    ]);
  };

  const removeUnreadableError = (id: string) => {
    setUnreadableFileErrors((prev) => prev.filter((e) => e.id !== id));
  };

  const clearAllUnreadableErrors = () => {
    setUnreadableFileErrors([]);
  };

  // Automatically clear any unreadable errors if a clean empty session is active
  useEffect(() => {
    if (!lc.rawText && !lc.fileBase64 && (!lc.lcNumber || lc.lcNumber === 'Pending / None') && documents.length === 0) {
      setUnreadableFileErrors([]);
      setBusyNotice(null);
    }
  }, [lc.rawText, lc.fileBase64, lc.lcNumber, documents.length]);

  const lcFileInputRef = useRef<HTMLInputElement>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------------------------
  // LC: one source of truth. Fields tab = lc.extractedFields; Form tab = buildLCData(fields);
  // Raw MT700 tab = lc.rawText. Every change goes through applyLCFields so the three never disagree.
  // ---------------------------------------------------------------------------------------------
  const hasExtractedLC = hasAnyExtractedValue(lc.extractedFields);
  const lcFields = hasExtractedLC
    ? lc.extractedFields!
    : (lc.rawText && !isPlaceholder(lc.rawText) ? extractFieldsWithDeterministicRules('LETTER_OF_CREDIT', lc.rawText) : {});

  const [busyNotice, setBusyNotice] = useState<string | null>(null);

  /** Builds the LC state (Form values) from a field map. */
  const applyLCFields = (base: LCDocumentData, fields: ExtractedFieldsMap, rawText?: string): LCDocumentData => {
    const normalized = normalizeExtractedFields('LETTER_OF_CREDIT', fields);
    return buildLCData(normalized, {
      ...base,
      rawText: rawText ?? base.rawText,
      extractedFields: normalized,
    });
  };

  /** Calls the extraction endpoint (the server retries Gemini and falls back to the rule extractor). */
  const fetchExtract = async (payload: any, label = 'document') => {
    try {
      setBusyNotice(`Reading ${label}…`);
      const response = await fetch('/api/extract-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.warn('Extraction endpoint returned', response.status, data);
        return { fields: {}, success: false, engine: 'none' } as any;
      }
      if (data?.geminiError) {
        setBusyNotice(`AI extraction unavailable for ${label} (${data.geminiError}). Used the rule-based extractor; please review the fields.`);
        setTimeout(() => setBusyNotice(null), 6000);
      } else {
        setBusyNotice(null);
      }
      return data;
    } catch (err: any) {
      console.warn('Extraction request failed:', err?.message);
      setBusyNotice(null);
      return { fields: {}, success: false, engine: 'none' } as any;
    }
  };

  // Re-extract the LC (button "Extract fields")
  const handleExtractLCFields = async () => {
    setIsExtractingLC(true);
    try {
      const data = await fetchExtract(
        {
          docType: 'LETTER_OF_CREDIT',
          rawText: isPlaceholder(lc.rawText) ? undefined : lc.rawText,
          fileBase64: lc.fileBase64,
          mimeType: lc.mimeType,
          fileName: lc.fileName,
          bypassCache: true,
        },
        'Letter of Credit'
      );
      const rawToUse = data?.rawText && !isPlaceholder(data.rawText) ? data.rawText : lc.rawText;
      const fields = hasAnyExtractedValue(data?.fields)
        ? data.fields
        : extractFieldsWithDeterministicRules('LETTER_OF_CREDIT', isPlaceholder(rawToUse) ? '' : rawToUse || '');
      onUpdateLC({ ...applyLCFields(lc, fields, rawToUse), extractedBy: data?.engine === 'gemini' ? 'gemini' : 'rules' });
    } finally {
      setIsExtractingLC(false);
    }
  };

  // Fields tab edit -> Form + Raw MT700
  const handleUpdateLCField = (key: string, newValue: any) => {
    const current: ExtractedFieldsMap = { ...(lc.extractedFields || lcFields) };
    current[key] = { ...(current[key] || { source_snippet: null }), value: newValue };
    if (key === 'amount') current.lc_amount = current.amount;
    const updated = applyLCFields(lc, current);
    // Keep the Raw MT700 tab in step when the LC came from text (not a PDF/image)
    if (!lc.fileBase64) updated.rawText = lcDataToMT700(updated);
    onUpdateLC(updated);
  };

  // Form tab edit -> Fields + Raw MT700. The typed value is kept as typed (so dates/amounts can be typed
  // character by character); the matching extracted field and the MT700 text are updated alongside.
  const FORM_TO_FIELD: Record<string, string> = {
    lcNumber: 'lc_number',
    currency: 'currency',
    amount: 'amount',
    applicant: 'applicant',
    beneficiary: 'beneficiary',
    latestShipmentDate: 'latest_shipment_date',
    expiryDate: 'expiry_date',
    descriptionOfGoods: 'goods_description',
    portOfLoading: 'port_of_loading',
    portOfDischarge: 'port_of_discharge',
    partialShipment: 'partial_shipments_allowed',
    transshipment: 'transshipment_allowed',
    presentationPeriodDays: 'presentation_period',
  };
  const handleUpdateLCForm = (formKey: keyof LCDocumentData, value: any) => {
    const merged: LCDocumentData = { ...lc, [formKey]: value } as LCDocumentData;
    const fields: ExtractedFieldsMap = { ...(lc.extractedFields || lcFields) };
    const fieldKey = FORM_TO_FIELD[formKey as string];
    if (fieldKey) {
      const fieldValue =
        formKey === 'partialShipment' || formKey === 'transshipment' ? value === 'ALLOWED' : value;
      fields[fieldKey] = { ...(fields[fieldKey] || { source_snippet: null }), value: fieldValue };
      if (fieldKey === 'amount') fields.lc_amount = fields.amount;
    }
    onUpdateLC({
      ...merged,
      extractedFields: fields,
      rawText: lc.fileBase64 ? lc.rawText : lcDataToMT700(merged),
    });
  };

  // Raw MT700 tab edit -> Fields + Form
  const handleRawMT700Change = (newText: string) => {
    const extracted = extractFieldsWithDeterministicRules('LETTER_OF_CREDIT', newText);
    onUpdateLC(applyLCFields({ ...EMPTY_LC_FORM, fileName: lc.fileName, uploadTime: lc.uploadTime, presentationDate: lc.presentationDate }, extracted, newText));
  };

  // Extract fields for a specific document
  const handleExtractDocumentFields = async (doc: ShippingDocument) => {
    setExtractingDocIds((prev) => ({ ...prev, [doc.id]: true }));
    try {
      const data = await fetchExtract(
        {
          docType: doc.type,
          rawText: isPlaceholder(doc.rawText) ? undefined : doc.rawText,
          fileBase64: doc.fileBase64,
          mimeType: doc.mimeType,
          fileName: doc.fileName,
          bypassCache: true,
        },
        doc.title || doc.fileName
      );
      const fields = hasAnyExtractedValue(data?.fields)
        ? data.fields
        : extractFieldsWithDeterministicRules(doc.type, isPlaceholder(doc.rawText) ? '' : doc.rawText || '');
      onUpdateDocument({
        ...doc,
        rawText: data?.rawText && !isPlaceholder(data.rawText) ? data.rawText : doc.rawText,
        extractedFields: fields,
        extractedBy: data?.engine === 'gemini' ? 'gemini' : hasAnyExtractedValue(fields) ? 'rules' : 'none',
      });
    } finally {
      setExtractingDocIds((prev) => ({ ...prev, [doc.id]: false }));
    }
  };

  // Change the type of a document (when the file name did not tell us)
  const handleChangeDocumentType = (doc: ShippingDocument, newType: DocumentType) => {
    const fields = isPlaceholder(doc.rawText) ? {} : extractFieldsWithDeterministicRules(newType, doc.rawText || '');
    const updated = { ...doc, type: newType, extractedFields: fields };
    onUpdateDocument(updated);
    if (doc.fileBase64) handleExtractDocumentFields(updated);
  };

  // Update a single document field
  const handleUpdateDocumentField = (doc: ShippingDocument, key: string, newValue: any) => {
    const currentFields = doc.extractedFields || extractFieldsWithDeterministicRules(doc.type, doc.rawText);
    const updatedFields = {
      ...currentFields,
      [key]: {
        ...(currentFields[key] || { source_snippet: null }),
        value: newValue,
      },
    };
    onUpdateDocument({
      ...doc,
      extractedFields: updatedFields,
    });
  };

  const toggleDocExpand = (docId: string) => {
    setExpandedDocIds((prev) => ({
      ...prev,
      [docId]: !prev[docId],
    }));
  };

  /** Tells the user when the file in Slot 1 is not an MT700 (an invoice, an MT707 amendment, ...). */
  const warnIfNotAnLC = (fileName: string, text: string, fields: ExtractedFieldsMap, serverType?: DocumentType) => {
    const t = (text || '').toUpperCase();
    if (/\bMT\s?707\b|:26E:|AMENDMENT TO A DOCUMENTARY CREDIT/.test(t) && !/:46A:|:45A:/.test(t)) {
      addUnreadableError(
        fileName,
        'This is an MT707 amendment, not the original MT700.',
        'Upload the MT700 first, then apply the amended fields in the Form tab.',
        true
      );
      return;
    }
    const type = text ? detectDocumentType(text, fileName) : serverType;
    const hasCore = Boolean(fields.lc_number?.value) && (Boolean(fields.amount?.value) || Boolean(fields.expiry_date?.value));
    if ((type && type !== 'LETTER_OF_CREDIT' && type !== 'OTHER') || !hasCore) {
      addUnreadableError(
        fileName,
        `This does not look like a Letter of Credit${type && type !== 'OTHER' && type !== 'LETTER_OF_CREDIT' ? ` (it looks like a ${type.replace(/_/g, ' ').toLowerCase()})` : ''}.`,
        'Upload the MT700 (PDF, TXT or SWIFT FIN text) in Slot 1, or paste it in the Raw MT700 tab.',
        true
      );
    }
  };

  // Handle LC file upload (TXT / SWIFT / FIN text is parsed in the browser; PDF / image goes to the server)
  const handleLCFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUnreadableFileErrors((prev) => prev.filter((err) => !err.id.startsWith('lc-err-') && err.fileName !== file.name));

    if (file.size === 0) {
      addUnreadableError(
        file.name,
        'File is completely empty (0 bytes).',
        'Please export the MT700 swift transmission or credit document with valid content.',
        true
      );
      e.target.value = '';
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');
    const isBinary = isPdf || isImage;

    const reader = new FileReader();
    reader.onerror = () => {
      addUnreadableError(
        file.name,
        'Disk read error: Browser could not read the selected file.',
        'Check file permissions or try moving the file to your desktop and re-uploading.',
        true
      );
    };

    reader.onload = async (event) => {
      const content = event.target?.result as string;

      if (isBinary) {
        const mimeType = isPdf ? 'application/pdf' : (file.type || 'image/jpeg');
        const placeholder = isPdf ? `[PDF Letter of Credit: ${file.name}]` : `[Image Letter of Credit: ${file.name}]`;
        const freshLC: LCDocumentData = {
          ...EMPTY_LC_FORM,
          fileName: file.name,
          rawText: placeholder,
          fileBase64: content,
          mimeType,
          extractedFields: {},
        };
        onUpdateLC(freshLC);

        setIsExtractingLC(true);
        try {
          const data = await fetchExtract(
            { docType: 'LETTER_OF_CREDIT', fileBase64: content, mimeType, fileName: file.name },
            'Letter of Credit'
          );
          const rawLC = data?.rawText && !isPlaceholder(data.rawText) ? data.rawText : placeholder;
          const fields = hasAnyExtractedValue(data?.fields)
            ? data.fields
            : (!isPlaceholder(rawLC) ? extractFieldsWithDeterministicRules('LETTER_OF_CREDIT', rawLC) : {});
          if (!hasAnyExtractedValue(fields)) {
            addUnreadableError(
              file.name,
              'No text could be read from this Letter of Credit (scanned image and AI extraction unavailable).',
              'Paste the MT700 text into the Raw MT700 tab, or upload a text-based PDF / .txt file.',
              true
            );
          } else {
            warnIfNotAnLC(file.name, isPlaceholder(rawLC) ? '' : rawLC, fields, data?.detectedType);
          }
          onUpdateLC({ ...applyLCFields(freshLC, fields, rawLC), extractedBy: data?.engine === 'gemini' ? 'gemini' : hasAnyExtractedValue(fields) ? 'rules' : 'none' });
        } finally {
          setIsExtractingLC(false);
        }
        return;
      }

      if (!content || content.trim().length === 0) {
        addUnreadableError(
          file.name,
          'Empty text file: No characters found.',
          'Please paste the MT700 text into the MT700 tab or upload a valid file.',
          true
        );
        return;
      }

      const fields = extractFieldsWithDeterministicRules('LETTER_OF_CREDIT', content);
      warnIfNotAnLC(file.name, content, fields);
      onUpdateLC({ ...applyLCFields({ ...EMPTY_LC_FORM, fileName: file.name }, fields, content), extractedBy: 'rules' });
    };

    if (isBinary) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  // Handle document file upload (multi-file: processed one after another with short delay per Requirement 2)
  const handleDocumentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    e.target.value = '';

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      // Clear any previous error for this document
      setUnreadableFileErrors((prev) => prev.filter((err) => err.fileName !== file.name));
      await new Promise<void>((resolve) => {
        if (file.size === 0) {
          addUnreadableError(
            file.name,
            'File is completely empty (0 bytes).',
            'Please select a valid document containing invoice, transport, or packing details.'
          );
          resolve();
          return;
        }

        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const isImage = file.type.startsWith('image/');
        const isBinary = isPdf || isImage;

        const reader = new FileReader();

        reader.onerror = () => {
          addUnreadableError(
            file.name,
            'Browser encountered an error reading the file from storage.',
            'Please check file read permissions or try re-exporting the document.'
          );
          resolve();
        };

        reader.onload = async (event) => {
          const content = event.target?.result as string;

          if (!isBinary && (!content || content.trim().length === 0)) {
            addUnreadableError(
              file.name,
              'Empty file: Document contains no text characters.',
              'Upload a valid file or click "Paste Text Manually" to input details directly.'
            );
            resolve();
            return;
          }

          // Type from the content (text files) or the file name (PDF/image; the server re-detects from content)
          let detectedType: DocumentType = detectDocumentType(isBinary ? '' : content, file.name);

          const docTitle = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
          const rawDocText = isPdf
            ? `[PDF document: ${file.name}]`
            : isImage
            ? `[Uploaded image document: ${file.name} - Extracted by CleanSet Vision]`
            : content;

          const docMime = isPdf ? 'application/pdf' : (isImage ? (file.type || 'image/jpeg') : undefined);
          const initialFields = isBinary
            ? {}
            : extractFieldsWithDeterministicRules(detectedType, rawDocText);

          const docId = 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
          const newDoc: ShippingDocument = {
            id: docId,
            type: detectedType,
            title: docTitle,
            fileName: file.name,
            fileSize: `${Math.round(file.size / 1024)} KB`,
            rawText: rawDocText,
            mimeType: docMime,
            fileBase64: isBinary ? content : undefined,
            extractedFields: initialFields,
          };
          onAddDocument(newDoc);

          // For PDFs and images: send base64 inline data directly to Gemini model
          if (isBinary) {
            setExtractingDocIds((prev) => ({ ...prev, [docId]: true }));
            try {
              let data = await fetchExtract(
                { docType: detectedType, fileBase64: content, mimeType: docMime, fileName: file.name },
                docTitle
              );
              // The file name did not say what this is: use the type detected from the content and re-read
              let finalType = detectedType;
              if (detectedType === 'OTHER' && data?.detectedType && data.detectedType !== 'OTHER' && data.detectedType !== 'LETTER_OF_CREDIT') {
                finalType = data.detectedType;
                data = await fetchExtract(
                  { docType: finalType, rawText: data.rawText, fileBase64: content, mimeType: docMime, fileName: file.name },
                  docTitle
                );
              }
              const readText = data?.rawText && !isPlaceholder(data.rawText) ? data.rawText : newDoc.rawText;
              const fields = hasAnyExtractedValue(data?.fields) ? data.fields : {};
              if (!hasAnyExtractedValue(fields)) {
                addUnreadableError(
                  file.name,
                  'No text could be read from this document (scanned image and AI extraction unavailable).',
                  'Upload a text-based PDF, or use "Paste Text Manually" to enter the document text.'
                );
              }
              onUpdateDocument({
                ...newDoc,
                type: finalType,
                rawText: readText,
                extractedFields: fields,
                extractedBy: data?.engine === 'gemini' ? 'gemini' : hasAnyExtractedValue(fields) ? 'rules' : 'none',
              });
            } catch (err: any) {
              console.warn('PDF document extraction notice (fallback to server parser in examine):', err);
              setBusyNotice('AI service experiencing high load; banking rules will parse document during examination.');
              setTimeout(() => setBusyNotice(null), 3500);
            } finally {
              setExtractingDocIds((prev) => ({ ...prev, [docId]: false }));
              setBusyNotice(null);
            }
          }

          resolve();
        };

        if (isBinary) {
          reader.readAsDataURL(file);
        } else {
          reader.readAsText(file);
        }
      });

      // Short delay between processing consecutive documents
      if (i < fileList.length - 1) {
        await new Promise((r) => setTimeout(r, 350));
      }
    }
  };

  const handleCreateCustomDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !newDocContent.trim()) return;

    const initialFields = normalizeExtractedFields(newDocType, extractFieldsWithDeterministicRules(newDocType, newDocContent.trim()));

    const newDoc: ShippingDocument = {
      id: 'doc-' + Date.now(),
      type: newDocType,
      title: newDocTitle.trim(),
      fileName: `${newDocTitle.trim().replace(/\s+/g, '_')}.txt`,
      fileSize: `${Math.round(newDocContent.length / 1024) || 1} KB`,
      rawText: newDocContent.trim(),
      extractedFields: initialFields,
    };

    onAddDocument(newDoc);
    setNewDocTitle('');
    setNewDocContent('');
    setIsAddingCustomDoc(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Friendly Busy, retrying... notice on 429 / quota limits */}
      {busyNotice && (
        <div className="mb-6 rounded-2xl border-2 border-amber-500/50 bg-amber-950/40 p-4 text-amber-200 text-xs flex items-center justify-between gap-3 animate-fade-in shadow-lg backdrop-blur">
          <div className="flex items-center gap-2.5">
            <Loader2 className="h-4 w-4 text-amber-400 animate-spin flex-shrink-0" />
            <span className="font-semibold text-white">{busyNotice}</span>
          </div>
          <span className="text-[11px] font-mono text-amber-300">Rate limit auto-backoff active</span>
        </div>
      )}

      {/* Helpful Error Messages for Unreadable Files */}
      {unreadableFileErrors.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Upload Notice ({unreadableFileErrors.length})
            </span>
            <button
              type="button"
              onClick={clearAllUnreadableErrors}
              className="rounded-lg bg-rose-950/60 border border-rose-800/80 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-900 hover:text-white transition-colors"
            >
              Dismiss All
            </button>
          </div>
          {unreadableFileErrors.map((err) => (
            <div
              key={err.id}
              className="rounded-2xl border-2 border-rose-500/50 bg-rose-950/30 p-4 sm:p-5 shadow-lg backdrop-blur flex flex-col sm:flex-row items-start justify-between gap-4 animate-fade-in"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-rose-500/20 p-2 text-rose-400 border border-rose-500/30 flex-shrink-0 mt-0.5">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
                      Unreadable File Detected:
                    </span>
                    <strong className="text-sm font-bold text-white font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {err.fileName}
                    </strong>
                  </div>
                  <p className="mt-1 text-xs text-rose-200 leading-relaxed">
                    <strong>Issue:</strong> {err.reason}
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    <strong className="text-teal-300">Recommendation:</strong> {err.suggestion}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setNewDocTitle(err.fileName.replace(/\.[^/.]+$/, ''));
                    setIsAddingCustomDoc(true);
                    removeUnreadableError(err.id);
                  }}
                  className="rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
                >
                  Paste Text Manually
                </button>
                <button
                  type="button"
                  onClick={() => removeUnreadableError(err.id)}
                  className="rounded-xl bg-rose-600/20 border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-600 hover:text-white transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hero Banner with Preset Consignments */}
      <div className="mb-8 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>Simulate Bank Document Checker Counter</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Audit Shipping Documents Against Letter of Credit
            </h1>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Upload the MT700 Letter of Credit and your export shipping documents. CleanSet applies exact 
              <strong className="text-emerald-400 font-medium"> ICC UCP 600</strong> &amp; 
              <strong className="text-teal-400 font-medium"> ISBP 821</strong> rules. 
              Extract structured banking fields with verbatim source snippets to review and correct before submission.
            </p>
          </div>

          {/* Quick Preload Demo Cases */}
          <div className="flex-shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Instant 1-Click Test Scenarios:
            </p>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
              {SAMPLE_CONSIGNMENTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onLoadSample(s.id)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-left text-xs text-slate-200 hover:border-emerald-500/50 hover:bg-slate-800/90 transition-all group"
                  aria-label={`Load preset ${s.name}`}
                >
                  <div className="truncate">
                    <span className="font-semibold text-white block group-hover:text-emerald-300 truncate">
                      {s.name}
                    </span>
                    <span className="text-[11px] text-slate-400 truncate">{s.description.slice(0, 48)}...</span>
                  </div>
                  <span
                    className={`ml-2 inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      s.badgeColor === 'emerald'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : s.badgeColor === 'amber'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {s.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Slot 1 - Letter of Credit (MT700) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-teal-500/10 p-2 text-teal-400 border border-teal-500/20">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    Slot 1: Letter of Credit (LC)
                    <span className="rounded bg-teal-500/20 px-1.5 py-0.5 text-[10px] font-mono text-teal-300">
                      MT700
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">Terms, deadlines, Field 45A, 46A &amp; 47A</p>
                </div>
              </div>

              <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs">
                <button
                  onClick={() => setActiveTab('extracted')}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    activeTab === 'extracted'
                      ? 'bg-slate-800 text-teal-300 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Fields
                </button>
                <button
                  onClick={() => setActiveTab('mt700')}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    activeTab === 'mt700'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Raw MT700
                </button>
                <button
                  onClick={() => setActiveTab('structured')}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    activeTab === 'structured'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Form
                </button>
              </div>
            </div>

            {/* Prominent Upload LC Button directly under section title */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-teal-500/30 bg-teal-950/30 shadow-sm">
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block">Import Letter of Credit</span>
                <span className="text-[11px] text-teal-300/80 block truncate">Upload PDF, MT700 text, or image transmission</span>
              </div>
              <button
                type="button"
                onClick={() => lcFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal-500 transition-colors flex-shrink-0"
              >
                <UploadCloud className="h-4 w-4" />
                <span>Upload LC</span>
              </button>
              <input
                ref={lcFileInputRef}
                type="file"
                accept=".txt,.pdf,.swift"
                onChange={handleLCFileUpload}
                className="hidden"
              />
            </div>

            {/* Quick summary chips */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/80">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">LC Number</span>
                <span className="font-mono font-bold text-emerald-400 truncate block">
                  {lc.lcNumber || 'Pending'}
                </span>
              </div>
              <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/80">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Credit Amount</span>
                <span className="font-bold text-white block">
                  {lc.currency} {Number(lc.amount || 0).toLocaleString()}
                </span>
              </div>
              <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/80">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Latest Shipment Date</span>
                <span className="font-medium text-amber-300 block">
                  {lc.latestShipmentDate || 'Unspecified'}
                </span>
              </div>
              <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/80">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Expiry Date (Field 31D)</span>
                <span className="font-medium text-slate-300 block">
                  {lc.expiryDate || 'Unspecified'}
                </span>
              </div>
            </div>

            {/* Tab 1: Extracted Banking Fields Panel with Exact Source Snippets */}
            {activeTab === 'extracted' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Structured Banking Extraction (Field + Source Snippet):</span>
                  <span className="text-teal-400 font-mono text-[11px]">Strict UCP 600 alignment</span>
                </div>
                <ExtractedFieldsPanel
                  docType="LETTER_OF_CREDIT"
                  docTitle="Letter of Credit MT700"
                  fields={lcFields}
                  documentText={lc.rawText}
                  isImage={Boolean(lc.mimeType && lc.mimeType.startsWith('image/'))}
                  onUpdateField={handleUpdateLCField}
                  onReExtract={handleExtractLCFields}
                  isExtracting={isExtractingLC}
                  defaultExpanded={true}
                />
              </div>
            )}

            {/* Tab 2: Raw MT700 Editor */}
            {activeTab === 'mt700' && (
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>SWIFT MT700 Message Content</span>
                  <span className="text-[10px] text-teal-400">Edits automatically sync with Form &amp; Fields</span>
                </label>
                <textarea
                  value={lc.rawText}
                  onChange={(e) => handleRawMT700Change(e.target.value)}
                  rows={13}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  placeholder="Paste SWIFT MT700 message here..."
                />
              </div>
            )}

            {/* Tab 3: Structured Quick Form */}
            {activeTab === 'structured' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">LC Number (Field 20)</label>
                    <input
                      type="text"
                      value={lc.lcNumber}
                      onChange={(e) => handleUpdateLCForm('lcNumber', e.target.value)}
                      placeholder="e.g. LC/2026/EUR/88921"
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Currency</label>
                      <input
                        type="text"
                        value={lc.currency}
                        onChange={(e) => handleUpdateLCForm('currency', e.target.value)}
                        placeholder="USD"
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 font-mono"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Amount (32B)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={lc.amount ? String(lc.amount) : ''}
                        onChange={(e) => handleUpdateLCForm('amount', Number(e.target.value) || 0)}
                        placeholder="e.g. 150,000.00"
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Applicant (Field 50)</label>
                    <input
                      type="text"
                      value={lc.applicant}
                      onChange={(e) => handleUpdateLCForm('applicant', e.target.value)}
                      placeholder="Buyer Company Name & Address"
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Beneficiary (Field 59)</label>
                    <input
                      type="text"
                      value={lc.beneficiary}
                      onChange={(e) => handleUpdateLCForm('beneficiary', e.target.value)}
                      placeholder="Seller / Exporter Name"
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Latest Shipment Date (44C)</label>
                    <input
                      type="text"
                      value={lc.latestShipmentDate}
                      onChange={(e) => handleUpdateLCForm('latestShipmentDate', e.target.value)}
                      placeholder="YYYY-MM-DD"
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Expiry Date (Field 31D)</label>
                    <input
                      type="text"
                      value={lc.expiryDate}
                      onChange={(e) => handleUpdateLCForm('expiryDate', e.target.value)}
                      placeholder="YYYY-MM-DD"
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Field 45A: Description of Goods &amp; Services
                  </label>
                  <textarea
                    value={lc.descriptionOfGoods}
                    onChange={(e) => handleUpdateLCForm('descriptionOfGoods', e.target.value)}
                    rows={3}
                    placeholder="Goods description, quantities, specifications..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Port of Loading (44E)</label>
                    <input
                      type="text"
                      value={lc.portOfLoading}
                      onChange={(e) => handleUpdateLCForm('portOfLoading', e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Port of Discharge (44F)</label>
                    <input
                      type="text"
                      value={lc.portOfDischarge}
                      onChange={(e) => handleUpdateLCForm('portOfDischarge', e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Partial Shipment (43P)</label>
                    <select
                      value={lc.partialShipment}
                      onChange={(e) => handleUpdateLCForm('partialShipment', e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200"
                    >
                      <option value="PROHIBITED">PROHIBITED</option>
                      <option value="ALLOWED">ALLOWED</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Presentation Period (48)</label>
                    <input
                      type="number"
                      value={lc.presentationPeriodDays}
                      onChange={(e) => handleUpdateLCForm('presentationPeriodDays', Number(e.target.value) || 21)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Slot 2 - Multi-File Shipping Documents Upload */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    Slot 2: Shipping Document Set
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
                      {documents.length} Loaded
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Commercial Invoice, Bill of Lading, Packing List, Insurance, Origin (PDF &amp; Photos)
                  </p>
                </div>
              </div>
            </div>

            {/* Prominent Upload Buttons directly under section title */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/30 shadow-sm">
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block">Add Shipping Documents</span>
                <span className="text-[11px] text-emerald-300/80 block truncate">PDF, Word, photos, or text format</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddingCustomDoc(!isAddingCustomDoc)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Add Text Doc</span>
                </button>
                <button
                  type="button"
                  onClick={() => docFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500 transition-colors"
                >
                  <UploadCloud className="h-4 w-4" />
                  <span>Upload Files</span>
                </button>
                <input
                  ref={docFileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleDocumentFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Custom Document Entry Form */}
            {isAddingCustomDoc && (
              <form onSubmit={handleCreateCustomDoc} className="mt-4 rounded-xl border border-emerald-500/30 bg-slate-950 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Edit3 className="h-3.5 w-3.5" />
                    Add Document Record
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomDoc(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Document Type</label>
                    <select
                      value={newDocType}
                      onChange={(e) => setNewDocType(e.target.value as DocumentType)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200"
                    >
                      {DOC_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.type} value={opt.type}>
                          {opt.icon} {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Document Title / Number</label>
                    <input
                      type="text"
                      placeholder="e.g. Commercial Invoice #INV-2026-09"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Document Content / Text</label>
                  <textarea
                    rows={4}
                    placeholder="Enter document text, line items, weights, dates, and notations..."
                    value={newDocContent}
                    onChange={(e) => setNewDocContent(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-xs font-mono text-slate-200"
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    Save &amp; Attach Document
                  </button>
                </div>
              </form>
            )}

            {/* Document list with expandable Extracted Fields panels */}
            {documents.length === 0 ? (
              <div 
                onClick={() => docFileInputRef.current?.click()}
                className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-800 bg-slate-950/40 p-10 text-center cursor-pointer hover:border-emerald-500/50 hover:bg-slate-900/40 transition-colors"
              >
                <div className="rounded-full bg-slate-800/80 p-3 text-slate-400 mb-3">
                  <UploadCloud className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-sm font-semibold text-white">No shipping documents attached</h3>
                <p className="mt-1 text-xs text-slate-400 max-w-sm">
                  Drag and drop files here, or click to upload PDF or phone photos. You can also select a 1-click test scenario above.
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <Camera className="h-3.5 w-3.5" />
                  <span>Supports PDF, DOC, TXT, PNG, JPG</span>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3.5 max-h-[620px] overflow-y-auto pr-1">
                {documents.map((doc) => {
                  const typeOpt = DOC_TYPE_OPTIONS.find((t) => t.type === doc.type) || DOC_TYPE_OPTIONS[0];
                  const docFields = doc.extractedFields || extractFieldsWithDeterministicRules(doc.type, doc.rawText);
                  const isDrawerOpen = !!expandedDocIds[doc.id];
                  const isExtracting = !!extractingDocIds[doc.id];

                  // Count extracted fields
                  const extractedCount = Object.values(docFields).filter((f) => f.value !== null && f.value !== undefined).length;

                  return (
                    <div
                      key={doc.id}
                      className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden transition-all"
                    >
                      {/* Document Item Header Bar */}
                      <div className="flex items-start justify-between gap-3 p-3.5 hover:bg-slate-900/40 transition-colors">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="text-xl flex-shrink-0 mt-0.5">{typeOpt.icon}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-white truncate">{doc.title}</span>
                              <select
                                value={doc.type}
                                onChange={(e) => handleChangeDocumentType(doc, e.target.value as DocumentType)}
                                className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300 border border-slate-700 cursor-pointer focus:outline-none focus:border-teal-400"
                                aria-label={`Select document type for ${doc.title}`}
                              >
                                {DOC_TYPE_OPTIONS.map((opt) => (
                                  <option key={opt.type} value={opt.type} className="bg-slate-900 text-white">
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              {extractedCount === 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-semibold bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
                                  Unreadable - upload a clearer copy
                                </span>
                              )}
                              {doc.fileSize && (
                                <span className="text-[10px] text-slate-500">{doc.fileSize}</span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-slate-400 line-clamp-1 font-mono">
                              {doc.rawText ? doc.rawText.slice(0, 110) : '[Binary document attached]'}...
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* Toggle Extracted Fields Drawer */}
                          <button
                            type="button"
                            onClick={() => toggleDocExpand(doc.id)}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                              isDrawerOpen
                                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700'
                            }`}
                            aria-label={`View extracted fields for ${doc.title}`}
                          >
                            <Sparkles className="h-3 w-3 text-teal-400" />
                            <span className="hidden sm:inline">Extracted Fields ({extractedCount})</span>
                            <span className="sm:hidden">{extractedCount}</span>
                            {isDrawerOpen ? <ChevronUp className="h-3 w-3 ml-0.5" /> : <ChevronDown className="h-3 w-3 ml-0.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                            title="Preview full document text"
                            aria-label={`Preview ${doc.title}`}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveDocument(doc.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition-colors"
                            title="Remove document"
                            aria-label={`Remove ${doc.title}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Expandable Extracted Fields Drawer */}
                      {isDrawerOpen && (
                        <div className="border-t border-slate-800/90 p-3 bg-slate-900/30">
                          <ExtractedFieldsPanel
                            docType={doc.type}
                            docTitle={doc.title}
                            fields={docFields}
                            documentText={doc.rawText}
                            isImage={Boolean(doc.mimeType && doc.mimeType.startsWith('image/'))}
                            onUpdateField={(key, val) => handleUpdateDocumentField(doc, key, val)}
                            onReExtract={() => handleExtractDocumentFields(doc)}
                            isExtracting={isExtracting}
                            defaultExpanded={true}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Upload drop hint */}
            {documents.length > 0 && (
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                <span className="flex items-center gap-1.5">
                  <FileCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>All documents parsed with {`{value, source_snippet}`} verification.</span>
                </span>
                <button
                  type="button"
                  onClick={() => docFileInputRef.current?.click()}
                  className="text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  + Add more files
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Examination Launch CTA */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/30 p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Ready for Document Checker Counter Examination
            </h3>
            <p className="text-xs text-slate-400">
              CleanSet audits the verified structured fields against UCP 600 &amp; ISBP 821 international trade rules.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex flex-col items-start sm:items-end">
            <div className="flex items-center gap-2">
              <label htmlFor="presentation-date-input" className="text-xs font-semibold text-slate-300 whitespace-nowrap">
                Presentation Date:
              </label>
              <input
                id="presentation-date-input"
                type="date"
                value={presentationDate || new Date().toISOString().slice(0, 10)}
                onChange={(e) => onUpdatePresentationDate && onUpdatePresentationDate(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-white focus:border-teal-400 focus:outline-none"
              />
            </div>
            {(() => {
              const blDoc = documents.find((d) => d.type === 'BILL_OF_LADING');
              const blDate = blDoc?.extractedFields?.shipped_on_board_date?.value || blDoc?.extractedFields?.issue_date?.value;
              const curDate = presentationDate || new Date().toISOString().slice(0, 10);
              if (blDate && curDate && curDate < blDate) {
                return (
                  <span className="text-[11px] text-amber-400 font-semibold mt-1">
                    ⚠️ Warning: Presentation date is before B/L date ({String(blDate)})
                  </span>
                );
              }
              return null;
            })()}
          </div>

          <button
            onClick={onStartExamination}
            disabled={documents.length === 0}
            className={`flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-bold shadow-lg transition-all ${
              documents.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 text-white shadow-emerald-600/30 hover:bg-emerald-500 hover:shadow-emerald-500/40 active:scale-98'
            }`}
            aria-label="Start Examination"
          >
            <span>Run Bank Examination</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div 
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-100"
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-doc-title"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 id="preview-doc-title" className="text-base font-bold text-white">{previewDoc.title}</h3>
                <span className="text-xs text-slate-400">{previewDoc.fileName}</span>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close document preview"
              >
                ✕
              </button>
            </div>
            <div className="mt-4">
              <pre className="max-h-[50vh] overflow-y-auto rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-200 whitespace-pre-wrap">
                {previewDoc.rawText}
              </pre>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setPreviewDoc(null)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
