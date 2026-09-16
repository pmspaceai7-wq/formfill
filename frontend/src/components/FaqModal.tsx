"use client";

import React, { useState, useEffect } from "react";

interface FaqModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FAQ_ITEMS = [
  {
    question: "How does SpaceFill populate complex PDF forms?",
    answer:
      "SpaceFill parses the internal AcroForm tree of your PDF to map every field's exact location, field type (text inputs, comb digits, checkboxes, dropdowns), and bounding coordinates. When you attach a resume or biographical notes, our mapping engine identifies matching data entities and populates all relevant fields with vector accuracy.",
  },
  {
    question: "What source document formats are supported?",
    answer:
      "You can provide PDF resumes, Microsoft Word documents (.docx), CSV spreadsheets, plain text files (.txt, .md), or paste raw notes directly into the studio editor.",
  },
  {
    question: "How is data privacy and security handled?",
    answer:
      "SpaceFill uses an on-device, zero-retention processing architecture. Form parsing, field mapping, and PDF compilation execute locally in your session. Your personal records and documents are never shared, uploaded to third-party cloud servers, or used for model training.",
  },
  {
    question: "Does SpaceFill handle comb boxes (digit-per-box) and checkboxes?",
    answer:
      "Yes. SpaceFill includes native support for comb fields (such as SSN, dates, and phone numbers where each character resides in its own isolated box) as well as multi-option checkboxes and radio groups.",
  },
  {
    question: "Can I review and edit fields before downloading?",
    answer:
      "Yes. Every field on the rendered page is fully interactive. Blue highlights identify auto-populated fields, and green highlights show your manual edits. You can also press Ctrl + ↓ to jump directly through unfilled fields.",
  },
  {
    question: "Will the exported PDF maintain original vector quality?",
    answer:
      "Yes. Rather than flattening the document or taking screenshot images, SpaceFill directly modifies the PDF's native AcroForm data objects. All original vector typography, seals, barcodes, and layouts remain completely crisp and compliant for official submission.",
  },
];

export function FaqModal({ isOpen, onClose }: FaqModalProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden text-slate-200 max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Frequently Asked Questions</h3>
            <p className="text-xs text-slate-400">Architecture, document intake, and form precision details</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {FAQ_ITEMS.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  isOpen ? "bg-slate-900/80 border-blue-500/30" : "bg-slate-900/30 border-slate-800/80 hover:border-slate-700"
                }`}
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 cursor-pointer"
                >
                  <span className={`text-xs sm:text-sm font-semibold ${isOpen ? "text-blue-400" : "text-white"}`}>
                    {faq.question}
                  </span>
                  <span className={`text-[10px] text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-90 text-blue-400 font-bold" : ""}`}>
                    ▶
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
