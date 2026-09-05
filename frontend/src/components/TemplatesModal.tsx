"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { TemplateItem } from "@/lib/types";
import { getTemplates } from "@/lib/api";
import {
  FileTextIcon,
  ZapIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  AlertCircleIcon,
} from "./Icons";

interface Props {
  open: boolean;
  onClose: () => void;
  onLoadTemplate: (templateId: string) => Promise<void>;
  onLoadDemo: () => Promise<void>;
  loadingDemo?: boolean;
  loadingTemplateId?: string | null;
}

const CATEGORIES = [
  { id: "all", label: "All Templates" },
  { id: "Immigration", label: "Immigration (USCIS)" },
  { id: "Tax", label: "IRS Tax Forms" },
  { id: "Corporate & HR", label: "Corporate & HR" },
];

export function TemplatesModal({
  open,
  onClose,
  onLoadTemplate,
  onLoadDemo,
  loadingDemo = false,
  loadingTemplateId = null,
}: Props) {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open && templates.length === 0) {
      setLoading(true);
      setError("");
      getTemplates()
        .then((data) => {
          setTemplates(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to load templates");
          setLoading(false);
        });
    }
  }, [open, templates.length]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesCategory =
        selectedCategory === "all" || t.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.code.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [templates, selectedCategory, searchQuery]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-800 text-slate-200 overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-800/90 flex items-start justify-between gap-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 text-blue-400 flex items-center justify-center shadow-xs flex-shrink-0">
              <FileTextIcon size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Official Form Template Hub
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-blue-950 text-blue-400 border border-blue-800/80 text-[10px] font-bold uppercase tracking-wider">
                  1-Click Presets
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Select from standard USCIS, IRS tax, and corporate AcroForms for instant population.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Modal Body Container with Scroll */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ⚡ 1-Click Instant Demo Hero Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900/40 via-slate-900 to-indigo-950/40 border border-blue-800/50 p-5 shadow-lg">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    Recommended First-Time Experience
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white">
                  Launch 1-Click Demo (38-Page I-129 + Categorized Packet)
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Instantly load the full USCIS Form I-129 (927 fields) alongside our multi-format candidate dummy packet to test automated field population in seconds.
                </p>
              </div>

              <button
                onClick={onLoadDemo}
                disabled={loadingDemo}
                className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
              >
                {loadingDemo ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading Demo Studio…</span>
                  </>
                ) : (
                  <>
                    <ZapIcon size={14} className="text-amber-300" />
                    <span>⚡ Try Demo Form</span>
                    <ArrowRightIcon size={13} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Category Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  const count =
                    cat.id === "all"
                      ? templates.length
                      : templates.filter((t) => t.category === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-white text-slate-900 shadow-sm"
                          : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750"
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                          isSelected
                            ? "bg-slate-200 text-slate-800"
                            : "bg-slate-700/80 text-slate-400"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search Box */}
              <div className="relative min-w-[220px]">
                <input
                  type="text"
                  placeholder="Search forms (e.g. I-129, W-9, NDA)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-1.5 pl-8 bg-slate-800/90 border border-slate-700/90 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1.5 text-slate-400 hover:text-white text-xs cursor-pointer font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2">
              <AlertCircleIcon size={16} className="text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-400">Loading official form templates…</p>
            </div>
          )}

          {/* Template Cards Grid */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => {
                const isLoadingThis = loadingTemplateId === template.id;
                const isDemo = template.is_demo_ready;

                return (
                  <div
                    key={template.id}
                    className={`rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between space-y-4 hover:border-slate-600 bg-slate-800/60 hover:bg-slate-800/90 ${
                      isDemo ? "border-blue-700/70 bg-blue-950/20" : "border-slate-750"
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Top Chips */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                            template.category === "Immigration"
                              ? "bg-blue-950 text-blue-300 border-blue-800"
                              : template.category === "Tax"
                              ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                              : "bg-indigo-950 text-indigo-300 border-indigo-800"
                          }`}
                        >
                          {template.category}
                        </span>

                        <span className="text-[11px] font-semibold text-slate-400">
                          {template.pages} {template.pages === 1 ? "Page" : "Pages"} · ~{template.estimated_fields} Fields
                        </span>
                      </div>

                      {/* Title & Code */}
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-1.5">
                          <span>{template.code}</span>
                          {isDemo && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[9px] font-bold">
                              Demo Ready
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-slate-300 mt-0.5">
                          {template.title}
                        </p>
                      </div>

                      {/* Description */}
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {template.description}
                      </p>

                      {/* Required Sources Checklist */}
                      <div className="pt-1">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Source Inputs:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {template.required_sources.map((src, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 flex items-center gap-1"
                            >
                              <span className="text-blue-400">✓</span> {src}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                        <ShieldCheckIcon size={12} className="text-emerald-400" />
                        <span>AcroForm Vector Verified</span>
                      </div>

                      <button
                        onClick={() => {
                          if (isDemo) {
                            onLoadDemo();
                          } else {
                            onLoadTemplate(template.id);
                          }
                        }}
                        disabled={isLoadingThis || loadingDemo}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                          isDemo
                            ? "bg-blue-600 hover:bg-blue-500 text-white shadow-xs"
                            : "bg-slate-700 hover:bg-slate-600 text-white"
                        }`}
                      >
                        {isLoadingThis ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Opening…</span>
                          </>
                        ) : (
                          <>
                            <span>{isDemo ? "⚡ Open Demo" : "Open in Studio"}</span>
                            <span className="text-xs">→</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && filteredTemplates.length === 0 && (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-300">
                No templates matching &quot;{searchQuery}&quot;
              </p>
              <p className="text-xs text-slate-500">
                Try searching for a different keyword or select &quot;All Templates&quot;.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>All forms preserve official government seals, barcodes, and vector typography.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
