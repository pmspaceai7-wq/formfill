"use client";

import React, { useState, useEffect } from "react";
import { CalendarIcon } from "./Icons";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CAL_URL = "https://cal.com/space-ai/space-lizit-product-demo?embed=true&theme=dark";
const CAL_DIRECT_URL = "https://cal.com/space-ai/space-lizit-product-demo";

export function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const [isLoading, setIsLoading] = useState(true);

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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setIsLoading(true);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl h-[92vh] max-h-[780px] bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl shadow-black/80 flex flex-col overflow-hidden text-slate-100"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800/90 bg-slate-950/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-950/80 border border-blue-800/70 text-blue-400 flex items-center justify-center flex-shrink-0">
              <CalendarIcon size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Schedule a Product Demo
                </h3>
                <span className="hidden sm:inline-flex text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-950/90 text-blue-400 border border-blue-800/60">
                  30-Min Walkthrough
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pick a date &amp; time for a live interactive demo with our engineering team.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={CAL_DIRECT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800 transition-colors"
              title="Open calendar in new tab"
            >
              <span>Open in Tab</span>
              <span className="text-[10px]">↗</span>
            </a>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Calendar Embed Area */}
        <div className="relative flex-1 w-full h-full bg-[#111111] overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 text-slate-400 z-10">
              <div className="w-8 h-8 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
              <span className="text-xs font-medium tracking-wide">
                Connecting to live booking calendar...
              </span>
            </div>
          )}

          <iframe
            src={CAL_URL}
            className="w-full h-full border-0 rounded-b-2xl bg-[#111111]"
            onLoad={() => setIsLoading(false)}
            allow="camera; microphone; autoplay; fullscreen"
            title="Book a Product Demo"
          />
        </div>
      </div>
    </div>
  );
}
