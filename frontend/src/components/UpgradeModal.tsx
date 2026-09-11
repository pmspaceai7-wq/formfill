"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { simulateUpgrade } from "@/lib/api";
import {
  ZapIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  AlertCircleIcon,
  ArrowRightIcon,
} from "./Icons";

interface Props {
  open: boolean;
  onClose: () => void;
  onUpgradeSuccess?: () => void;
}

export function UpgradeModal({ open, onClose, onUpgradeSuccess }: Props) {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!open) return null;

  const handleSimulate = async (isSubscribed: boolean, resetCount: boolean) => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await simulateUpgrade(isSubscribed, resetCount);
      await refreshUser();
      setSuccess(
        isSubscribed
          ? "🎉 Business Pro plan activated! You now have unlimited form fills."
          : "🔄 Free fill reset to 0/1 for testing."
      );
      setTimeout(() => {
        onClose();
        if (onUpgradeSuccess) onUpgradeSuccess();
      }, 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-800 text-slate-200 relative max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-950/80 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
              <ZapIcon size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Free Form Limit Reached
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700/50 uppercase tracking-wider">
                  1 of 1 Used
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {user ? (
                  <span>
                    Account <strong className="text-slate-300">{user.email}</strong> has used its 1 free form fill.
                  </span>
                ) : (
                  "Upgrade your business account to continue filling forms."
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-base font-bold cursor-pointer p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
            <AlertCircleIcon size={16} className="text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircleIcon size={16} className="text-emerald-400 shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {/* Plan 1: Single Pass */}
          <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/70 flex flex-col justify-between hover:border-slate-600 transition-all">
            <div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Single Form Pass
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-700 text-slate-300">
                  Pay as you go
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">$4.99</span>
                <span className="text-xs text-slate-400">/ form</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Perfect if you only need to fill an occasional legal petition or tax document.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300 pt-3 border-t border-slate-700/60">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> 1 High-volume AcroForm fill
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Multi-source document reader
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Vector-accurate PDF download
                </li>
              </ul>
            </div>

            <button
              disabled={loading}
              onClick={() => handleSimulate(true, false)}
              className="mt-6 w-full py-2.5 px-4 rounded-xl border border-slate-600 hover:border-slate-500 bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              Select Single Pass ($4.99)
            </button>
          </div>

          {/* Plan 2: Business Pro (Highlighted) */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-blue-950/40 to-slate-900 border-2 border-blue-500/60 flex flex-col justify-between shadow-lg shadow-blue-950/30 relative">
            <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider shadow-sm">
              Most Popular
            </div>

            <div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  Business Pro
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900/60 text-blue-300 border border-blue-700/50">
                  Unlimited
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">$29</span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                For legal, immigration, HR, and accounting teams managing continuous client filings.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300 pt-3 border-t border-slate-700/60">
                <li className="flex items-center gap-2 font-medium text-white">
                  <span className="text-blue-400">✓</span> Unlimited Form Auto-Fills
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-400">✓</span> Fast local + AI extraction
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-400">✓</span> Persistent client profile memory
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-400">✓</span> USCIS &amp; IRS pre-calibrated catalog
                </li>
              </ul>
            </div>

            <button
              disabled={loading}
              onClick={() => handleSimulate(true, false)}
              className="mt-6 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.02] disabled:opacity-50"
            >
              <span>{loading ? "Activating..." : "Upgrade to Pro ($29/mo)"}</span>
              <ArrowRightIcon size={14} />
            </button>
          </div>
        </div>

        {/* Testing Controls Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <ShieldCheckIcon size={14} className="text-emerald-400 shrink-0" />
            <span>Development Testing Mode Active</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={loading}
              onClick={() => handleSimulate(false, true)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition-colors cursor-pointer"
              title="Reset forms_filled_count to 0 so you can test the 1-free-fill limit again"
            >
              ↺ Reset to 0 Fills
            </button>

            <button
              disabled={loading}
              onClick={() => handleSimulate(true, false)}
              className="px-3.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/40 transition-colors cursor-pointer"
            >
              ⚡ Simulate Pro Upgrade
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
