"use client";

import React from "react";
import {
  SparklesIcon,
  DownloadIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ZoomInIcon,
  ZoomOutIcon,
  ArrowDownIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  FileTextIcon,
  ShieldCheckIcon,
} from "./Icons";

interface Props {
  filename: string;
  page: number;
  pageCount: number;
  zoom: number;
  fieldCount: number;
  filledCount: number;
  onPrev: () => void;
  onNext: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  // Fill
  canFill: boolean;
  /** True when filling will draw on the saved profile with no new upload. */
  hasProfileOnly?: boolean;
  fillStatus: "idle" | "running" | "complete" | "error";
  fillDone: number;
  fillTotal: number;
  fillError: string;
  onFill: () => void;
  onFillRetry: () => void;
  onNextEmpty: () => void;
  onDownload: () => void;
  downloading: boolean;
  onResetForm?: () => void;
  conflictCount?: number;
  onNextConflict?: () => void;
  isQuotaExceeded?: boolean;
  onOpenUpgrade?: () => void;
  quotaRemaining?: number | null;
  isSubscribed?: boolean;
  onOpenAudit?: () => void;
  onSaveSubmission?: () => void;
  isSaving?: boolean;
  isSaved?: boolean;
}

export function Toolbar({
  filename,
  page,
  pageCount,
  zoom,
  fieldCount,
  filledCount,
  onPrev,
  onNext,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  canFill,
  hasProfileOnly = false,
  fillStatus,
  fillDone,
  fillTotal,
  fillError,
  onFill,
  onFillRetry,
  onNextEmpty,
  onDownload,
  downloading,
  onResetForm,
  conflictCount = 0,
  onNextConflict,
  isQuotaExceeded = false,
  onOpenUpgrade,
  quotaRemaining,
  isSubscribed = false,
  onOpenAudit,
  onSaveSubmission,
  isSaving = false,
  isSaved = false,
}: Props) {
  const emptyCount = Math.max(0, fieldCount - filledCount);
  const pct = fillTotal > 0 ? Math.round((fillDone / fillTotal) * 100) : 0;

  return (
    <div className="flex flex-col bg-white border-b border-slate-200 shadow-sm z-30 sticky top-[61px]">
      {/* Primary Action Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 gap-3 flex-wrap xl:flex-nowrap">
        {/* Document Info Pill & Page Stepper */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-800 font-semibold max-w-[220px] sm:max-w-xs truncate" title={filename}>
            <FileTextIcon size={14} className="text-blue-600 flex-shrink-0" />
            <span className="truncate">{filename}</span>
          </div>

          {/* Page Navigator */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5 text-xs">
            <button
              onClick={onPrev}
              disabled={page <= 1}
              className="p-1 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeftIcon size={14} />
            </button>
            <span className="px-2.5 font-semibold text-slate-700 select-none">
              {page} <span className="text-slate-400">/</span> {pageCount}
            </span>
            <button
              onClick={onNext}
              disabled={page >= pageCount}
              className="p-1 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Next Page"
            >
              <ChevronRightIcon size={14} />
            </button>
          </div>
        </div>


        {/* Center / Fill Status & Counter */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
            <span className="font-bold text-slate-900">{filledCount}</span>
            <span>of {fieldCount} filled</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">{emptyCount} empty</span>
          </div>

          {/* Conflict Badge if any */}
          {conflictCount > 0 && (
            <button
              onClick={onNextConflict}
              className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs animate-pulse cursor-pointer"
              title="Review source data conflicts"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>⚠️ {conflictCount} Conflict{conflictCount > 1 ? "s" : ""}</span>
            </button>
          )}

          {/* Next Empty Jump */}
          <button
            onClick={onNextEmpty}
            disabled={emptyCount === 0}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold disabled:opacity-40 disabled:hover:bg-transparent transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Jump to next empty field (Ctrl+↓)"
          >
            <ArrowDownIcon size={13} className="text-slate-500" />
            <span className="hidden sm:inline">Next empty</span>
            <kbd className="hidden lg:inline text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
              Ctrl+↓
            </kbd>
          </button>
        </div>

        {/* Action Buttons (Fill & Download) */}
        <div className="flex items-center gap-2.5 flex-shrink-0 ml-auto xl:ml-0">
          {/* Quota Badge Indicator */}
          {isSubscribed ? (
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Pro Unlimited</span>
            </span>
          ) : quotaRemaining !== null && quotaRemaining !== undefined ? (
            <button
              onClick={onOpenUpgrade}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer shadow-2xs ${
                quotaRemaining > 0
                  ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                  : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
              }`}
              title={
                quotaRemaining > 0
                  ? "1 free form filling remaining on your business account"
                  : "Free quota used. Click to upgrade."
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  quotaRemaining > 0 ? "bg-blue-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              <span>{quotaRemaining > 0 ? "1 Free Fill Left" : "0 Free Fills Left • Upgrade"}</span>
            </button>
          ) : null}

          {/* Fill Button / State */}
          {fillStatus === "error" ? (
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${
                  isQuotaExceeded
                    ? "text-amber-800 bg-amber-50 border-amber-200"
                    : "text-red-600 bg-red-50 border-red-200"
                }`}
              >
                <AlertCircleIcon
                  size={13}
                  className={isQuotaExceeded ? "text-amber-600" : "text-red-500"}
                />
                <span className="max-w-[200px] truncate">{fillError || "Fill failed"}</span>
              </span>
              {isQuotaExceeded ? (
                <button
                  onClick={onOpenUpgrade}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                >
                  Upgrade
                </button>
              ) : (
                <button
                  onClick={onFillRetry}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCwIcon size={12} />
                  Retry
                </button>
              )}
            </div>
          ) : fillStatus === "running" ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold shadow-sm">
              <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Filling {fillDone}/{fillTotal} fields…</span>
            </div>
          ) : (
            <button
              onClick={onFill}
              disabled={!canFill}
              className={`px-4 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-sm whitespace-nowrap ${
                canFill
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20 hover:shadow-md hover:scale-[1.02] cursor-pointer"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              }`}
              title={
                !canFill
                  ? "Add a document or paste your details on the left first"
                  : hasProfileOnly
                  ? "Fill this form from the details already saved in your profile"
                  : "Fill this form from your attached documents and saved profile"
              }
            >
              <SparklesIcon size={14} />
              <span>{hasProfileOnly ? "Fill from Profile" : "Auto-Fill Form"}</span>
            </button>
          )}

          {/* Audit Trail Button */}
          {filledCount > 0 && onOpenAudit && (
            <button
              onClick={onOpenAudit}
              className="hidden lg:flex px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="View compliance audit trail, provenance map & export CSV / 1-page PDF"
            >
              <ShieldCheckIcon size={13} className="text-blue-600" />
              <span>Audit Trail</span>
            </button>
          )}

          {/* Save Submission Button */}
          {filledCount > 0 && onSaveSubmission && (
            <button
              onClick={onSaveSubmission}
              disabled={isSaving}
              className={`hidden sm:flex px-3 py-1.5 rounded-xl text-xs font-semibold items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                isSaved
                  ? "bg-slate-100 text-slate-600 border border-slate-200"
                  : "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
              }`}
              title={isSaved ? "Saved to My Forms" : "Save this filled form session to My Forms"}
            >
              <FileTextIcon size={13} className={isSaved ? "text-slate-400" : "text-blue-600"} />
              <span>{isSaving ? "Saving…" : isSaved ? "✓ Saved" : "Save Session"}</span>
            </button>
          )}

          {/* Download Button */}
          <button
            onClick={onDownload}
            disabled={downloading || filledCount === 0}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-500/20 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 hover:scale-[1.02] cursor-pointer"
            title="Download complete filled PDF"
          >
            {downloading ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Exporting…</span>
              </>
            ) : (
              <>
                <DownloadIcon size={14} />
                <span>Download PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Bar during filling */}
      {fillStatus === "running" && fillTotal > 0 && (
        <div className="w-full h-1 bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Status & Legend Sub-strip */}
      <div className="flex items-center justify-between px-4 py-1 bg-slate-50/90 border-t border-slate-100 text-[11px] text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-100 border border-blue-500 inline-block"></span>
            <span className="text-slate-700 font-semibold">Auto-Filled</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-500 inline-block"></span>
            <span className="text-slate-700 font-semibold">User Edited</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-100 border border-dashed border-slate-400 inline-block"></span>
            <span>Empty Field</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!canFill && (
            <span className="text-amber-600 font-medium">
              ← Add a document or paste your details to enable auto-fill
            </span>
          )}
          {canFill && fillStatus === "complete" && (
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircleIcon size={12} className="text-emerald-600" />
              <span>
                Filled {filledCount} of {fieldCount} — review before downloading
              </span>
            </span>
          )}
          {canFill && fillStatus === "idle" && hasProfileOnly && (
            <span className="text-slate-500 font-medium">
              Ready to fill from your saved profile
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
