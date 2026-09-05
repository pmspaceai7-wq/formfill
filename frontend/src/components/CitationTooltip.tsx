"use client";

import React from "react";
import type { FieldCitation, FieldInference } from "@/lib/types";

interface Props {
  citation?: FieldCitation;
  inference?: FieldInference;
  fieldName: string;
  fieldLabel: string;
  value: string;
}

export function CitationTooltip({
  citation,
  inference,
  fieldName,
  fieldLabel,
  value,
}: Props) {
  const isInfer = Boolean(inference);
  const sourceFile = citation?.source_file || (isInfer ? "Conditional Reasoning Engine" : "Source Document");
  const lineNum = citation?.line_number;
  const snippet = citation?.snippet || inference?.source_evidence || "";
  const confidence = citation ? Math.round(citation.confidence * 100) : 98;
  const factKey = citation?.fact_key;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "calc(100% + 6px)",
        left: 0,
        zIndex: 9999,
        width: 310,
        maxWidth: "90vw",
        pointerEvents: "none",
        lineHeight: 1.4,
      }}
      className="bg-slate-950 text-slate-100 rounded-xl p-3 shadow-2xl border border-slate-800 backdrop-blur-md text-xs animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Top Header: Field Label & Provenance Badge */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80 mb-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-bold text-slate-200 truncate">
            {fieldLabel || fieldName}
          </span>
        </div>
        <span
          className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1 ${
            isInfer
              ? "bg-amber-950/80 text-amber-300 border border-amber-800/60"
              : "bg-blue-950/80 text-blue-300 border border-blue-800/60"
          }`}
        >
          {isInfer ? "💡 Smart Inference" : "🤖 Auto-Populated"}
        </span>
      </div>

      {/* Value Preview */}
      <div className="mb-2 bg-slate-900/90 rounded-lg p-2 border border-slate-800/90">
        <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">
          Populated Value
        </div>
        <div className="text-xs font-mono font-bold text-white break-all">
          {value || "—"}
        </div>
      </div>

      {/* Source Provenance Info */}
      <div className="space-y-1.5 mb-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 font-medium">Extracted from:</span>
          <span className="font-mono text-emerald-400 font-semibold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/40 text-[10px] truncate max-w-[170px]">
            📄 {sourceFile}
            {lineNum ? ` : L${lineNum}` : ""}
          </span>
        </div>

        {/* Verbatim Snippet Quote */}
        {snippet && (
          <div className="bg-slate-900/60 rounded-md p-2 text-[11px] text-slate-300 border-l-2 border-blue-500 italic font-sans leading-relaxed">
            &ldquo;{snippet}&rdquo;
          </div>
        )}

        {/* Inference Reasoning if present */}
        {inference?.reasoning && (
          <div className="bg-amber-950/30 rounded-md p-2 text-[11px] text-amber-200 border-l-2 border-amber-500 text-[10px] leading-relaxed">
            <span className="font-bold">Reasoning: </span>
            {inference.reasoning}
          </div>
        )}
      </div>

      {/* Footer: Confidence & Fact Key */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>Confidence: <strong className="text-slate-200">{confidence}%</strong></span>
        </div>
        {factKey && (
          <span className="font-mono text-[9px] text-slate-500">
            {factKey}
          </span>
        )}
      </div>
    </div>
  );
}
