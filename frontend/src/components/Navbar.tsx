"use client";

import React, { useState } from "react";
import { SparklesIcon, ShieldCheckIcon, FileTextIcon, UserIcon } from "./Icons";

interface Props {
  hasForm: boolean;
  onReset?: () => void;
  onOpenProfile?: () => void;
  factCount?: number;
}

export function Navbar({ hasForm, onReset, onOpenProfile, factCount = 0 }: Props) {
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  return (
    <>
      <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 px-4 lg:px-8 py-3 flex items-center justify-between transition-all">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <div
            onClick={onReset}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <SparklesIcon size={20} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
                  Space<span className="text-blue-600">Fill</span>
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  v0 Pro
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium -mt-0.5 hidden sm:inline">
                Local Form Automation
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-200 text-sm font-medium text-slate-600">
            <button
              onClick={onReset}
              className="px-3 py-1.5 rounded-lg hover:text-blue-600 hover:bg-slate-50 transition-colors"
            >
              Studio
            </button>
            <button
              onClick={() => setShowSecurityModal(true)}
              className="px-3 py-1.5 rounded-lg hover:text-blue-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <ShieldCheckIcon size={15} className="text-emerald-600" />
              Privacy & Security
            </button>
            <a
              href="#how-it-works"
              className="px-3 py-1.5 rounded-lg hover:text-blue-600 hover:bg-slate-50 transition-colors"
            >
              How it works
            </a>
          </nav>
        </div>

        {/* Right side CTAs */}
        <div className="flex items-center gap-3">
          <div
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
            title="Forms and documents are processed on this machine. Nothing is sent to an external service."
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Runs Locally
          </div>

          {hasForm && onReset && (
            <button
              onClick={onReset}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileTextIcon size={14} />
              New Form
            </button>
          )}

          <button
            onClick={onOpenProfile}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm shadow-blue-600/25 hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            title="View and edit the details remembered for you"
          >
            <UserIcon size={14} />
            <span>Your Profile</span>
            {factCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-white/25 text-[10px] font-extrabold leading-none">
                {factCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Security Modal */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <ShieldCheckIcon size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Privacy &amp; Security
            </h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Forms and source documents are processed on this machine. No API key is
              needed and nothing is sent to an external service.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold mt-px">✓</span>
                <span>Matching runs on-device — no data leaves your computer.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold mt-px">✓</span>
                <span>Your data is never used to train any model.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold mt-px">!</span>
                <span>
                  Details you upload are <b>saved to this machine</b> so future forms
                  fill automatically. Open <b>Your Profile</b> to review, edit, or
                  delete them at any time.
                </span>
              </li>
            </ul>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSecurityModal(false)}
                className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
