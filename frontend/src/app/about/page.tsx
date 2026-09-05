import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export const metadata = {
  title: "About Us — SpaceFill Form Studio",
  description: "Learn how SpaceFill automates complex official PDF forms from existing resumes and documents with vector accuracy.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Navbar Header */}
      <Navbar hasForm={false} />

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 flex-1 w-full space-y-16">
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span>ABOUT SPACEFILL STUDIO</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            Eliminating repetitive paperwork with precision document intelligence.
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            SpaceFill was created to transform hours of tedious, error-prone data entry into instant, vector-accurate PDF submissions. Built for legal professionals, HR teams, tax filers, and individuals.
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

        {/* Mission & The Problem */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600">The Problem</div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Standard PDF forms shouldn&apos;t take days of manual typing.
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Official USCIS petitions, IRS tax documents, and employment contracts often feature hundreds of isolated input boxes, comb-style digit slots, and checkboxes.
            </p>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Professionals spend countless hours manually re-typing information that already exists in resumes, corporate bios, and spreadsheets. One misplaced letter or formatted date can lead to rejected filings.
            </p>
          </div>

          <div className="p-7 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">Our Solution</div>
            <h3 className="text-lg font-bold text-slate-900">
              Deterministic Matching &amp; Native Object Injection
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              SpaceFill parses native AcroForm dictionaries directly. When you attach a resume or notes, our engine matches candidate data entities to form fields in seconds.
            </p>
            <div className="pt-2 grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">⚡ 0.8s Match Time</div>
                <p className="text-slate-500 text-[11px] mt-0.5">Populate 300+ fields in sub-second speed.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">🎯 100% Vector Quality</div>
                <p className="text-slate-500 text-[11px] mt-0.5">No screenshot flattening or blurry fonts.</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3-Step Pipeline */}
        <div className="space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h3 className="text-2xl font-bold text-slate-900">How SpaceFill Operates</h3>
            <p className="text-xs text-slate-500">
              An architectural look at our 3-stage document automation pipeline
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-xs">
                1
              </div>
              <h4 className="font-bold text-sm text-slate-900">AcroForm Hierarchy Parsing</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Reads internal PDF object trees to map field types (text boxes, comb digit matrices, radio buttons, and checkboxes) with normalized coordinate bounds.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-xs">
                2
              </div>
              <h4 className="font-bold text-sm text-slate-900">Multi-Source Entity Extraction</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Extracts structured candidate data from uploaded Resumes (PDF), Word (.docx), CSV tables, or raw bio notes with localized regex pattern matchers.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center text-xs">
                3
              </div>
              <h4 className="font-bold text-sm text-slate-900">Direct Vector PDF Export</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Updates AcroForm field values directly into the output document, guaranteeing pristine typography, barcodes, and legal compliance upon export.
              </p>
            </div>
          </div>
        </div>

        {/* Supported Standards */}
        <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Supported Official Form Categories</h3>
            <p className="text-xs text-slate-500 mt-1">Pre-calibrated and fully compatible across global industry standards</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900 text-sm">USCIS Petitions</div>
              <p className="text-slate-500 text-[11px] mt-1">I-129, I-765, I-485, N-400 Immigration Filings</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900 text-sm">IRS Tax Forms</div>
              <p className="text-slate-500 text-[11px] mt-1">Form W-9, W-4, 1099, 1040 Schedules</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900 text-sm">HR &amp; Onboarding</div>
              <p className="text-slate-500 text-[11px] mt-1">I-9 Verification, Direct Deposit, NDAs</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900 text-sm">Legal &amp; Real Estate</div>
              <p className="text-slate-500 text-[11px] mt-1">Commercial Leases, Disclosures, Power of Attorney</p>
            </div>
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white text-center space-y-4 shadow-lg">
          <h3 className="text-xl sm:text-2xl font-bold">Experience the future of form filling</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Upload your PDF form to see deterministic field mapping in action.
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
        © {new Date().getFullYear()} SpaceFill Form Studio. All rights reserved.
      </footer>
    </div>
  );
}
