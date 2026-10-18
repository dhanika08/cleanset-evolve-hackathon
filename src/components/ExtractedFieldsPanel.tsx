import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Quote, 
  Edit2, 
  RotateCw,
  Search,
  Filter
} from 'lucide-react';
import { ExtractedFieldsMap, DocumentType } from '../types/compliance';
import { FIELD_DEFINITIONS } from '../utils/fieldExtractor';

interface ExtractedFieldsPanelProps {
  docType: DocumentType;
  docTitle: string;
  fields: ExtractedFieldsMap;
  documentText?: string;
  isImage?: boolean;
  onUpdateField: (key: string, newValue: any) => void;
  onReExtract?: () => void;
  isExtracting?: boolean;
  defaultExpanded?: boolean;
}

function snippetMatchesDocument(snippet: string | null | undefined, text: string | null | undefined): boolean {
  if (!snippet || !text) return false;
  const clean = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  return clean(text).includes(clean(snippet));
}

export const ExtractedFieldsPanel: React.FC<ExtractedFieldsPanelProps> = ({
  docType,
  docTitle,
  fields,
  documentText,
  isImage = false,
  onUpdateField,
  onReExtract,
  isExtracting = false,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [filterMode, setFilterMode] = useState<'all' | 'present' | 'null'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editedKeys, setEditedKeys] = useState<Set<string>>(new Set());

  const fieldDefs = FIELD_DEFINITIONS[docType] || FIELD_DEFINITIONS.OTHER;
  
  // Count present vs null fields
  const totalCount = fieldDefs.length;
  const presentCount = fieldDefs.filter((def) => {
    const item = fields[def.key];
    return item && item.value !== null && item.value !== undefined && item.value !== '';
  }).length;
  const missingCount = totalCount - presentCount;

  // Filtered fields
  const displayedDefs = fieldDefs.filter((def) => {
    const item = fields[def.key];
    const isPresent = item && item.value !== null && item.value !== undefined && item.value !== '';

    if (filterMode === 'present' && !isPresent) return false;
    if (filterMode === 'null' && isPresent) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const labelMatch = def.label.toLowerCase().includes(q);
      const keyMatch = def.key.toLowerCase().includes(q);
      const valMatch = item?.value ? String(item.value).toLowerCase().includes(q) : false;
      const snipMatch = item?.source_snippet ? item.source_snippet.toLowerCase().includes(q) : false;
      return labelMatch || keyMatch || valMatch || snipMatch;
    }

    return true;
  });

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden transition-all duration-200">
      {/* Header Toggle */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-3.5 cursor-pointer bg-slate-900/60 hover:bg-slate-900 transition-colors select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="rounded-md bg-teal-500/10 p-1.5 text-teal-400 border border-teal-500/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-200">
                Extracted Banking Fields &amp; Source Snippets
              </span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-slate-700">
                {presentCount} Extracted
              </span>
              {missingCount > 0 && (
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-700">
                  {missingCount} Not Present (Null)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Verbatim source text from document with field-by-field verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {onReExtract && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReExtract();
              }}
              disabled={isExtracting}
              className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              title="Re-extract fields with Gemini AI"
              aria-label="Re-extract fields"
            >
              <RotateCw className={`h-3 w-3 ${isExtracting ? 'animate-spin text-teal-400' : ''}`} />
              <span className="hidden sm:inline">{isExtracting ? 'Extracting...' : 'Re-extract'}</span>
            </button>
          )}

          <button
            type="button"
            className="rounded p-1 text-slate-400 hover:text-white"
            aria-label={isExpanded ? 'Collapse fields' : 'Expand fields'}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-800/80 p-4 space-y-3.5 bg-slate-950/90">
          {/* Controls: Search and Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search extracted fields or snippets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  filterMode === 'all'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('present')}
                className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  filterMode === 'present'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 font-bold'
                    : 'text-slate-400 hover:text-emerald-400'
                }`}
              >
                Extracted ({presentCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('null')}
                className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  filterMode === 'null'
                    ? 'bg-slate-800 text-slate-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Null ({missingCount})
              </button>
            </div>
          </div>

          {/* Fields Grid */}
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {displayedDefs.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                No matching fields found for this filter.
              </div>
            ) : (
              displayedDefs.map((def) => {
                const item = fields[def.key] || { value: null, source_snippet: null };
                const isNull = item.value === null || item.value === undefined;

                return (
                  <div
                    key={def.key}
                    className={`rounded-xl border p-3 transition-colors ${
                      isNull
                        ? 'border-slate-800/60 bg-slate-900/30'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200">{def.label}</span>
                        <span className="font-mono text-[10px] text-slate-500">({def.key})</span>
                      </div>

                      {(() => {
                        const isEdited = editedKeys.has(def.key);
                        const isSnippetVerified = !isEdited && !isImage && snippetMatchesDocument(item.source_snippet, documentText);

                        if (isNull) {
                          return (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                              null (Not in document)
                            </span>
                          );
                        }
                        if (isEdited) {
                          return (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-400">
                              <Edit2 className="h-3 w-3 text-sky-400" />
                              Edited by user
                            </span>
                          );
                        }
                        if (isImage) {
                          return (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-400">
                              <Sparkles className="h-3 w-3 text-purple-400" />
                              Read from image
                            </span>
                          );
                        }
                        if (isSnippetVerified) {
                          return (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                              <CheckCircle className="h-3 w-3" />
                              Verified match
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-400">
                            <CheckCircle className="h-3 w-3" />
                            Extracted
                          </span>
                        );
                      })()}
                    </div>

                    {/* Value Input Box */}
                    <div className="mt-1">
                      {typeof item.value === 'boolean' ? (
                        <select
                          value={item.value ? 'true' : 'false'}
                          onChange={(e) => {
                            setEditedKeys((prev) => new Set(prev).add(def.key));
                            onUpdateField(def.key, e.target.value === 'true');
                          }}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-teal-500 focus:outline-none"
                        >
                          <option value="true">ALLOWED (True)</option>
                          <option value="false">PROHIBITED (False)</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={isNull ? '' : String(item.value)}
                          placeholder="Not present in document (null)"
                          onChange={(e) => {
                            setEditedKeys((prev) => new Set(prev).add(def.key));
                            onUpdateField(def.key, e.target.value === '' ? null : e.target.value);
                          }}
                          className={`w-full rounded-lg border px-3 py-1.5 text-xs font-mono transition-colors focus:outline-none ${
                            isNull
                              ? 'border-slate-800/80 bg-slate-950/40 text-slate-500 italic'
                              : 'border-slate-700 bg-slate-950 text-emerald-300 font-semibold focus:border-teal-500'
                          }`}
                        />
                      )}
                    </div>

                    {/* Exact Verbatim Source Snippet Box */}
                    <div className="mt-2 rounded-lg bg-slate-950/70 p-2 border border-slate-800/80 text-[11px]">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        <Quote className="h-3 w-3 text-teal-400" />
                        <span>Source Snippet:</span>
                      </div>
                      {item.source_snippet ? (
                        <code className="text-slate-300 font-mono text-[11px] block break-words whitespace-pre-wrap pl-2 border-l-2 border-teal-500/50">
                          &ldquo;{item.source_snippet}&rdquo;
                        </code>
                      ) : (
                        <span className="text-slate-600 italic block pl-2 border-l-2 border-slate-800">
                          null &mdash; Exact phrase not present in document text (Never guessed)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
