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
} from "./Icons";

interface Props {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  error?: string;
  onClearError?: () => void;
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
}: Props) {
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
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-semibold shadow-xs transition-transform duration-200 hover:scale-[1.02]">
              <span className="w-4 h-4 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[10px]">
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
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-2xs text-slate-700 font-semibold text-xs w-fit transition-all duration-300 hover:border-blue-300 hover:shadow-sm hover:scale-[1.02]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              <FileTextIcon size={13} className="text-blue-600" />
              <span>Document Automation Studio</span>
            </div>

            {/* Main Headline (Blue Heading) */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-blue-600 leading-[1.15] transition-all">
              Automate complex PDF forms <br />
              <span className="text-blue-500 hover:text-blue-600 transition-colors">from your existing documents.</span>
            </h1>

            {/* Subtitle (Natural Slate Body) */}
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
              Upload official government, legal, or tax forms. <span className="text-slate-900 font-semibold">SpaceFill</span> extracts candidate data from your resumes or notes and populates every field with vector accuracy.
            </p>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-slate-600 pt-1">
              <div className="flex items-center gap-1.5 bg-white/70 px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-2xs transition-all hover:bg-white hover:shadow-xs">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>Accurate Field Mapping</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/70 px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-2xs transition-all hover:bg-white hover:shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>Zero Cloud Retention</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/70 px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-2xs transition-all hover:bg-white hover:shadow-xs">
                <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                <span>Vector PDF Export</span>
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

            {/* Upload Dropzone Card with Enhanced Hover Transitions & Glow */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative group rounded-2xl border-2 border-dashed transition-all duration-300 p-8 sm:p-9 text-center cursor-pointer bg-white/90 backdrop-blur-sm shadow-sm ${
                isDragging
                  ? "border-blue-500 bg-blue-50/60 scale-[1.02] shadow-xl shadow-blue-500/15 ring-4 ring-blue-500/10"
                  : "border-slate-300 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/8 hover:-translate-y-1"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onFileSelected(e.target.files[0]);
                  }
                }}
              />

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-6 space-y-3">
                  <div className="relative">
                    <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 w-10 h-10 border-3 border-transparent border-b-indigo-500 rounded-full animate-spin animation-delay-2000"></div>
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
                  <div className="w-13 h-13 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white group-hover:scale-110 group-hover:rotate-1 transition-all duration-300 shadow-xs">
                    <UploadIcon size={24} className="transition-transform duration-300 group-hover:-translate-y-0.5" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-900">
                      <span className="text-blue-600 group-hover:underline">
                        Select a fillable PDF form
                      </span>{" "}
                      or drag and drop
                    </div>
                    <p className="text-xs text-slate-500">
                      Supports standard AcroForm documents (Tax, Legal, USCIS, Employment)
                    </p>
                  </div>
                  <div className="pt-1 flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                      PDF AcroForms
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Max file size: 50MB
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Animated Document Preview Card with Floating Badges & Laser Beam */}
          <div className="lg:col-span-5 flex flex-col items-center relative animate-fade-in-up">
            {/* Floating Highlight Badges */}
            <div className="absolute -top-3 -right-3 z-30 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 shadow-md text-[11px] font-bold text-slate-700 animate-float">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
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
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200 shadow-2xs">
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
                          ? "bg-white border border-blue-400 text-slate-900 font-medium shadow-xs ring-2 ring-blue-500/10"
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
                          ? "bg-white border border-blue-400 text-slate-900 font-medium shadow-xs ring-2 ring-blue-500/10"
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
                        ? "bg-white border border-blue-400 text-slate-900 font-medium shadow-xs ring-2 ring-blue-500/10"
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
                        ? "bg-white border border-blue-400 text-slate-900 font-medium shadow-xs ring-2 ring-blue-500/10"
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
                          ? "bg-white border border-blue-400 text-slate-900 font-medium shadow-xs ring-2 ring-blue-500/10"
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
                          ? "bg-white border border-blue-400 text-slate-900 font-medium shadow-xs ring-2 ring-blue-500/10"
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
                      ? "bg-blue-600 text-white scale-[1.01] shadow-md shadow-blue-500/20"
                      : "bg-slate-900 text-white"
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

        {/* ── 3-CARD INTERACTIVE HIGHLIGHTS / HOW IT WORKS ── */}
        <div id="how-it-works" className="mt-20 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-slate-200/80 shadow-xs hover-lift group">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mb-4 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                1
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                Native AcroForm Ingestion
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Extracts complete PDF tree hierarchies, comb field boxes, radio groups, and geometric text captions with zero quality loss.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-slate-200/80 shadow-xs hover-lift group">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm mb-4 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                2
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
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
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-blue-600">
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
                      ? "bg-white border-blue-200 shadow-md shadow-blue-500/5 ring-1 ring-blue-500/10"
                      : "bg-white/90 border-slate-200 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className={`font-semibold text-xs sm:text-sm transition-colors ${isOpen ? "text-blue-600" : "text-slate-900"}`}>
                      {faq.question}
                    </span>
                    <span
                      className={`text-xs text-slate-400 transition-transform duration-200 font-bold ${
                        isOpen ? "rotate-90 text-blue-600" : ""
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
