"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  FileTextIcon,
  ShieldCheckIcon,
  ZapIcon,
  AlertCircleIcon,
  EyeIcon,
  EyeOffIcon,
} from "./Icons";
import { TemplatesModal } from "./TemplatesModal";
import { useAuth } from "@/lib/AuthContext";

interface Props {
  hasForm: boolean;
  onReset?: () => void;
  onOpenProfile?: () => void;
  factCount?: number;
  onLoadDemo?: () => Promise<void>;
  onLoadTemplate?: (templateId: string) => Promise<void>;
  loadingDemo?: boolean;
  loadingTemplateId?: string | null;
}

interface ServiceItem {
  title: string;
  desc: string;
  category: string;
}

const SERVICES_LIST: { col1: ServiceItem[]; col2: ServiceItem[] } = {
  col1: [
    {
      category: "Form Processing",
      title: "Automated Field Population",
      desc: "Accurately maps and populates text boxes, comb digits, and checkboxes in seconds.",
    },
    {
      category: "Data Ingestion",
      title: "Multi-Format Source Reader",
      desc: "Extracts structured information from resumes (PDF), Word (.docx), CSV, and text notes.",
    },
    {
      category: "Memory Store",
      title: "Encrypted Session Memory",
      desc: "Remembers verified personal and business details for instant form completion.",
    },
  ],
  col2: [
    {
      category: "Output & Export",
      title: "Vector-Accurate PDF Export",
      desc: "Directly modifies native AcroForm objects to preserve original typography, seals, and barcodes.",
    },
    {
      category: "Security",
      title: "On-Device Data Processing",
      desc: "Zero-retention architecture ensures documents and personal data remain private on your device.",
    },
    {
      category: "Templates",
      title: "Official Compliance Templates",
      desc: "Calibrated field matching for standard USCIS, IRS tax filings, and employment onboarding.",
    },
  ],
};

