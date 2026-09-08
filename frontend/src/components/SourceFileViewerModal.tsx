"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getSourceFile } from "@/lib/api";
import { FileTextIcon } from "./Icons";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sourceId?: string | null;
  filename: string;
  targetLine?: number | null;
  snippet?: string;
  fieldLabel?: string;
  value?: string;
}

export function SourceFileViewerModal({
  isOpen,
  onClose,
  sourceId,
  filename,
  targetLine,
  snippet,
  fieldLabel,
  value,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetLineRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch source file content
  useEffect(() => {
    if (!isOpen || !filename) return;
    let active = true;
    setLoading(true);
    setError(null);

    getSourceFile(sourceId, filename)
      .then((data) => {
        if (active) {
          setLines(data.lines || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load file");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen, sourceId, filename]);

  // Auto-scroll to target line once lines are rendered
  useEffect(() => {
    if (!loading && lines.length > 0 && targetLine) {
      const timer = setTimeout(() => {
        if (targetLineRef.current) {
          targetLineRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [loading, lines, targetLine]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const scrollToTarget = () => {
    if (targetLineRef.current) {
      targetLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] max-h-[850px] flex flex-col overflow-hidden text-slate-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
              <FileTextIcon size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-white truncate">
                  {filename}
                </span>
                {targetLine && (
                  <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 px-2 py-0.5 rounded-md text-xs font-mono font-bold flex items-center gap-1">
                    <span>🎯 Line {targetLine}</span>
                  </span>
                )}
              </div>
              {(fieldLabel || value) && (
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                  <span>Populated for:</span>
                  <span className="font-semibold text-slate-200">
                    {fieldLabel || "Field"}
                  </span>
                  {value && (
                    <>
                      <span>&rarr;</span>
                      <span className="font-mono text-emerald-400 font-bold truncate">
                        &quot;{value}&quot;
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {targetLine && !loading && lines.length > 0 && (
              <button
                type="button"
                onClick={scrollToTarget}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                title="Scroll directly to the matching line"
              >
                <span>Jump to L{targetLine}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Snippet Context Bar (if available) */}
        {snippet && (
          <div className="px-5 py-2.5 bg-slate-950/70 border-b border-slate-800/80 text-xs flex items-center gap-2">
            <span className="text-slate-400 flex-shrink-0 font-medium text-[11px]">
              Matched text snippet:
            </span>
            <span className="font-mono text-emerald-300 text-[11px] truncate bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/50">
              &ldquo;{snippet}&rdquo;
            </span>
          </div>
        )}

        {/* Content Area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-auto p-4 bg-slate-950 font-mono text-xs select-text"
        >
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400 py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-sm font-sans">
                Opening {filename}...
              </div>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <div className="text-amber-400 text-base font-bold mb-2">
                Could not load file directly
              </div>
              <div className="text-xs text-slate-400 max-w-md mb-4">
                {error}
              </div>
              {snippet && (
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl max-w-lg text-left">
                  <div className="text-[11px] text-slate-400 font-semibold mb-1">
                    Extracted text at Line {targetLine ?? "—"}:
                  </div>
                  <div className="text-emerald-300 text-xs">
                    {snippet}
                  </div>
                </div>
              )}
            </div>
          ) : lines.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500">
              File is empty
            </div>
          ) : (
            <div className="min-w-fit space-y-0.5">
              {lines.map((text, idx) => {
                const lineNum = idx + 1;
                const isTarget = targetLine === lineNum;

                return (
                  <div
                    key={lineNum}
                    ref={isTarget ? targetLineRef : undefined}
                    className={`flex items-start rounded px-2 py-1 transition-colors ${
                      isTarget
                        ? "bg-emerald-950/70 border-l-4 border-emerald-400 text-emerald-100 font-bold shadow-md ring-1 ring-emerald-500/30"
                        : "hover:bg-slate-900/60 text-slate-300"
                    }`}
                  >
                    {/* Line number */}
                    <span
                      className={`w-12 flex-shrink-0 text-right pr-4 select-none ${
                        isTarget
                          ? "text-emerald-400 font-bold"
                          : "text-slate-600"
                      }`}
                    >
                      {lineNum}
                    </span>

                    {/* Line text */}
                    <span className="flex-1 whitespace-pre-wrap break-all leading-relaxed">
                      {text || " "}
                    </span>

                    {/* Highlight indicator tag */}
                    {isTarget && (
                      <span className="ml-3 flex-shrink-0 text-[10px] bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.5 rounded shadow-sm select-none">
                        ◀ Extracted Fact
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-900/90 text-xs text-slate-400 flex-shrink-0">
          <div>
            {!loading && lines.length > 0 && (
              <span>
                Total <strong className="text-slate-200">{lines.length}</strong> lines
                {targetLine ? (
                  <> &bull; Matched on line <strong className="text-emerald-400">{targetLine}</strong></>
                ) : null}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
