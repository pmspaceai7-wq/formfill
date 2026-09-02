"use client";

import React, { useState } from "react";
import { SparklesIcon, ShieldCheckIcon, ZapIcon, FileTextIcon } from "./Icons";

interface Props {
  hasForm: boolean;
  onReset?: () => void;
}

export function Navbar({ hasForm, onReset }: Props) {
  const [showAuthModal, setShowAuthModal] = useState(false);
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
                  InstaFill<span className="text-blue-600">.ai</span>
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  v0 Pro
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium -mt-0.5 hidden sm:inline">
                Intelligent AI Form Automation
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
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Zero Data Retention
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
            onClick={() => setShowAuthModal(true)}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm shadow-blue-600/25 hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ZapIcon size={14} />
            Try Free
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
              Enterprise-Grade Privacy & Security
            </h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              InstaFill processes your PDF forms and source documents entirely in your session.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">✓</span> No user data is ever used to train AI models.
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">✓</span> Local-first processing with zero external data sharing.
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">✓</span> Instant document deletion on session reset.
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

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <SparklesIcon size={16} />
                </div>
                <span className="font-bold text-slate-900 text-base">InstaFill AI</span>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="text-center mt-4">
              <h4 className="text-base font-bold text-slate-900">Free Instant Access</h4>
              <p className="text-xs text-slate-500 mt-1">No credit card or login required for v0 Demo.</p>
            </div>
            <div className="mt-5 space-y-2.5">
              <button
                onClick={() => setShowAuthModal(false)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white font-medium text-xs text-slate-700 shadow-sm flex items-center justify-center gap-2 transition-all hover:bg-slate-50 cursor-pointer"
              >
                <span className="font-bold text-blue-600">G</span> Continue with Google
              </button>
              <button
                onClick={() => setShowAuthModal(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Start Instant Filling
              </button>
            </div>
            <p className="text-[11px] text-center text-slate-400 mt-4">
              By using InstaFill, you agree to our Terms and Privacy Policy.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
