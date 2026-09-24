"use client";

import React, { useState, useRef, useEffect } from "react";
import type { CandidateValue, FieldConflict } from "@/lib/types";

interface Props {
  conflict: FieldConflict;
  onSelectCandidate: (value: string) => void;
  onClose: () => void;
}

export function ConflictResolverCard({
  conflict,
  onSelectCandidate,
  onClose,
}: Props) {
  const [selectedVal, setSelectedVal] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [placeBelow, setPlaceBelow] = useState(false);
  const [alignRight, setAlignRight] = useState(false);

  useEffect(() => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      if (rect.top < 160) {
        setPlaceBelow(true);
      }
      if (rect.right > window.innerWidth - 20) {
        setAlignRight(true);
      }
    }
  }, []);

  // Close on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handlePick = (cand: CandidateValue) => {
    setSelectedVal(cand.value);
    onSelectCandidate(cand.value);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div
      ref={cardRef}
      style={{
        position: "absolute",
        ...(placeBelow ? { top: "calc(100% + 8px)" } : { bottom: "calc(100% + 8px)" }),
        ...(alignRight ? { right: 0 } : { left: 0 }),
        zIndex: 10010,
        width: 380,
        maxWidth: "92vw",
        pointerEvents: "auto",
      }}
      onClick={(e) => e.stopPropagation()}
      className="bg-[#0f172a] text-slate-100 rounded-2xl p-4 shadow-2xl border border-slate-700/80 ring-4 ring-amber-500/15 text-xs animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs">
            ⚠️
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Data Conflict Detected</span>
              <span className="text-[10px] bg-amber-950/90 text-amber-300 px-2 py-0.5 rounded-full border border-amber-800/80 font-semibold font-mono">
                {(conflict.candidates ?? []).length} Sources
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium truncate max-w-[240px]">
              {conflict.field_label || conflict.fact_key}
            </div>
          </div>
        </div>

        <button
          type="button"
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onClose();
          }}
          className="text-slate-400 hover:text-white hover:bg-slate-800 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
          title="Close conflict resolver"
        >
          ✕
        </button>
      </div>

      <p className="text-[11px] text-slate-300 py-2.5 leading-relaxed">
        Multiple source documents contain differing values for this field. Select which value you want SpaceFill to use:
      </p>

      {/* Candidates List */}
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {(conflict.candidates ?? []).map((cand, idx) => {
          const isCurrent = cand.value === conflict.current_value;
          const isJustSelected = selectedVal === cand.value;

          return (
            <div
              key={idx}
              onClick={() => handlePick(cand)}
              className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                isJustSelected
                  ? "bg-emerald-950/80 border-emerald-400 shadow-md ring-2 ring-emerald-500/30"
                  : isCurrent
                  ? "bg-slate-800/90 border-blue-500/70 ring-1 ring-blue-500/30 shadow-md"
                  : "bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600"
              }`}
            >
              {/* Top info line */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-mono text-[10px] text-emerald-300 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/70 flex items-center gap-1 truncate max-w-[220px] shadow-2xs">
                  📄 {cand.source_file}
                  {cand.line_number ? ` (L${cand.line_number})` : ""}
                </span>

                {isCurrent && (
                  <span className="text-[9px] bg-blue-600 text-white border border-blue-400/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-2xs">
                    Current
                  </span>
                )}
              </div>

              {/* Value Text */}
              <div className="font-mono font-bold text-sm text-white mb-1.5 break-all">
                {cand.value}
              </div>

              {/* Snippet Context */}
              {cand.snippet && (
                <div className="text-[11px] text-slate-300 italic bg-slate-950/80 p-2 rounded-lg mb-2.5 font-sans border-l-2 border-blue-400 border border-slate-800 leading-normal">
                  &ldquo;{cand.snippet}&rdquo;
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handlePick(cand);
                }}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                  isJustSelected
                    ? "bg-emerald-600 text-white"
                    : isCurrent
                    ? "bg-blue-600 hover:bg-blue-500 text-white"
                    : "bg-slate-700 hover:bg-blue-600 text-slate-100 hover:text-white border border-slate-600 hover:border-blue-500"
                }`}
              >
                {isJustSelected ? (
                  <span>✓ Applied Value</span>
                ) : isCurrent ? (
                  <span>✓ Current Value (Keep)</span>
                ) : (
                  <>
                    <span>Use This Value</span>
                    <span className="text-[11px]">→</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="pt-2.5 mt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
        <span>⚡ Canvas updates immediately</span>
        <button
          type="button"
          onClick={onClose}
          className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
