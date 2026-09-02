"use client";

import React, { useRef, useState } from "react";
import {
  UploadIcon,
  SparklesIcon,
  FileTextIcon,
  ArrowRightIcon,
  AlertCircleIcon,
} from "./Icons";

interface Props {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  error?: string;
  onClearError?: () => void;
}

export function HeroUpload({ onFileSelected, isLoading, error, onClearError }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  return (
    <div className="min-h-[calc(100vh-65px)] bg-gradient-to-b from-slate-50 via-white to-slate-100/70 text-slate-800 flex flex-col justify-between">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Step Indicator Banner */}
        <div className="flex items-center justify-center mb-10">
          <div className="inline-flex items-center gap-3 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600 text-white shadow-sm">
              <span className="w-5 h-5 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold text-[11px]">
                1
              </span>
              <span>Upload PDF Form</span>
            </div>
            <ArrowRightIcon size={14} className="text-slate-300" />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-400">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[11px]">
                2
              </span>
              <span>Attach Source Data</span>
            </div>
            <ArrowRightIcon size={14} className="text-slate-300" />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-400">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[11px]">
                3
              </span>
              <span>Download Filled PDF</span>
            </div>
          </div>
        </div>

        {/* Hero Section: 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headline & Action Dropzone */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 font-semibold text-xs w-fit shadow-sm">
              <SparklesIcon size={14} className="text-blue-600" />
              <span>Next-Generation AI Form Auto-Fill</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
              AI Form Filler. <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
                Save hours of manual work.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              Upload any fillable PDF form. Provide your resume, letters, or notes.
              SpaceFill maps the fields and populates your document with 100% precision.
            </p>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-500">⚡</span> 10x Faster Filling
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-blue-500">🎯</span> 99.4% Accuracy
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-500">🔒</span> Zero Data Retention
              </div>
            </div>

            {/* Error banner if any */}
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start justify-between gap-3 shadow-sm animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircleIcon size={16} className="text-red-500 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                {onClearError && (
                  <button onClick={onClearError} className="font-bold hover:text-red-900 cursor-pointer">
                    ✕
                  </button>
                )}
              </div>
            )}

            {/* Upload Dropzone Card */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative group rounded-2xl border-2 border-dashed transition-all p-8 sm:p-10 text-center cursor-pointer bg-white shadow-lg ${
                isDragging
                  ? "border-blue-500 bg-blue-50/50 scale-[1.01] shadow-blue-500/10"
                  : "border-slate-300 hover:border-blue-500 hover:shadow-xl hover:shadow-slate-200/50"
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
                  <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-sm font-bold text-slate-800">
                    Parsing Form & Extracting AcroForm Fields…
                  </div>
                  <div className="text-xs text-slate-500">
                    Rendering high-resolution canvas overlays…
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 text-blue-600 flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-200">
                    <UploadIcon size={30} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-base font-bold text-slate-900">
                      <span className="text-blue-600 underline underline-offset-2">
                        Select a fillable PDF form
                      </span>{" "}
                      or drag and drop
                    </div>
                    <p className="text-xs text-slate-500">
                      Supports any standard AcroForm PDF (Tax, Legal, USCIS, Employment)
                    </p>
                  </div>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                      <FileTextIcon size={12} />
                      Maximum file size: 50MB
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Form Interactive Preview Card */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full bg-white rounded-2xl p-5 shadow-2xl border border-slate-200/80 relative overflow-hidden group">
              {/* Header inside card */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 text-xs font-semibold text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span className="ml-2 font-mono text-[11px] text-slate-700 font-bold">
                    i-129_form.pdf (38 pages)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">
                  927 Fillable Fields
                </span>
              </div>

              {/* Simulated Form Canvas Preview with Typeable Boxes */}
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-xs text-slate-700">
                <div className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2 flex items-center justify-between">
                  <span>Part 1. Petitioner Information</span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                    ✓ Auto-Matched
                  </span>
                </div>

                {/* Form fields simulated */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                      Given Name (First Name)
                    </label>
                    <div className="p-2 bg-blue-50 border-l-3 border-blue-600 text-blue-900 font-medium rounded text-xs">
                      Aswathi
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                      Family Name (Last Name)
                    </label>
                    <div className="p-2 bg-blue-50 border-l-3 border-blue-600 text-blue-900 font-medium rounded text-xs">
                      Kumar
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                    Contact Email Address
                  </label>
                  <div className="p-2 bg-blue-50 border-l-3 border-blue-600 text-blue-900 font-medium rounded text-xs">
                    aswathisajik1@gmail.com
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                      City / Town
                    </label>
                    <div className="p-2 bg-blue-50 border-l-3 border-blue-600 text-blue-900 font-medium rounded text-xs">
                      Kottayam
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                      State / Province
                    </label>
                    <div className="p-2 bg-blue-50 border-l-3 border-blue-600 text-blue-900 font-medium rounded text-xs">
                      Kerala
                    </div>
                  </div>
                </div>

                {/* Fill Badge banner */}
                <div className="mt-4 p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <SparklesIcon size={16} />
                    <span>318 Fields Populated in 1.4s</span>
                  </div>
                  <span className="text-[10px] font-extrabold bg-white/20 px-2 py-0.5 rounded-full">
                    Ready to Export
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature / How It Works Strip */}
      <footer id="how-it-works" className="border-t border-slate-200 bg-white/80 py-8 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold">
              1
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">Instant PDF AcroForm Parser</h4>
              <p className="text-xs text-slate-500 mt-1">
                Reads all AcroForm text boxes, checkboxes, radio groups, and comb inputs without degrading PDF vectors.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 font-bold">
              2
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">Multi-Format Source Reader</h4>
              <p className="text-xs text-slate-500 mt-1">
                Extracts data from Resumes, Word (.docx), CSV, or raw pasted notes with automated entity detection.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 font-bold">
              3
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">Pixel-Perfect Export</h4>
              <p className="text-xs text-slate-500 mt-1">
                Writes data directly into original PDF AcroForm objects. Download clean, standard PDF files ready to file.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
