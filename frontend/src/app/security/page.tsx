import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export const metadata = {
  title: "Security & Privacy Architecture — SpaceFill",
  description: "Learn about SpaceFill's on-device zero-retention privacy architecture and vector compliance standards.",
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Navbar Header */}
      <Navbar hasForm={false} />

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 flex-1 w-full space-y-14">
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>ENTERPRISE SECURITY &amp; PRIVACY</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            Built with zero-retention privacy by design.
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Your forms, resumes, and personal records are processed locally in your session. No remote database storage, no tracking, and zero model training.
          </p>

          <div className="pt-2 flex items-center justify-center gap-4">
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-sm inline-flex items-center gap-2"
            >
              <span>← Return to Form Studio</span>
            </Link>
          </div>
        </div>

        {/* 4 Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pillar 1 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg border border-emerald-100">
              🔒
            </div>
            <h3 className="font-bold text-base text-slate-900">On-Device Local Processing</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Form parsing, field coordinate calculations, and PDF object compilation run locally on your device. Your sensitive PDFs are never uploaded to persistent cloud storage buffers.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100">
              🚫
            </div>
            <h3 className="font-bold text-base text-slate-900">Zero AI Model Training</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              We never use your resumes, biographical notes, tax filings, or completed submissions to train, fine-tune, or evaluate external AI models. Your proprietary data stays entirely yours.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg border border-indigo-100">
              🎯
            </div>
            <h3 className="font-bold text-base text-slate-900">Vector-Accurate PDF Injection</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Rather than converting pages into unencrypted flat images, SpaceFill directly modifies the PDF’s internal AcroForm objects. Original fonts, barcodes, and digital seals remain 100% compliant.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg border border-amber-100">
              🛡️
            </div>
            <h3 className="font-bold text-base text-slate-900">Session File Isolation</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Every form session is isolated in temporary memory. You can wipe all uploaded sources and session memory with a single click at any time.
            </p>
          </div>
        </div>

        {/* Security Matrix Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm sm:text-base">Security &amp; Data Handling Matrix</h3>
              <p className="text-xs text-slate-400">Technical overview of how data moves through SpaceFill</p>
            </div>
            <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-2.5 py-0.5 rounded-full">
              Verified
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs sm:text-sm">
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-semibold text-slate-900">PDF Form Field Extraction</span>
              <span className="text-slate-600">Local pypdf &amp; pdfplumber engine on localhost</span>
            </div>

            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-semibold text-slate-900">Source Document Parsing (Word / PDF)</span>
              <span className="text-slate-600">Extracted strictly in-memory during active session</span>
            </div>

            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-semibold text-slate-900">Entity Matching Logic</span>
              <span className="text-slate-600">Deterministic local regex &amp; keyword entity matcher</span>
            </div>

            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-semibold text-slate-900">Output PDF Generation</span>
              <span className="text-slate-600">Native AcroForm update with zero vector compression loss</span>
            </div>

            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-semibold text-slate-900">Remote Database Retention</span>
              <span className="font-bold text-emerald-600">None (0 bytes retained in external databases)</span>
            </div>
          </div>
        </div>

        {/* CTA Bottom Banner */}
        <div className="p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white text-center space-y-4 shadow-lg">
          <h3 className="text-xl sm:text-2xl font-bold">Ready to automate your forms securely?</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Upload your standard AcroForm PDF and start filling fields in seconds with complete peace of mind.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-sm inline-flex items-center gap-2"
            >
              <span>Launch Form Studio →</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} SpaceFill Form Studio. All rights reserved. Built with privacy-first architecture.
      </footer>
    </div>
  );
}