export function Navbar({
  hasForm,
  onReset,
  onOpenProfile,
  factCount,
  onLoadDemo,
  onLoadTemplate,
  loadingDemo,
  loadingTemplateId,
}: Props) {
  const { user, login, register, logout } = useAuth();

  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign Up Form State
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpCountry, setSignUpCountry] = useState("");
  const [signUpPhone, setSignUpPhone] = useState("");
  const [signUpCompany, setSignUpCompany] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signUpError, setSignUpError] = useState("");

  // Hover Dropdown State for Services
  const [servicesOpen, setServicesOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setServicesOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setServicesOpen(false);
    }, 180);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      await login(loginEmail, loginPassword);
      setShowLoginModal(false);
      setLoginEmail("");
      setLoginPassword("");
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError("");
    setSignUpLoading(true);
    try {
      await register({
        name: signUpName,
        email: signUpEmail,
        password: signUpPassword,
        country: signUpCountry,
        phone: signUpPhone,
        company: signUpCompany,
      });
      setShowSignUpModal(false);
      setSignUpName("");
      setSignUpEmail("");
      setSignUpPassword("");
      setSignUpCountry("");
      setSignUpPhone("");
      setSignUpCompany("");
    } catch (err: unknown) {
      setSignUpError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSignUpLoading(false);
    }
  };

  return (
    <>
      <header className="w-full bg-slate-950 border-b border-slate-800/80 sticky top-0 z-50 px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between transition-all shadow-md shadow-black/20">
        {/* Left: Brand */}
        <Link href="/" className="flex items-center gap-3 cursor-pointer group flex-shrink-0" onClick={onReset}>
          <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-slate-200 group-hover:border-blue-500/50 group-hover:text-white transition-all shadow-xs flex-shrink-0">
            <FileTextIcon size={18} className="text-blue-400" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white group-hover:text-blue-300 transition-colors">
                Space<span className="text-blue-500">Fill</span>
              </span>
              <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-md bg-blue-950/80 text-blue-300 border border-blue-800/60">
                Form Studio
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-normal -mt-0.5 hidden sm:inline">
              Document &amp; Form Automation
            </span>
          </div>
        </Link>

        {/* Center: Clean Spacious Navigation */}
        <nav className="hidden md:flex items-center justify-center flex-1 max-w-2xl mx-6 lg:mx-10 gap-1 lg:gap-2.5 xl:gap-4 text-sm font-medium text-slate-300">
          <Link
            href="/"
            onClick={onReset}
            className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
          >
            Home
          </Link>

          <Link
            href="/about"
            className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
          >
            About
          </Link>

          {/* Services Hover Dropdown */}
          <div
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              onClick={() => setServicesOpen(!servicesOpen)}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                servicesOpen
                  ? "text-white bg-slate-900"
                  : "hover:text-white hover:bg-slate-900 text-slate-300"
              }`}
            >
              <span>Services</span>
              <span
                className={`text-[9px] text-slate-400 transition-transform duration-200 ${
                  servicesOpen ? "rotate-180" : ""
                }`}
              >
                ▼
              </span>
            </button>

            {/* Dropdown Menu */}
            {servicesOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[580px] bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 p-5 z-50 text-slate-200 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Core Capabilities &amp; Workflows
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Enterprise Precision
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Column 1 */}
                  <div className="space-y-3">
                    {SERVICES_LIST.col1.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setServicesOpen(false);
                          if (onReset) onReset();
                        }}
                        className="p-2.5 rounded-xl hover:bg-slate-800/80 transition-all cursor-pointer group"
                      >
                        <div className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                          {item.category}
                        </div>
                        <div className="text-xs font-semibold text-white group-hover:text-blue-300 transition-colors mt-0.5">
                          {item.title}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                          {item.desc}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Column 2 */}
                  <div className="space-y-3">
                    {SERVICES_LIST.col2.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setServicesOpen(false);
                          if (item.title.includes("Security")) setShowSecurityModal(true);
                          else if (item.title.includes("Template")) setShowTemplatesModal(true);
                          else if (onReset) onReset();
                        }}
                        className="p-2.5 rounded-xl hover:bg-slate-800/80 transition-all cursor-pointer group"
                      >
                        <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                          {item.category}
                        </div>
                        <div className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors mt-0.5">
                          {item.title}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                          {item.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Looking for custom integrations?</span>
                  <button
                    onClick={() => {
                      setServicesOpen(false);
                      setShowContactModal(true);
                    }}
                    className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                  >
                    Contact Team →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Templates Tab */}
          <button
            onClick={() => setShowTemplatesModal(true)}
            className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
          >
            Templates
          </button>

          <button
            onClick={() => setShowPricingModal(true)}
            className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
          >
            Pricing
          </button>

          <Link
            href="/security"
            className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-900 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldCheckIcon size={14} className="text-slate-400" />
            <span>Security</span>
          </Link>

          <a
            href="#faq"
            className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
          >
            FAQ
          </a>

          <button
            onClick={() => setShowContactModal(true)}
            className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
          >
            Contact
          </button>
        </nav>

        {/* Right side CTAs: Try Demo, Sign in & Get Started */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {onLoadDemo && !hasForm && (
            <button
              onClick={onLoadDemo}
              disabled={loadingDemo}
              className="hidden sm:flex px-3 py-1.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-950/70 hover:bg-amber-900/70 border border-amber-600/60 transition-all items-center gap-1.5 cursor-pointer shadow-xs hover:scale-[1.02] disabled:opacity-50"
            >
              <ZapIcon size={12} className="text-amber-400" />
              <span>{loadingDemo ? "Loading Demo…" : "⚡ Try Demo"}</span>
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 shadow-xs">
                <div className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center font-bold text-[10px]">
                  {user.name ? user.name.trim()[0].toUpperCase() : "U"}
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-white leading-none truncate max-w-[130px]" title={user.name}>
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight truncate max-w-[130px]" title={user.email}>
                    {user.email}
                  </span>
                </div>
              </div>

              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheckIcon size={13} className="text-emerald-400" />
                  <span>Admin</span>
                </Link>
              )}

              {hasForm && onReset && (
                <button
                  onClick={onReset}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileTextIcon size={13} className="text-blue-400" />
                  <span>New Form</span>
                </button>
              )}

              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-slate-900 border border-slate-800 hover:border-red-900/50 transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </div>
          ) : (
            <>
              {hasForm && onReset && (
                <button
                  onClick={onReset}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileTextIcon size={13} className="text-blue-400" />
                  <span>New Form</span>
                </button>
              )}

              <button
                onClick={() => setShowLoginModal(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
              >
                Sign in
              </button>

              <button
                onClick={() => setShowSignUpModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
              >
                <span>Create Account</span>
                <span className="text-xs">→</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Templates Hub Modal */}
      <TemplatesModal
        open={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        onLoadDemo={async () => {
          setShowTemplatesModal(false);
          if (onLoadDemo) await onLoadDemo();
        }}
        onLoadTemplate={async (id) => {
          setShowTemplatesModal(false);
          if (onLoadTemplate) await onLoadTemplate(id);
        }}
        loadingDemo={loadingDemo}
        loadingTemplateId={loadingTemplateId}
      />

      {/* 1. Templates Modal */}
      {showTemplatesModal && (
        <div
          onClick={() => setShowTemplatesModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-800 text-slate-200"
          >
            <div className="flex items-start justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Supported Form Templates</h3>
                <p className="text-xs text-slate-400">Pre-calibrated AcroForm layouts ready for instant auto-filling</p>
              </div>
              <button
                onClick={() => setShowTemplatesModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/80">
                <div className="font-bold text-white">USCIS Immigration Forms</div>
                <p className="text-slate-400 text-[11px] mt-0.5">I-129, I-765, I-485, N-400 Petition Petitions</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/80">
                <div className="font-bold text-white">IRS Tax Documents</div>
                <p className="text-slate-400 text-[11px] mt-0.5">Form W-9, W-4, 1099, 1040 Schedules</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/80">
                <div className="font-bold text-white">HR &amp; Employment Onboarding</div>
                <p className="text-slate-400 text-[11px] mt-0.5">I-9 Verification, Direct Deposit, NDA filings</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/80">
                <div className="font-bold text-white">Legal &amp; Real Estate</div>
                <p className="text-slate-400 text-[11px] mt-0.5">Standard Leases, Disclosures, Power of Attorney</p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowTemplatesModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. About Modal */}
      {showAboutModal && (
        <div
          onClick={() => setShowAboutModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-800 text-slate-200"
          >
            <div className="flex items-start justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-950 text-blue-400 border border-blue-800/60 flex items-center justify-center">
                  <FileTextIcon size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">About SpaceFill</h3>
                  <p className="text-xs text-slate-400">Intelligent PDF Document Automation</p>
                </div>
              </div>
              <button
                onClick={() => setShowAboutModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
              <p>
                SpaceFill is built to streamline document completion for individuals, legal professionals, and HR teams handling high-volume standard PDF forms.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="font-semibold text-white text-xs">Vector Accuracy</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Directly updates AcroForm fields while preserving all original fonts, alignments, and official stamps.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="font-semibold text-white text-xs">Private by Design</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Documents are processed on your device. Personal data is never stored on third-party servers.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowAboutModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Pricing Modal */}
      {showPricingModal && (
        <div
          onClick={() => setShowPricingModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-800 text-slate-200"
          >
            <div className="flex items-start justify-between pb-4 border-b border-slate-800 mb-5">
              <div>
                <h3 className="text-lg font-bold text-white">Simple Pricing</h3>
                <p className="text-xs text-slate-400 mt-0.5">Transparent access for individual and team workflows</p>
              </div>
              <button
                onClick={() => setShowPricingModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Free Edition</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800/50">Active</span>
                </div>
                <div className="text-2xl font-bold text-white">$0 <span className="text-xs font-normal text-slate-400">/ forever</span></div>
                <ul className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-700/60">
                  <li className="flex items-center gap-2">✓ Unlimited Form Auto-Filling</li>
                  <li className="flex items-center gap-2">✓ Resume &amp; Document Extraction</li>
                  <li className="flex items-center gap-2">✓ High-Resolution PDF Exports</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Team &amp; API</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300">Custom</span>
                </div>
                <div className="text-2xl font-bold text-white">Custom <span className="text-xs font-normal text-slate-400">/ team</span></div>
                <ul className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-700/60">
                  <li className="flex items-center gap-2">✓ High-Throughput Batch API</li>
                  <li className="flex items-center gap-2">✓ Team Workspace Integration</li>
                  <li className="flex items-center gap-2">✓ Dedicated Support &amp; SLA</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowPricingModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Security Modal */}
      {showSecurityModal && (
        <div
          onClick={() => setShowSecurityModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800 text-slate-200"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center justify-center mb-4">
              <ShieldCheckIcon size={22} />
            </div>
            <h3 className="text-base font-bold text-white">Privacy &amp; Data Security</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Forms and source documents are processed on this device. No data is transmitted to external servers or used to train third-party models.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>On-device parsing and field mapping.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>No cloud tracking or persistent remote storage.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Complete control over session data.</span>
              </li>
            </ul>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSecurityModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Contact Modal */}
      {showContactModal && (
        <div
          onClick={() => setShowContactModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800 text-slate-200"
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Get in Touch</h3>
                <p className="text-xs text-slate-400">Questions or custom workflow requirements</p>
              </div>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Work Email</label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Message</label>
                <textarea
                  rows={3}
                  placeholder="Describe your document workflow..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <button
                onClick={() => {
                  alert("Thank you! We have received your inquiry.");
                  setShowContactModal(false);
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors cursor-pointer"
              >
                Send Inquiry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Login Modal */}
      {showLoginModal && (
        <div
          onClick={() => setShowLoginModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-800 text-slate-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-800 text-blue-400 flex items-center justify-center">
                  <FileTextIcon size={15} />
                </div>
                <span className="font-bold text-white text-sm">SpaceFill</span>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="text-center mt-4">
              <h4 className="text-sm font-bold text-white">Sign In to SpaceFill</h4>
              <p className="text-xs text-slate-400 mt-1">Access your saved templates &amp; history</p>
            </div>

            {loginError && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                <AlertCircleIcon size={14} className="text-red-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Email Address</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Password</label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-3 py-2 pr-9 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    aria-label={showLoginPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showLoginPassword ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors cursor-pointer shadow-sm text-xs mt-1"
              >
                {loginLoading ? "Signing in..." : "Sign In →"}
              </button>
            </form>

            <div className="text-center pt-3 text-slate-400 text-[11px]">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setShowLoginModal(false);
                  setShowSignUpModal(true);
                }}
                className="text-blue-400 hover:underline font-semibold cursor-pointer"
              >
                Create an account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Sign Up Modal */}
      {showSignUpModal && (
        <div
          onClick={() => setShowSignUpModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-800 text-slate-200 relative max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-950 text-blue-400 border border-blue-800/60 flex items-center justify-center font-bold">
                  <FileTextIcon size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create SpaceFill Account</h3>
                  <p className="text-[11px] text-slate-400">Use your business email to get started</p>
                </div>
              </div>
              <button
                onClick={() => setShowSignUpModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {signUpError && (
              <div className="mt-4 p-2.5 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                <AlertCircleIcon size={14} className="text-red-400 shrink-0" />
                <span>{signUpError}</span>
              </div>
            )}

            <form onSubmit={handleSignUpSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Business Email</label>
                <input
                  type="email"
                  required
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  placeholder="jane@company.com"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Password</label>
                <div className="relative">
                  <input
                    type={showSignUpPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="Min. 8 chars, letters + numbers"
                    className="w-full px-3 py-2 pr-9 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showSignUpPassword ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Country</label>
                  <input
                    type="text"
                    required
                    value={signUpCountry}
                    onChange={(e) => setSignUpCountry(e.target.value)}
                    placeholder="United States"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Phone</label>
                  <input
                    type="tel"
                    required
                    value={signUpPhone}
                    onChange={(e) => setSignUpPhone(e.target.value)}
                    placeholder="+1 555 123 4567"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Company (optional)</label>
                <input
                  type="text"
                  value={signUpCompany}
                  onChange={(e) => setSignUpCompany(e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={signUpLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors cursor-pointer shadow-sm text-xs mt-2"
              >
                {signUpLoading ? "Creating account..." : "Create Account →"}
              </button>
            </form>

            <div className="text-center pt-3 text-slate-400 text-[11px]">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setShowSignUpModal(false);
                  setShowLoginModal(true);
                }}
                className="text-blue-400 hover:underline font-semibold cursor-pointer"
              >
                Sign in here
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
