"use client";

import React, { useCallback, useEffect, useState } from "react";
import { clearProfile, getProfile, updateProfileFact } from "@/lib/api";
import type { ProfileFact } from "@/lib/types";
import {
  UserIcon,
  XIcon,
  TrashIcon,
  CheckIcon,
  AlertCircleIcon,
  RefreshCwIcon,
} from "./Icons";

interface Props {
  open: boolean;
  onClose: () => void;
  onChanged?: (count: number) => void;
}

const GROUP_LABELS: Record<string, string> = {
  identity: "Identity",
  contact: "Contact",
  address: "Address",
  employment: "Employment",
  other: "Other",
};

const GROUP_ORDER = ["identity", "contact", "address", "employment", "other"];

/** "person.first_name" -> "First name" */
function prettyKey(key: string): string {
  const tail = key.includes(".") ? key.slice(key.indexOf(".") + 1) : key;
  const words = tail.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function ProfileDrawer({ open, onClose, onChanged }: Props) {
  const [facts, setFacts] = useState<ProfileFact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getProfile();
      setFacts(data.facts);
      onChanged?.(data.facts.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your profile");
    } finally {
      setLoading(false);
    }
  }, [onChanged]);

  useEffect(() => {
    if (open) {
      load();
      setConfirmClear(false);
    }
  }, [open, load]);

  // Escape closes the drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const save = async (key: string) => {
    setSaving(true);
    try {
      const data = await updateProfileFact(key, draft);
      setFacts(data.facts);
      onChanged?.(data.facts.length);
      setEditingKey(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that change");
    } finally {
      setSaving(false);
    }
  };

  const removeFact = async (key: string) => {
    setSaving(true);
    try {
      const data = await updateProfileFact(key, "");
      setFacts(data.facts);
      onChanged?.(data.facts.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove that detail");
    } finally {
      setSaving(false);
    }
  };

  const wipe = async () => {
    setSaving(true);
    try {
      await clearProfile();
      setFacts([]);
      onChanged?.(0);
      setConfirmClear(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not clear your profile");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const grouped = GROUP_ORDER.map((g) => ({
    group: g,
    items: facts.filter((f) => f.group === g),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <header className="flex items-start justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <UserIcon size={18} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base leading-tight">
                Your Profile
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {facts.length} detail{facts.length === 1 ? "" : "s"} reused on every form
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <XIcon size={18} />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
              <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
              Loading…
            </div>
          ) : error ? (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircleIcon size={14} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{error}</p>
                <button
                  onClick={load}
                  className="mt-2 font-bold underline cursor-pointer"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : facts.length === 0 ? (
            <div className="text-center py-14 px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <UserIcon size={24} />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">
                Nothing remembered yet
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-[280px] mx-auto">
                Upload a resume or paste your details in the left panel. What we learn
                is saved here and fills every future form automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {grouped.map(({ group, items }) => (
                <section key={group}>
                  <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                    {GROUP_LABELS[group] ?? group}
                  </h3>
                  <div className="space-y-1.5">
                    {items.map((fact) => (
                      <div
                        key={fact.key}
                        className="group rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-slate-500 truncate">
                            {prettyKey(fact.key)}
                          </span>
                          {fact.user_edited && (
                            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                              Edited
                            </span>
                          )}
                        </div>

                        {editingKey === fact.key ? (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <input
                              autoFocus
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") save(fact.key);
                                if (e.key === "Escape") setEditingKey(null);
                              }}
                              className="flex-1 min-w-0 px-2 py-1 text-sm rounded-lg border border-blue-400 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                            <button
                              onClick={() => save(fact.key)}
                              disabled={saving}
                              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors cursor-pointer flex-shrink-0"
                              title="Save"
                            >
                              <CheckIcon size={13} />
                            </button>
                            <button
                              onClick={() => setEditingKey(null)}
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 transition-colors cursor-pointer flex-shrink-0"
                              title="Cancel"
                            >
                              <XIcon size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <button
                              onClick={() => {
                                setEditingKey(fact.key);
                                setDraft(fact.value);
                              }}
                              className="flex-1 min-w-0 text-left text-sm font-medium text-slate-900 truncate hover:text-blue-700 transition-colors cursor-pointer"
                              title="Click to edit"
                            >
                              {fact.value}
                            </button>
                            <button
                              onClick={() => removeFact(fact.key)}
                              disabled={saving}
                              className="p-1 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer flex-shrink-0"
                              title="Remove this detail"
                            >
                              <TrashIcon size={13} />
                            </button>
                          </div>
                        )}

                        <p className="text-[10px] text-slate-400 mt-1 truncate">
                          from {fact.source}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {facts.length > 0 && (
          <footer className="px-5 py-3 border-t border-slate-200 flex-shrink-0 bg-slate-50/80">
            {confirmClear ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-700 font-medium">
                  Delete all {facts.length} remembered details? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={wipe}
                    disabled={saving}
                    className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Yes, delete everything
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={load}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCwIcon size={12} />
                  Refresh
                </button>
                <button
                  onClick={() => setConfirmClear(true)}
                  className="px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <TrashIcon size={12} />
                  Clear profile
                </button>
              </div>
            )}
          </footer>
        )}
      </aside>
    </div>
  );
}
