"use client";

import React, { useState } from "react";
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

  const handlePick = (cand: CandidateValue) => {
    setSelectedVal(cand.value);
    onSelectCandidate(cand.value);
    setTimeout(() => {
      onClose();
    }, 450);
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: "calc(100% + 8px)",
        left: 0,
        zIndex: 10000,
        width: 380,
        maxWidth: "92vw",
        pointerEvents: "auto",
      }}
      onClick={(e) => e.stopPropagation()}
      className="bg-slate-950 text-slate-100 rounded-2xl p-4 shadow-2xl border-2 border-amber-500/80 backdrop-blur-xl text-xs animate-in fade-in zoom-in-95 duration-200 ring-4 ring-amber-500/15"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
            ⚠️
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Data Conflict Detected</span>
              <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800/60 font-mono font-normal">
                {(conflict.candidates ?? []).length} Sources
              </span>
            </div>
            <div className="text-[11px] text-slate-400 truncate max-w-[240px]">
              {conflict.field_label || conflict.fact_key}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-xs font-bold cursor-pointer transition-colors"
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
              className={`p-3 rounded-xl border transition-all duration-200 ${
                isJustSelected
                  ? "bg-emerald-950/80 border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                  : isCurrent
                  ? "bg-slate-900 border-blue-500/60 ring-1 ring-blue-500/20"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
              }`}
            >
              {/* Top info line */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-mono text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-900/60 flex items-center gap-1 truncate max-w-[200px]">
                  📄 {cand.source_file}
                  {cand.line_number ? ` (L${cand.line_number})` : ""}
                </span>

                {isCurrent && (
                  <span className="text-[9px] bg-blue-900/80 text-blue-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                    Current
                  </span>
                )}
              </div>

              {/* Value Text */}
              <div className="font-mono font-bold text-sm text-white mb-1 break-all">
                {cand.value}
              </div>

              {/* Snippet Context */}
              {cand.snippet && (
                <div className="text-[10px] text-slate-400 italic bg-slate-950/60 p-1.5 rounded mb-2 font-sans border-l-2 border-slate-700">
                  &ldquo;{cand.snippet}&rdquo;
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={() => handlePick(cand)}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isJustSelected
                    ? "bg-emerald-600 text-white"
                    : isCurrent
                    ? "bg-blue-600 hover:bg-blue-500 text-white"
                    : "bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white border border-slate-700 hover:border-blue-500"
                }`}
              >
                {isJustSelected ? (
                  <>
                    <span>✓ Applied Value</span>
                  </>
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
        <span>Clicking immediately updates the PDF canvas.</span>
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
