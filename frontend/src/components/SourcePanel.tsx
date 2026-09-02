"use client";

import React, { useCallback, useRef, useState } from "react";
import { uploadSources } from "@/lib/api";
import type { SourceSummary } from "@/lib/types";
import {
  UploadIcon,
  FileTextIcon,
  FolderIcon,
  SparklesIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  RefreshCwIcon,
} from "./Icons";

const ACCEPTED = [".pdf", ".docx", ".txt", ".csv", ".md"];

interface FileRow {
  name: string;
  size: number;
  chars?: number;
}

interface Props {
  onSourceReady: (sourceId: string) => void;
}

export function SourcePanel({ onSourceReady }: Props) {
  const [rows, setRows] = useState<FileRow[]>([]);
  const [warnings, setWarnings] = useState<{ file: string; warning: string }[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<"files" | "paste">("files");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const stagedFiles = useRef<File[]>([]);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    const accepted = arr.filter((f) =>
      ACCEPTED.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    stagedFiles.current = [...stagedFiles.current, ...accepted];
    setRows((prev) => [
      ...prev,
      ...accepted.map((f) => ({ name: f.name, size: f.size })),
    ]);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const removeFile = (idx: number) => {
    stagedFiles.current = stagedFiles.current.filter((_, i) => i !== idx);
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (stagedFiles.current.length === 0 && !pastedText.trim()) return;
    setLoading(true);
    try {
      const summary = await uploadSources(stagedFiles.current, pastedText);
      setSourceId(summary.source_id);
      setWarnings(summary.warnings);
      // Update rows with char counts
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          chars: summary.items.find((it) => it.name === r.name)?.chars,
        }))
      );
      onSourceReady(summary.source_id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    stagedFiles.current = [];
    setRows([]);
    setWarnings([]);
    setPastedText("");
    setSourceId(null);
  };

  return (
    <div className="w-80 h-full bg-white border-r border-slate-200 flex flex-col p-4 gap-4 text-xs select-none shadow-sm overflow-y-auto">
      {/* Title Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FileTextIcon size={14} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Source Material</h3>
            <p className="text-[10px] text-slate-500">Attach documents with your data</p>
          </div>
        </div>

        {sourceId && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
            ✓ Linked
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
        <button
          onClick={() => setActiveTab("files")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "files"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          📂 Files ({rows.length})
        </button>
        <button
          onClick={() => setActiveTab("paste")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "paste"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          ✏️ Paste Notes
        </button>
      </div>

      {/* Tab 1: File Dropzone & List */}
      {activeTab === "files" && (
        <div className="space-y-3">
          <div
            onDrop={onDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-blue-500 bg-blue-50/50"
                : "border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-slate-50"
            }`}
          >
            <UploadIcon size={20} className="mx-auto text-slate-400 mb-1.5" />
            <div className="font-semibold text-slate-800 text-xs">
              Drop resume or documents
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              PDF · DOCX · TXT · CSV · MD
            </div>
          </div>

          {/* Folder Picker Button */}
          <button
            onClick={() => folderInputRef.current?.click()}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs cursor-pointer"
          >
            <FolderIcon size={14} className="text-slate-500" />
            <span>Select Folder of Documents</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED.join(",")}
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
          <input
            ref={folderInputRef}
            type="file"
            className="hidden"
            // @ts-expect-error webkitdirectory not in standard TS types
            webkitdirectory=""
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />

          {/* File Rows */}
          {rows.length > 0 && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pt-1">
              {rows.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileTextIcon size={13} className="text-blue-600 flex-shrink-0" />
                    <span className="truncate font-medium text-slate-800" title={r.name}>
                      {r.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-slate-500">
                      {r.chars != null
                        ? `${r.chars.toLocaleString()} chars`
                        : `${(r.size / 1024).toFixed(0)} KB`}
                    </span>
                    {!sourceId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(i);
                        }}
                        className="text-slate-400 hover:text-red-600 font-bold px-1 cursor-pointer"
                        title="Remove file"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Paste Raw Text */}
      {activeTab === "paste" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Paste raw profile or bio:</span>
            <button
              onClick={() =>
                setPastedText(
                  "Full Name: Aswathi S Kumar\nEmail: aswathisajik1@gmail.com\nPhone: 7306259524\nCity: Kottayam\nState: Kerala\nCountry: India\nJob Title: Python Full Stack Developer"
                )
              }
              className="text-blue-600 font-semibold hover:underline text-[10px] cursor-pointer"
            >
              Paste Sample Info
            </button>
          </div>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Name: John Smith&#10;Email: john@example.com&#10;Phone: (555) 123-4567&#10;City: Chicago..."
            className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono resize-none leading-relaxed"
          />
        </div>
      )}

      {/* Warnings Banner if any */}
      {warnings.length > 0 && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <AlertCircleIcon size={12} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <b>{w.file}:</b> {w.warning}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Action Button: Extract Text or Reset */}
      <div className="pt-2 mt-auto">
        {!sourceId ? (
          <button
            onClick={submit}
            disabled={loading || (rows.length === 0 && !pastedText.trim())}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
              loading || (rows.length === 0 && !pastedText.trim())
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 hover:shadow-md cursor-pointer hover:scale-[1.01]"
            }`}
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Extracting Text & Entities…</span>
              </>
            ) : (
              <>
                <SparklesIcon size={14} />
                <span>⚡ Extract Text & Link Source</span>
              </>
            )}
          </button>
        ) : (
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-1.5">
                <CheckCircleIcon size={14} className="text-emerald-600" />
                <span>Source Data Ready</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>

            <button
              onClick={reset}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCwIcon size={12} />
              <span>Change Source Documents</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
