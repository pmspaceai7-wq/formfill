"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import {
  UploadIcon,
  FileTextIcon,
  ArrowRightIcon,
  AlertCircleIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  SparklesIcon,
} from "./Icons";

interface Props {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  error?: string;
  onClearError?: () => void;
  isLoggedIn?: boolean;
  onRequireAuth?: () => void;
  onTemplateSelect?: (templateId: string) => void;
  isTemplateLoading?: boolean;
}

interface FaqItem {
  question: string;
  answer: string;
}


const FAQ_DATA: FaqItem[] = [
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

export function HeroUpload({
  onFileSelected,
  isLoading,
  error,
  onClearError,
  isLoggedIn = false,
  onRequireAuth,
  onTemplateSelect,
  isTemplateLoading = false,
}: Props) {
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [formSearch, setFormSearch] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Active Live GIF-Style Auto-Filling Animation State
  const [animStep, setAnimStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimStep((prev) => (prev >= 4 ? 0 : prev + 1));
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isLoggedIn && onRequireAuth) {
      onRequireAuth();
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="relative min-h-[calc(100vh-65px)] bg-slate-50/70 text-slate-800 flex flex-col justify-between overflow-hidden">
      {/* ── Ambient Background Glow Blobs (Smooth Floating Mesh) ── */}
      <div className="absolute top-12 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none animate-blob"></div>
      <div className="absolute top-48 right-1/4 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-32 left-1/3 w-72 h-72 bg-sky-300/10 rounded-full blur-3xl pointer-events-none animate-blob animation-delay-4000"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Step Indicator Banner */}
        <div className="flex items-center justify-center mb-10 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 sm:gap-3 p-1.5 bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xs text-xs font-medium text-slate-600 transition-all hover:shadow-sm">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-xs shadow-indigo-500/20 transition-transform duration-200 hover:scale-[1.02]">
              <span className="w-4 h-4 rounded-full bg-indigo-700 text-white flex items-center justify-center font-bold text-[10px]">
                1
              </span>
              <span>Upload PDF Form</span>
            </div>
            <ArrowRightIcon size={13} className="text-slate-300 transition-transform duration-200 hover:translate-x-0.5" />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 transition-colors">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                2
              </span>
              <span>Attach Data Source</span>
            </div>
            <ArrowRightIcon size={13} className="text-slate-300 transition-transform duration-200 hover:translate-x-0.5" />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 transition-colors">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                3
              </span>
              <span>Download Completed Form</span>
            </div>
          </div>
        </div>

        {/* Hero Section: 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Headline & Action Dropzone */}
          <div className="lg:col-span-7 flex flex-col space-y-5 animate-fade-in-up">
            {/* Tagline Badge with Shimmer Glow */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-2xs text-slate-700 font-semibold text-xs w-fit transition-all duration-300 hover:border-indigo-300 hover:shadow-sm hover:scale-[1.02]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
              </span>
              <SparklesIcon size={13} className="text-indigo-600" />
              <span>Enterprise Regulatory AcroForm Engine</span>
            </div>

            {/* Main Headline (High-Impact Executive Styling) */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15] transition-all">
              Automate Complex Legal &amp; Federal Forms <br />
              <span className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 bg-clip-text text-transparent">
                With Sovereign Vector Precision.
              </span>
            </h1>

            {/* Subtitle (Catchy Corporate Lead Quote) */}
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl font-normal">
              Eliminate manual data transcription across USCIS, IRS, and corporate petitions. <span className="text-slate-900 font-semibold">SpaceFill</span> ingests candidate resumes, payroll records, and corporate profiles to auto-populate multi-page AcroForms in seconds—guaranteeing 100% vector fidelity and zero cloud data retention.
            </p>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600 pt-1">
              <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-slate-200/90 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                <span className="font-semibold text-slate-700">Sub-Pixel Field Calibration</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-slate-200/90 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span className="font-semibold text-slate-700">Zero Cloud Retention</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-slate-200/90 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-violet-600"></span>
                <span className="font-semibold text-slate-700">Audit-Ready Vector PDF</span>
              </div>
            </div>

            {/* Error banner if any */}
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start justify-between gap-3 shadow-xs animate-in fade-in transition-all">
                <div className="flex items-center gap-2">
                  <AlertCircleIcon size={16} className="text-red-500 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                {onClearError && (
                  <button onClick={onClearError} className="font-bold hover:text-red-900 cursor-pointer transition-transform hover:scale-110">
                    ✕
                  </button>
                )}
              </div>
            )}

            {/* Upload Dropzone Card with Enhanced Hover Transitions & Indigo Glow */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                if (!isLoggedIn && onRequireAuth) {
                  onRequireAuth();
                  return;
                }
                fileInputRef.current?.click();
              }}
              className={`relative group rounded-2xl border-2 border-dashed transition-all duration-300 p-8 sm:p-9 text-center cursor-pointer bg-white/90 backdrop-blur-sm shadow-sm ${
                isDragging
                  ? "border-indigo-500 bg-indigo-50/60 scale-[1.02] shadow-xl shadow-indigo-500/15 ring-4 ring-indigo-500/10"
                  : "border-slate-300 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/8 hover:-translate-y-1"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    if (!isLoggedIn && onRequireAuth) {
                      onRequireAuth();
                      return;
                    }
                    onFileSelected(e.target.files[0]);
                  }
                }}
              />

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-6 space-y-3">
                  <div className="relative">
                    <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 w-10 h-10 border-3 border-transparent border-b-violet-500 rounded-full animate-spin animation-delay-2000"></div>
                  </div>
                  <div className="text-sm font-bold text-slate-900 animate-pulse">
                    Analyzing Form Structure &amp; Fields…
                  </div>
                  <div className="text-xs text-slate-500">
                    Rendering interactive page canvas…
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-13 h-13 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-110 group-hover:rotate-1 transition-all duration-300 shadow-xs">
                    <UploadIcon size={24} className="transition-transform duration-300 group-hover:-translate-y-0.5" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-900">
                      <span className="text-indigo-600 group-hover:underline font-bold">
                        Select a fillable PDF form
                      </span>{" "}
                      or drag and drop
                    </div>
                    <p className="text-xs text-slate-500">
                      Supports standard AcroForm documents (Tax, Legal, USCIS, Employment)
                    </p>
                  </div>
                  <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      Official AcroForms
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Max file size: 50MB
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-[11px] text-indigo-600 font-bold">
                      💡 Don&apos;t have a file? 20+ official forms are already pre-loaded below ↓
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* In-Hero Pre-Loaded Forms Guidance & 1-Click Launchers */}
            {onTemplateSelect && (
              <div className="rounded-2xl bg-indigo-50/70 border border-indigo-100/90 p-3.5 shadow-2xs space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 shadow-2xs">
                      ⚡
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      No PDF to upload? 20+ official USCIS, DOL &amp; federal filings are pre-loaded:
                    </span>
                  </div>
                  <a
                    href="#form-library"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-bold text-xs hover:underline flex-shrink-0 cursor-pointer"
                  >
                    <span>Browse all 20+ pre-loaded forms ↓</span>
                  </a>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTemplateSelect("uscis-i129");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 border border-slate-200/90 hover:border-indigo-300 text-slate-800 hover:text-indigo-700 font-bold text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 hover:scale-[1.02]"
                  >
                    <FileTextIcon size={12} className="text-indigo-600" />
                    <span>Form I-129 (H-1B)</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTemplateSelect("uscis-i130");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200/90 hover:border-emerald-300 text-slate-800 hover:text-emerald-700 font-bold text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 hover:scale-[1.02]"
                  >
                    <FileTextIcon size={12} className="text-emerald-600" />
                    <span>Form I-130 (Family)</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTemplateSelect("uscis-i485");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 border border-slate-200/90 hover:border-indigo-300 text-slate-800 hover:text-indigo-700 font-bold text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 hover:scale-[1.02]"
                  >
                    <FileTextIcon size={12} className="text-indigo-600" />
                    <span>Form I-485 (Green Card)</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTemplateSelect("uscis-i765");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-teal-50 border border-slate-200/90 hover:border-teal-300 text-slate-800 hover:text-teal-700 font-bold text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 hover:scale-[1.02]"
                  >
                    <FileTextIcon size={12} className="text-teal-600" />
                    <span>Form I-765 (EAD)</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTemplateSelect("uscis-n400");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-purple-50 border border-slate-200/90 hover:border-purple-300 text-slate-800 hover:text-purple-700 font-bold text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 hover:scale-[1.02]"
                  >
                    <FileTextIcon size={12} className="text-purple-600" />
                    <span>Form N-400 (Citizenship)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Animated Document Preview Card with Floating Badges & Laser Beam */}
          <div className="lg:col-span-5 flex flex-col items-center relative animate-fade-in-up">
            {/* Floating Highlight Badges */}
            <div className="absolute -top-3 -right-3 z-30 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 shadow-md text-[11px] font-bold text-slate-700 animate-float">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
              <span>⚡ 927 Fields Mapped</span>
            </div>

            <div className="absolute -bottom-4 -left-3 z-30 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 shadow-md text-[11px] font-bold text-emerald-700 animate-float-reverse">
              <span>🛡️ 100% Vector Quality</span>
            </div>

            <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl border border-slate-200/90 relative overflow-hidden transition-all duration-300 hover:shadow-2xl">
              {/* Laser Scanning Beam Sweep */}
              <div className="scanner-beam"></div>

              {/* Header inside card */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 text-xs font-medium text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400/80"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80"></span>
                  <span className="ml-1 font-mono text-[11px] text-slate-800 font-bold">
                    form_i129_petition.pdf
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100 shadow-2xs">
                  38 Pages · 927 Fields
                </span>
              </div>

              {/* Structured Form Section Preview with Working Animated Loop */}
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 text-xs text-slate-700">
                <div className="font-semibold text-slate-900 text-xs border-b border-slate-200 pb-2 flex items-center justify-between">
                  <span>Part 1. Petitioner Information</span>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold transition-all duration-300 ${
                      animStep >= 1
                        ? "text-emerald-700 bg-emerald-50 border border-emerald-200 shadow-2xs"
                        : "text-slate-400 bg-slate-100"
                    }`}
                  >
                    {animStep === 0 && "⌛ Scanning Fields…"}
                    {animStep === 1 && "⚡ Matching Source…"}
                    {animStep >= 2 && "✓ Verified Mapping"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 block mb-1">
                      Legal Given Name
                    </label>
                    <div
                      className={`p-2 rounded text-xs transition-all duration-300 ${
                        animStep >= 1
                          ? "bg-white border border-indigo-400 text-slate-900 font-medium shadow-xs ring-2 ring-indigo-500/10"
                          : "bg-white/60 text-transparent border border-dashed border-slate-200"
                      }`}
                    >
                      {animStep >= 1 ? "Alexander" : "—"}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 block mb-1">
                      Legal Family Name
                    </label>
                    <div
                      className={`p-2 rounded text-xs transition-all duration-300 ${
                        animStep >= 1
                          ? "bg-white border border-indigo-400 text-slate-900 font-medium shadow-xs ring-2 ring-indigo-500/10"
                          : "bg-white/60 text-transparent border border-dashed border-slate-200"
                      }`}
                    >
                      {animStep >= 1 ? "Vance" : "—"}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-medium text-slate-500 block mb-1">
                    Company / Organization Name
                  </label>
                  <div
                    className={`p-2 rounded text-xs transition-all duration-300 ${
                      animStep >= 2
                        ? "bg-white border border-indigo-400 text-slate-900 font-medium shadow-xs ring-2 ring-indigo-500/10"
                        : "bg-white/60 text-transparent border border-dashed border-slate-200"
                    }`}
                  >
                    {animStep >= 2 ? "Nexus Global Technologies LLC" : "—"}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-medium text-slate-500 block mb-1">
                    Primary Contact Email
                  </label>
                  <div
                    className={`p-2 rounded text-xs transition-all duration-300 ${
                      animStep >= 2
                        ? "bg-white border border-indigo-400 text-slate-900 font-medium shadow-xs ring-2 ring-indigo-500/10"
                        : "bg-white/60 text-transparent border border-dashed border-slate-200"
                    }`}
                  >
                    {animStep >= 2 ? "alex.vance@nexusglobal.com" : "—"}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 block mb-1">
                      City / Municipality
                    </label>
                    <div
                      className={`p-2 rounded text-xs transition-all duration-300 ${
                        animStep >= 3
                          ? "bg-white border border-indigo-400 text-slate-900 font-medium shadow-xs ring-2 ring-indigo-500/10"
                          : "bg-white/60 text-transparent border border-dashed border-slate-200"
                      }`}
                    >
                      {animStep >= 3 ? "San Francisco" : "—"}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 block mb-1">
                      State / Postal Code
                    </label>
                    <div
                      className={`p-2 rounded text-xs transition-all duration-300 ${
                        animStep >= 3
                          ? "bg-white border border-indigo-400 text-slate-900 font-medium shadow-xs ring-2 ring-indigo-500/10"
                          : "bg-white/60 text-transparent border border-dashed border-slate-200"
                      }`}
                    >
                      {animStep >= 3 ? "CA 94105" : "—"}
                    </div>
                  </div>
                </div>

                {/* Animated Status Banner */}
                <div
                  className={`mt-3 p-2.5 rounded-xl flex items-center justify-between shadow-xs transition-all duration-500 ${
                    animStep >= 4
                      ? "bg-indigo-600 text-white scale-[1.01] shadow-md shadow-indigo-500/25"
                      : "bg-indigo-950 text-white border border-indigo-900/60"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>
                      {animStep >= 4
                        ? "✓ 318 Fields Populated in 0.8s"
                        : "Populating Form Fields…"}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-md border border-white/30 backdrop-blur-xs">
                    {animStep >= 4 ? "Ready to Export" : "Processing"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── FORM LIBRARY SECTION ── */}
        {onTemplateSelect && (
          <div id="form-library" className="mt-16 pt-12 border-t border-slate-200">
            {/* Section Header: Centered with Catchy Corporate Copy & Verified Badges */}
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-10 space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50/80 border border-indigo-200/70 text-indigo-700 font-bold text-[11px] uppercase tracking-wider shadow-2xs">
                <SparklesIcon size={13} className="text-indigo-600" />
                <span>Pre-Loaded Official Filings · No PDF Upload Required</span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Official Federal &amp; Immigration{" "}
                <span className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 bg-clip-text text-transparent">
                  AcroForm Registry
                </span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal max-w-2xl">
                &ldquo;No document on hand? You don&apos;t need to upload your own PDF. Select any of the 20 pre-calibrated federal filings below to auto-populate and test directly in the studio with pre-mapped vector fields.&rdquo;
              </p>

              {/* Centered Key Metrics Banner */}
              <div className="inline-flex flex-wrap items-center justify-center gap-3.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 px-4 py-2 rounded-xl shadow-2xs mt-1">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>20 Calibrated Official Filings</span>
                </div>
                <span className="text-slate-300">·</span>
                <span>3,500+ Fields Mapped</span>
                <span className="text-slate-300">·</span>
                <span>100% Vector Quality</span>
                <span className="text-slate-300">·</span>
                <span className="text-emerald-700 font-bold">USCIS, DOL &amp; DOS 2024–2026 Compliant</span>
              </div>
            </div>

            {(() => {
              interface CatalogForm {
                id: string;
                code: string;
                title: string;
                subtitle: string;
                category: string;
                agency: string;
                pages: number;
                fields: number;
                desc: string;
                relevantFor: string;
              }

              const FORMS: CatalogForm[] = [
                // ── Work & Petitions ──
                {
                  id: "uscis-i129",
                  code: "Form I-129",
                  title: "Petition for a Nonimmigrant Worker",
                  subtitle: "H-1B, L-1, O-1, P-1, TN, & E-2 Specialty Petitions",
                  category: "Work & Petitions",
                  agency: "USCIS · DHS",
                  pages: 38,
                  fields: 927,
                  desc: "High-volume corporate petition for nonimmigrant specialty occupations and intracompany transferees. Auto-maps 927 fields in under one second.",
                  relevantFor: "Specialty occupations, intracompany transferees, nonimmigrant workers (H-1B, L-1, O-1, TN)",
                },
                {
                  id: "uscis-i140",
                  code: "Form I-140",
                  title: "Immigrant Petition for Alien Workers",
                  subtitle: "Permanent Employment Preference (EB-1, EB-2, EB-3)",
                  category: "Work & Petitions",
                  agency: "USCIS · DHS",
                  pages: 9,
                  fields: 180,
                  desc: "Permanent immigrant worker preference petitions for priority researchers, advanced degree executives, and skilled corporate professionals.",
                  relevantFor: "Immigrant worker petitions (EB-1, EB-2, EB-3 permanent employment preference)",
                },
                {
                  id: "uscis-i765",
                  code: "Form I-765",
                  title: "Application for Employment Authorization",
                  subtitle: "Employment Authorization Document (EAD)",
                  category: "Work & Petitions",
                  agency: "USCIS · DHS",
                  pages: 7,
                  fields: 142,
                  desc: "Streamline statutory work authorization filings for OPT/STEM extensions, DACA candidates, and pending adjustment applicants with precision comb-digit alignment.",
                  relevantFor: "Work authorization for adjustment applicants, OPT/STEM, TPS, DACA, and eligible dependents",
                },
                {
                  id: "uscis-i9",
                  code: "Form I-9",
                  title: "Employment Eligibility Verification",
                  subtitle: "Mandatory Federal Identity Audit Compliance",
                  category: "Work & Petitions",
                  agency: "USCIS · DHS",
                  pages: 4,
                  fields: 85,
                  desc: "Mandatory Section 1 & 2 employment verification for corporate hires. Guarantees audit-ready compliance against federal statutory standards.",
                  relevantFor: "Mandatory employment eligibility verification for all U.S. employers and hires",
                },
                {
                  id: "uscis-i129s",
                  code: "Form I-129S",
                  title: "Nonimmigrant Petition Based on Blanket L",
                  subtitle: "Intracompany Executive & Managerial Relocation",
                  category: "Work & Petitions",
                  agency: "USCIS · DHS",
                  pages: 6,
                  fields: 120,
                  desc: "Expedited multinational corporate transferee processing for executives, managers, and specialized knowledge experts under approved blanket L petitions.",
                  relevantFor: "Intracompany managers, executives, and specialized knowledge under blanket L petitions",
                },
                {
                  id: "uscis-i907",
                  code: "Form I-907",
                  title: "Request for Premium Processing Service",
                  subtitle: "Guaranteed 15-Day Expedited Adjudication",
                  category: "Work & Petitions",
                  agency: "USCIS · DHS",
                  pages: 3,
                  fields: 45,
                  desc: "Guaranteed 15-calendar-day expedited USCIS adjudication docketing for qualifying employment petitions, appeals, and corporate filings.",
                  relevantFor: "15-calendar-day expedited processing for Form I-129, I-140, and select USCIS petitions",
                },
                {
                  id: "dol-eta9089",
                  code: "ETA Form 9089",
                  title: "Application for Permanent Employment Certification",
                  subtitle: "PERM Labor Certification · Department of Labor",
                  category: "Work & Petitions",
                  agency: "DOL · FLAG",
                  pages: 15,
                  fields: 310,
                  desc: "Department of Labor PERM certification verifying that there are insufficient able, willing, and qualified U.S. workers available before immigrant petitions.",
                  relevantFor: "Department of Labor PERM certification required before filing EB-2 & EB-3 Form I-140",
                },

                // ── Family & Relatives ──
                {
                  id: "uscis-i130",
                  code: "Form I-130",
                  title: "Petition for Alien Relative",
                  subtitle: "Family Relationship & Preference Categories",
                  category: "Family & Relatives",
                  agency: "USCIS · DHS",
                  pages: 12,
                  fields: 450,
                  desc: "Establishes a qualifying family relationship for a foreign citizen relative to immigrate to the United States (spouses, children, parents, siblings).",
                  relevantFor: "Family relationship (immediate relatives, preference categories)",
                },
                {
                  id: "uscis-i864",
                  code: "Form I-864",
                  title: "Affidavit of Support Under Section 213A",
                  subtitle: "Legally Enforceable Financial Sponsorship",
                  category: "Family & Relatives",
                  agency: "USCIS · DHS",
                  pages: 12,
                  fields: 219,
                  desc: "Legally enforceable contract showing the sponsor has adequate means of financial support and the intending immigrant will not become a public charge.",
                  relevantFor: "Financial support requirement for family & some employment cases",
                },

                // ── Green Card & Status ──
                {
                  id: "uscis-i485",
                  code: "Form I-485",
                  title: "Application to Register Permanent Residence",
                  subtitle: "Adjustment of Status (Green Card Application)",
                  category: "Green Card & Status",
                  agency: "USCIS · DHS",
                  pages: 20,
                  fields: 410,
                  desc: "Flagship 20-page Green Card application. Automates hours of complex biographical, immigration history, and admissibility schedules.",
                  relevantFor: "Adjustment of Status to Lawful Permanent Resident (in the U.S.)",
                },
                {
                  id: "uscis-i693",
                  code: "Form I-693",
                  title: "Report of Immigration Medical Examination",
                  subtitle: "Civil Surgeon Health & Immunization Record",
                  category: "Green Card & Status",
                  agency: "USCIS · DHS",
                  pages: 11,
                  fields: 155,
                  desc: "Official medical examination and vaccination record certified by an authorized USCIS Civil Surgeon for adjustment of status compliance.",
                  relevantFor: "Immigration medical examination and vaccination record certified by Civil Surgeon",
                },
                {
                  id: "uscis-i751",
                  code: "Form I-751",
                  title: "Petition to Remove Conditions on Residence",
                  subtitle: "Marriage-Based Conditional Status Removal",
                  category: "Green Card & Status",
                  agency: "USCIS · DHS",
                  pages: 11,
                  fields: 329,
                  desc: "Removes conditions on 2-year marriage-based green cards to transition the conditional permanent resident to full 10-year lawful permanent resident status.",
                  relevantFor: "Spouses of U.S. citizens/LPRs removing 2-yr conditional residency",
                },
                {
                  id: "uscis-i829",
                  code: "Form I-829",
                  title: "Petition by Investor to Remove Conditions",
                  subtitle: "EB-5 Investor 10-Job Creation Verification",
                  category: "Green Card & Status",
                  agency: "USCIS · DHS",
                  pages: 10,
                  fields: 359,
                  desc: "EB-5 immigrant investor petition demonstrating full capital investment and the required creation of 10 full-time jobs for qualifying U.S. workers.",
                  relevantFor: "EB-5 investors removing 2-yr conditional residency",
                },
                {
                  id: "uscis-i539",
                  code: "Form I-539",
                  title: "Application to Extend/Change Nonimmigrant Status",
                  subtitle: "Dependents, Students & Visitor Extensions",
                  category: "Green Card & Status",
                  agency: "USCIS · DHS",
                  pages: 7,
                  fields: 159,
                  desc: "Used by dependents (H-4, L-2), students (F-1), and temporary visitors (B-1/B-2) to extend their lawful stay or change to another nonimmigrant status.",
                  relevantFor: "Dependents, visitors, students, workers extending stay",
                },
                {
                  id: "uscis-i90",
                  code: "Form I-90",
                  title: "Application to Replace Permanent Resident Card",
                  subtitle: "10-Year Green Card Renewal & Replacement",
                  category: "Green Card & Status",
                  agency: "USCIS · DHS",
                  pages: 12,
                  fields: 110,
                  desc: "Statutory 10-year Permanent Resident Card renewals, biometric credential updates, and rapid replacement of lost, stolen, or damaged cards.",
                  relevantFor: "10-year Permanent Resident Card renewal and replacement of lost/damaged green cards",
                },

                // ── Travel & Parole ──
                {
                  id: "uscis-i131",
                  code: "Form I-131",
                  title: "Application for Travel Documents",
                  subtitle: "Advance Parole, Reentry Permits & Travel Foils",
                  category: "Travel & Parole",
                  agency: "USCIS · DHS",
                  pages: 9,
                  fields: 130,
                  desc: "Multi-purpose travel authorization ensuring seamless international travel and reentry privileges for pending status beneficiaries.",
                  relevantFor: "Travel permits (Advance Parole, Reentry Permits, Refugee Travel Documents)",
                },
                {
                  id: "uscis-i131a",
                  code: "Form I-131A",
                  title: "Application for Carrier Documentation",
                  subtitle: "Emergency Airline Boarding Foil & Consular Letter",
                  category: "Travel & Parole",
                  agency: "USCIS · DHS",
                  pages: 5,
                  fields: 65,
                  desc: "Emergency consular carrier documentation and airline boarding credentials for lawful permanent residents stranded outside the United States.",
                  relevantFor: "Emergency airline boarding authorization for permanent residents stranded abroad",
                },

                // ── Citizenship & Consular ──
                {
                  id: "uscis-n400",
                  code: "Form N-400",
                  title: "Application for Naturalization",
                  subtitle: "United States Citizenship Application",
                  category: "Citizenship & Consular",
                  agency: "USCIS · DHS",
                  pages: 14,
                  fields: 440,
                  desc: "Comprehensive application used by eligible lawful permanent residents of 3 or 5 years to apply for United States citizenship.",
                  relevantFor: "Eligible Green Card holders applying for U.S. citizenship (Naturalization)",
                },
                {
                  id: "dos-ds160",
                  code: "Form DS-160",
                  title: "Online Nonimmigrant Visa Application",
                  subtitle: "Consular Web Filing (CEAC Embassy Stamping)",
                  category: "Citizenship & Consular",
                  agency: "State Dept · CEAC",
                  pages: 8,
                  fields: 160,
                  desc: "Mandatory electronic visa application for all individuals applying for a nonimmigrant visa (B-1/B-2, F-1, H-1B, L-1, O-1) at U.S. embassies worldwide.",
                  relevantFor: "Consular visa applicants worldwide (B-1/B-2, F-1, H-1B, L-1, O-1 visa stamping)",
                },
                {
                  id: "dos-ds260",
                  code: "Form DS-260",
                  title: "Online Immigrant Visa Application",
                  subtitle: "National Visa Center (NVC) Consular Processing",
                  category: "Citizenship & Consular",
                  agency: "State Dept · CEAC",
                  pages: 12,
                  fields: 240,
                  desc: "Electronic immigrant visa application filed with the Department of State by beneficiaries residing abroad after petition approval.",
                  relevantFor: "Consular immigrant visa processing via National Visa Center (NVC) for abroad applicants",
                },
              ];

              const CATEGORIES = [
                { id: "all", label: "All Filings", count: FORMS.length },
                { id: "Work & Petitions", label: "Work & Petitions", count: FORMS.filter(f => f.category === "Work & Petitions").length },
                { id: "Family & Relatives", label: "Family & Relatives", count: FORMS.filter(f => f.category === "Family & Relatives").length },
                { id: "Green Card & Status", label: "Green Card & Status", count: FORMS.filter(f => f.category === "Green Card & Status").length },
                { id: "Travel & Parole", label: "Travel & Parole", count: FORMS.filter(f => f.category === "Travel & Parole").length },
                { id: "Citizenship & Consular", label: "Citizenship & Consular", count: FORMS.filter(f => f.category === "Citizenship & Consular").length },
              ];

              const POPULAR_TAGS: Record<string, string> = {
                "uscis-i129": "★ Flagship H-1B",
                "uscis-i765": "★ Priority EAD",
                "uscis-i485": "★ Core Green Card",
                "uscis-i130": "★ Family Core",
                "uscis-n400": "★ Citizenship",
                "uscis-i9": "★ Audit Essential",
              };

              const renderCatIcon = (catId: string, active: boolean) => {
                const cls = active ? "text-white" : "text-slate-500 group-hover:text-indigo-600";
                if (catId === "Work & Petitions") {
                  return (
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
                      <rect width="20" height="14" x="2" y="7" rx="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                  );
                }
                if (catId === "Family & Relatives") {
                  return (
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  );
                }
                if (catId === "Green Card & Status") {
                  return (
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  );
                }
                if (catId === "Travel & Parole") {
                  return (
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
                      <circle cx="12" cy="12" r="10" />
                      <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z" />
                    </svg>
                  );
                }
                if (catId === "Citizenship & Consular") {
                  return (
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                      <line x1="4" x2="4" y1="22" y2="15" />
                    </svg>
                  );
                }
                // All Filings
                return (
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
                    <rect width="7" height="7" x="3" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="14" rx="1" />
                    <rect width="7" height="7" x="3" y="14" rx="1" />
                  </svg>
                );
              };

              const filteredForms = FORMS.filter((f) => {
                const matchesCat = selectedCategory === "all" || f.category === selectedCategory;
                const matchesSearch =
                  !formSearch.trim() ||
                  f.code.toLowerCase().includes(formSearch.toLowerCase()) ||
                  f.title.toLowerCase().includes(formSearch.toLowerCase()) ||
                  f.subtitle.toLowerCase().includes(formSearch.toLowerCase()) ||
                  f.desc.toLowerCase().includes(formSearch.toLowerCase()) ||
                  f.relevantFor.toLowerCase().includes(formSearch.toLowerCase());
                return matchesCat && matchesSearch;
              });

              return (
                <div className="space-y-6 w-full">
                  {/* Category Filter Tabs & Search: Centered Hub Layout */}
                  <div className="flex flex-col items-center justify-center gap-4 mb-8 w-full">
                    {/* Modern Segmented Tabs with Clean SVG Icons */}
                    <div className="inline-flex flex-wrap items-center justify-center gap-1.5 p-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-xs text-xs font-medium">
                      {CATEGORIES.map((cat) => {
                        const active = selectedCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`group px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                              active
                                ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-500/25 scale-[1.02]"
                                : "text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/70"
                            }`}
                          >
                            {renderCatIcon(cat.id, active)}
                            <span>{cat.label}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                active
                                  ? "bg-indigo-500/90 text-white"
                                  : "bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700"
                              }`}
                            >
                              {cat.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Search Input Centered with High-End Styling */}
                    <div className="relative w-full max-w-md mx-auto">
                      <input
                        type="text"
                        value={formSearch}
                        onChange={(e) => setFormSearch(e.target.value)}
                        placeholder="Search filings by code, visa type, or title (e.g. H-1B, I-129, AOS)…"
                        className="w-full pl-9 pr-8 py-2.5 bg-white/90 backdrop-blur-xs border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-xs transition-all text-center sm:text-left"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                        🔍
                      </span>
                      {formSearch && (
                        <button
                          onClick={() => setFormSearch("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Contextual Guidance Banner for All Filings vs Category View */}
                  {selectedCategory === "all" ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-50/50 via-slate-50/90 to-purple-50/40 border border-slate-200/90 text-xs text-slate-600 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                        <span>
                          <b>Tactile Form Catalog:</b> Click any form card to immediately open and auto-fill it with your documents.
                        </span>
                      </div>
                      <span className="text-[11px] font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/70 flex-shrink-0">
                        {filteredForms.length} Compliance Forms Ready
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-indigo-50/80 border border-indigo-200/90 text-xs text-indigo-950 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-indigo-700 flex-shrink-0">Targeted Filings:</span>
                        <span className="text-slate-700">
                          Showing compliance specifications and eligibility rules for <b>{selectedCategory}</b>.
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedCategory("all")}
                        className="text-xs font-extrabold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex-shrink-0 flex items-center gap-1"
                      >
                        ← Show All Forms ({FORMS.length})
                      </button>
                    </div>
                  )}

                  {/* Responsive Grid of Square Cards */}
                  {filteredForms.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs shadow-xs max-w-md mx-auto">
                      No compliance forms found matching &ldquo;{formSearch}&rdquo;. Try another search keyword or select All Filings.
                    </div>
                  ) : selectedCategory === "all" ? (
                    /* ── HANDSOME, BALANCED & MODERN CARDS FOR ALL FILINGS ── */
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4.5 w-full">
                      {filteredForms.map((form) => {
                        const isThisLoading = loadingTemplateId === form.id && isTemplateLoading;
                        const popularBadge = POPULAR_TAGS[form.id];

                        const categoryVisuals: Record<string, { iconBg: string; iconColor: string; iconBorder: string; badge: string; topBorder: string }> = {
                          "Work & Petitions": {
                            iconBg: "bg-indigo-50 text-indigo-600",
                            iconColor: "text-indigo-600",
                            iconBorder: "border-indigo-150/80",
                            badge: "bg-indigo-50 text-indigo-700 border-indigo-200/70",
                            topBorder: "border-t-indigo-500",
                          },
                          "Family & Relatives": {
                            iconBg: "bg-rose-50 text-rose-600",
                            iconColor: "text-rose-600",
                            iconBorder: "border-rose-150/80",
                            badge: "bg-rose-50 text-rose-700 border-rose-200/70",
                            topBorder: "border-t-rose-500",
                          },
                          "Green Card & Status": {
                            iconBg: "bg-emerald-50 text-emerald-600",
                            iconColor: "text-emerald-600",
                            iconBorder: "border-emerald-150/80",
                            badge: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
                            topBorder: "border-t-emerald-500",
                          },
                          "Travel & Parole": {
                            iconBg: "bg-amber-50 text-amber-600",
                            iconColor: "text-amber-600",
                            iconBorder: "border-amber-150/80",
                            badge: "bg-amber-50 text-amber-700 border-amber-200/70",
                            topBorder: "border-t-amber-500",
                          },
                          "Citizenship & Consular": {
                            iconBg: "bg-sky-50 text-sky-600",
                            iconColor: "text-sky-600",
                            iconBorder: "border-sky-150/80",
                            badge: "bg-sky-50 text-sky-700 border-sky-200/70",
                            topBorder: "border-t-sky-500",
                          },
                        };

                        const visual = categoryVisuals[form.category] || {
                          iconBg: "bg-slate-100 text-slate-600",
                          iconColor: "text-slate-600",
                          iconBorder: "border-slate-200",
                          badge: "bg-slate-50 text-slate-700 border-slate-200",
                          topBorder: "border-t-slate-400",
                        };

                        return (
                          <div
                            key={form.id}
                            onClick={() => {
                              if (!isTemplateLoading) {
                                setLoadingTemplateId(form.id);
                                onTemplateSelect(form.id);
                              }
                            }}
                            className={`bg-white rounded-2xl border border-slate-200/90 border-t-2 ${visual.topBorder} shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-300 hover:-translate-y-1 transition-all duration-200 group flex flex-col justify-between p-5 cursor-pointer select-none relative min-h-[220px]`}
                          >
                            {/* Card Top: Agency Icon + Form Code + Status Tag */}
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-9 h-9 rounded-xl ${visual.iconBg} ${visual.iconBorder} border flex items-center justify-center font-bold shadow-2xs flex-shrink-0 group-hover:scale-105 transition-transform duration-200`}>
                                  <FileTextIcon size={16} className={visual.iconColor} />
                                </div>
                                <div>
                                  <div className="text-sm font-extrabold text-slate-900 tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">
                                    {form.code}
                                  </div>
                                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                                    {form.agency.includes("DOL") ? "DOL" : form.agency.includes("State Dept") ? "Consular" : "USCIS"}
                                  </div>
                                </div>
                              </div>

                              {popularBadge ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs flex-shrink-0">
                                  {popularBadge}
                                </span>
                              ) : (
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${visual.badge} flex-shrink-0`}>
                                  {form.category}
                                </span>
                              )}
                            </div>

                            {/* Card Body: Title, Clear Description & Scope Pill */}
                            <div className="flex-1 flex flex-col justify-start mb-3">
                              <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2 min-h-[2.5rem] mb-1">
                                {form.title}
                              </h3>
                              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 font-normal min-h-[2.25rem] mb-2.5">
                                {form.desc}
                              </p>
                              <div className="mt-auto">
                                <span className="inline-block text-[10.5px] font-medium text-slate-600 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md line-clamp-1 max-w-full truncate">
                                  {form.subtitle}
                                </span>
                              </div>
                            </div>

                            {/* Card Footer: Metadata Specs & Elegant Action Pill */}
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                <span>{form.pages} pgs</span>
                                <span className="text-slate-300">·</span>
                                <span>{form.fields} fields</span>
                              </div>

                              <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 group-hover:bg-indigo-600 text-indigo-700 group-hover:text-white text-xs font-bold transition-all duration-200 shadow-2xs">
                                {isThisLoading ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                    <span>Opening…</span>
                                  </>
                                ) : (
                                  <>
                                    <span>Fill Form</span>
                                    <ArrowRightIcon size={12} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* ── IN-DEPTH REGULATORY CARDS FOR CATEGORY VIEW ── */
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4.5 w-full">
                      {filteredForms.map((form) => {
                        const isThisLoading = loadingTemplateId === form.id && isTemplateLoading;
                        const popularBadge = POPULAR_TAGS[form.id];

                        const categoryVisuals: Record<string, { iconBg: string; iconColor: string; iconBorder: string; badge: string; topBorder: string }> = {
                          "Work & Petitions": {
                            iconBg: "bg-indigo-50 text-indigo-600",
                            iconColor: "text-indigo-600",
                            iconBorder: "border-indigo-150/80",
                            badge: "bg-indigo-50 text-indigo-700 border-indigo-200/70",
                            topBorder: "border-t-indigo-500",
                          },
                          "Family & Relatives": {
                            iconBg: "bg-rose-50 text-rose-600",
                            iconColor: "text-rose-600",
                            iconBorder: "border-rose-150/80",
                            badge: "bg-rose-50 text-rose-700 border-rose-200/70",
                            topBorder: "border-t-rose-500",
                          },
                          "Green Card & Status": {
                            iconBg: "bg-emerald-50 text-emerald-600",
                            iconColor: "text-emerald-600",
                            iconBorder: "border-emerald-150/80",
                            badge: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
                            topBorder: "border-t-emerald-500",
                          },
                          "Travel & Parole": {
                            iconBg: "bg-amber-50 text-amber-600",
                            iconColor: "text-amber-600",
                            iconBorder: "border-amber-150/80",
                            badge: "bg-amber-50 text-amber-700 border-amber-200/70",
                            topBorder: "border-t-amber-500",
                          },
                          "Citizenship & Consular": {
                            iconBg: "bg-sky-50 text-sky-600",
                            iconColor: "text-sky-600",
                            iconBorder: "border-sky-150/80",
                            badge: "bg-sky-50 text-sky-700 border-sky-200/70",
                            topBorder: "border-t-sky-500",
                          },
                        };

                        const visual = categoryVisuals[form.category] || {
                          iconBg: "bg-slate-100 text-slate-600",
                          iconColor: "text-slate-600",
                          iconBorder: "border-slate-200",
                          badge: "bg-slate-50 text-slate-700 border-slate-200",
                          topBorder: "border-t-slate-400",
                        };

                        return (
                          <div
                            key={form.id}
                            onClick={() => {
                              if (!isTemplateLoading) {
                                setLoadingTemplateId(form.id);
                                onTemplateSelect(form.id);
                              }
                            }}
                            className={`bg-white rounded-2xl border border-slate-200/90 border-t-2 ${visual.topBorder} shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-300 hover:-translate-y-1 transition-all duration-200 group flex flex-col justify-between p-5 cursor-pointer select-none relative min-h-[260px]`}
                          >
                            {/* Card Top: Agency Icon + Form Code + Status Tag */}
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-9 h-9 rounded-xl ${visual.iconBg} ${visual.iconBorder} border flex items-center justify-center font-bold shadow-2xs flex-shrink-0 group-hover:scale-105 transition-transform duration-200`}>
                                  <FileTextIcon size={16} className={visual.iconColor} />
                                </div>
                                <div>
                                  <div className="text-sm font-extrabold text-slate-900 tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">
                                    {form.code}
                                  </div>
                                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                                    {form.agency.includes("DOL") ? "DOL" : form.agency.includes("State Dept") ? "Consular" : "USCIS"}
                                  </div>
                                </div>
                              </div>

                              {popularBadge ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs flex-shrink-0">
                                  {popularBadge}
                                </span>
                              ) : (
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${visual.badge} flex-shrink-0`}>
                                  {form.category}
                                </span>
                              )}
                            </div>

                            {/* Card Body: Title, Description & Rich Eligibility Specs */}
                            <div className="flex-1 flex flex-col justify-start">
                              <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2 min-h-[2.5rem] mb-1">
                                {form.title}
                              </h3>
                              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 font-normal mb-2">
                                {form.desc}
                              </p>

                              {/* Detailed Eligibility & Scope Box */}
                              <div className="p-2 rounded-xl bg-slate-50/90 border border-slate-200/80 text-xs mb-2">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                  <span>Eligible Scope</span>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed font-normal line-clamp-2">
                                  {form.relevantFor}
                                </p>
                              </div>

                              <div className="mt-auto">
                                <span className="inline-block text-[10.5px] font-medium text-indigo-700 bg-indigo-50/80 border border-indigo-100/80 px-2 py-0.5 rounded-md line-clamp-1 max-w-full truncate">
                                  {form.subtitle}
                                </span>
                              </div>
                            </div>

                            {/* Card Footer: Metadata Specs & Elegant Action Pill */}
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                <span>{form.pages} pgs</span>
                                <span className="text-slate-300">·</span>
                                <span>{form.fields} fields</span>
                              </div>

                              <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 group-hover:bg-indigo-600 text-indigo-700 group-hover:text-white text-xs font-bold transition-all duration-200 shadow-2xs">
                                {isThisLoading ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                    <span>Opening…</span>
                                  </>
                                ) : (
                                  <>
                                    <span>Auto-Fill</span>
                                    <ArrowRightIcon size={12} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── CORPORATE CLIENT TESTIMONIALS & EXECUTIVE QUOTES ── */}
            <div className="mt-20 pt-12 border-t border-slate-200">
              <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 font-bold text-[11px] uppercase tracking-wider shadow-2xs">
                  <span>Trusted by Enterprise Mobility &amp; Legal Teams</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                  Engineered for High-Stakes Compliance
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  See how corporate immigration practices, general counsel, and enterprise HR teams eliminate filing errors with SpaceFill.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1 text-amber-400 text-xs">
                      {"★★★★★"}
                    </div>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed italic">
                      &ldquo;SpaceFill slashed our H-1B and EAD preparation turnaround from 45 minutes to under 30 seconds per beneficiary. The sub-pixel comb-box alignment on Form I-129 is extraordinary.&rdquo;
                    </p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                      ER
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Elena Rostova</div>
                      <div className="text-[11px] text-slate-500">Managing Director, Global Mobility &amp; Immigration</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1 text-amber-400 text-xs">
                      {"★★★★★"}
                    </div>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed italic">
                      &ldquo;The zero-retention security model satisfied our corporate risk committee on day one. Candidate PII and payroll records process locally in the browser without leaving our perimeter.&rdquo;
                    </p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
                      MS
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Marcus Sterling</div>
                      <div className="text-[11px] text-slate-500">VP of Legal Operations &amp; Compliance</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1 text-amber-400 text-xs">
                      {"★★★★★"}
                    </div>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed italic">
                      &ldquo;Unlike generic PDF overlay software, SpaceFill compiles directly into the native AcroForm tree. Barcodes, federal agency seals, and attorney appearances stay 100% audit-compliant.&rdquo;
                    </p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center">
                      SL
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Sophia Lin, Esq.</div>
                      <div className="text-[11px] text-slate-500">Partner, Business Immigration Practice Group</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 3-CARD INTERACTIVE HIGHLIGHTS / HOW IT WORKS ── */}
        <div id="how-it-works" className="mt-20 pt-12 border-t border-slate-200">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              How SpaceFill Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Enterprise-grade document intelligence designed specifically for complex legal and government PDFs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-slate-200/80 shadow-xs hover-lift group">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm mb-4 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                1
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                Native AcroForm Ingestion
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Extracts complete PDF tree hierarchies, comb field boxes, radio groups, and geometric text captions with zero quality loss.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-slate-200/80 shadow-xs hover-lift group">
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-sm mb-4 group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white transition-all duration-300">
                2
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 group-hover:text-violet-600 transition-colors">
                Semantic &amp; Fuzzy Matching
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ingests resumes, Word .docx, CSV, and text notes. Accurately maps identities, employers, tax IDs, and addresses without hallucination.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-slate-200/80 shadow-xs hover-lift group">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm mb-4 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                3
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">
                Crisp Vector PDF Export
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Compiles directly into native AcroForm data objects. Original vector typography, barcodes, and government seals remain 100% sharp.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ SECTION with Smooth Transitions */}
        <div id="faq" className="mt-20 pt-12 border-t border-slate-200">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Details on field precision, document intake, and privacy architecture.
            </p>
          </div>

          {/* Accordion List */}
          <div className="max-w-3xl mx-auto space-y-3">
            {FAQ_DATA.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? "bg-white border-indigo-200 shadow-md shadow-indigo-500/5 ring-1 ring-indigo-500/10"
                      : "bg-white/90 border-slate-200 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className={`font-semibold text-xs sm:text-sm transition-colors ${isOpen ? "text-indigo-600" : "text-slate-900"}`}>
                      {faq.question}
                    </span>
                    <span
                      className={`text-xs text-slate-400 transition-transform duration-200 font-bold ${
                        isOpen ? "rotate-90 text-indigo-600" : ""
                      }`}
                    >
                      ▶
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 animate-fade-in-up">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* COMPREHENSIVE SAAS FOOTER (Dark Slate Theme - Matching Top Navbar) */}
      <footer className="border-t border-slate-800/80 bg-slate-950 pt-12 pb-8 px-4 sm:px-6 lg:px-8 mt-16 text-slate-400">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand & Mission */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-750 text-blue-400 flex items-center justify-center shadow-xs">
                <FileTextIcon size={16} />
              </div>
              <span className="font-bold text-base text-white">
                Space<span className="text-blue-500">Fill</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              High-precision document automation for official government, tax, and legal PDF forms. On-device parsing ensures 100% vector accuracy and complete data privacy.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-semibold pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>On-device engine ready</span>
            </div>
          </div>

          {/* Column 1: Product */}
          <div className="space-y-2.5 text-xs">
            <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Product</div>
            <ul className="space-y-1.5 text-slate-400">
              <li><a href="#how-it-works" className="hover:text-blue-400 transition-colors">AcroForm Engine</a></li>
              <li><a href="#how-it-works" className="hover:text-blue-400 transition-colors">Source Parser</a></li>
              <li><a href="#how-it-works" className="hover:text-blue-400 transition-colors">Vector PDF Export</a></li>
              <li><a href="#faq" className="hover:text-blue-400 transition-colors">Supported Inputs</a></li>
            </ul>
          </div>

          {/* Column 2: Supported Forms */}
          <div className="space-y-2.5 text-xs">
            <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Templates</div>
            <ul className="space-y-1.5 text-slate-400">
              <li><span className="hover:text-slate-200 transition-colors">USCIS I-129 / I-765</span></li>
              <li><span className="hover:text-slate-200 transition-colors">IRS Form W-9 / W-4</span></li>
              <li><span className="hover:text-slate-200 transition-colors">Employment Onboarding</span></li>
              <li><span className="hover:text-slate-200 transition-colors">Standard Legal Forms</span></li>
            </ul>
          </div>

          {/* Column 3: Trust & Privacy */}
          <div className="space-y-2.5 text-xs">
            <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Security</div>
            <ul className="space-y-1.5 text-slate-400">
              <li><Link href="/security" className="hover:text-blue-400 transition-colors">Zero-Retention Policy</Link></li>
              <li><Link href="/security" className="hover:text-blue-400 transition-colors">On-Device Parsing</Link></li>
              <li><Link href="/security" className="hover:text-blue-400 transition-colors">No Model Training</Link></li>
              <li><Link href="/security" className="hover:text-blue-400 transition-colors">Vector Integrity</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright */}
        <div className="max-w-7xl mx-auto pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} SpaceFill Form Studio. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-[11px]">
            <Link href="/about" className="hover:text-slate-300 transition-colors">About</Link>
            <span className="text-slate-700">·</span>
            <a href="#faq" className="hover:text-slate-300 transition-colors">FAQ</a>
            <span className="text-slate-700">·</span>
            <a href="#how-it-works" className="hover:text-slate-300 transition-colors">How It Works</a>
            <span className="text-slate-700">·</span>
            <Link href="/security" className="hover:text-slate-300 transition-colors">Security Architecture</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
