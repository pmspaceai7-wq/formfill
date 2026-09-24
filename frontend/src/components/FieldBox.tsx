"use client";

import { useState } from "react";
import type { FieldCitation, FieldConflict, FieldInference, FormField } from "@/lib/types";
import { CitationTooltip } from "./CitationTooltip";
import { ConflictResolverCard } from "./ConflictResolverCard";

interface Props {
  field: FormField;
  value: string;
  onChange: (val: string) => void;
  tabIndex: number;
  aiSource: boolean;   // value came from AI
  userEdited: boolean; // user typed over it
  citation?: FieldCitation;
  conflict?: FieldConflict;
  inference?: FieldInference;
  sourceId?: string | null;
  onViewSource?: (info: {
    filename: string;
    line?: number | null;
    snippet?: string;
    fieldLabel?: string;
    value?: string;
  }) => void;
  isConflictOpen?: boolean;
  onToggleConflict?: (open: boolean) => void;
  onHoverChange?: (hovered: boolean) => void;
}

export function FieldBox({
  field,
  value,
  onChange,
  tabIndex,
  aiSource,
  userEdited,
  citation,
  conflict,
  inference,
  sourceId,
  onViewSource,
  isConflictOpen,
  onToggleConflict,
  onHoverChange,
}: Props) {
  const [showTip, setShowTip] = useState(false);
  const [showConflictCard, setShowConflictCard] = useState(false);
  const isReadOnly = field.read_only || field.type === "signature";
  const hasConflict = Boolean(conflict && (conflict.candidates?.length ?? 0) >= 2);
  const isConflictCardVisible = isConflictOpen ?? showConflictCard;

  const hideTimer = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (hideTimer[0]) {
      clearTimeout(hideTimer[0]);
      hideTimer[1](null);
    }
    setShowTip(true);
    onHoverChange?.(true);
  };

  const handleMouseLeave = () => {
    const t = setTimeout(() => {
      setShowTip(false);
    }, 250);
    hideTimer[1](t);
    onHoverChange?.(false);
  };

  // Visual state: conflict = amber border, user-edited = green, ai-filled = blue, empty = dashed outline
  const bg = isReadOnly
    ? "rgba(200,200,200,0.35)"
    : hasConflict && !userEdited
    ? "rgba(254, 243, 199, 0.75)" // amber-100
    : userEdited
    ? "rgba(187,247,208,0.65)"   // green
    : aiSource
    ? "rgba(147,210,255,0.65)"   // blue
    : "rgba(173,216,255,0.35)";  // faint blue (empty)

  const borderLeft = hasConflict && !userEdited
    ? "3px solid #d97706"        // amber-600
    : userEdited
    ? "3px solid #16a34a"        // green-600
    : aiSource
    ? "3px solid #2563eb"        // blue-600
    : "1px dashed #93c5fd";

  const shared: React.CSSProperties = {
    display: "block",
    width: "100%",
    maxWidth: "100%",
    height: "100%",
    maxHeight: "100%",
    background: bg,
    border: "none",
    borderLeft,
    outline: "none",
    padding: "0 2px",
    boxSizing: "border-box",
    fontFamily: "Arial, sans-serif",
    fontSize: 12,
    color: "#000",
    cursor: isReadOnly ? "default" : "text",
    pointerEvents: "auto",
  };

  const tip = showTip && !isConflictCardVisible ? (
    aiSource || Boolean(citation) || Boolean(inference) ? (
      <CitationTooltip
        citation={citation}
        inference={inference}
        fieldName={field.raw_name}
        fieldLabel={field.label}
        value={value}
        onViewSource={onViewSource}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
    ) : (
      <div
        style={{
          position: "absolute",
          bottom: "105%",
          left: 0,
          zIndex: 9999,
          background: "#1e293b",
          color: "#fff",
          padding: "5px 8px",
          borderRadius: 6,
          fontSize: 11,
          whiteSpace: "pre-wrap",
          maxWidth: 260,
          pointerEvents: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
          lineHeight: 1.4,
        }}
      >
        <div><b>Name:</b> {field.label}</div>
        {field.tooltip && field.tooltip !== field.label && (
          <div style={{ marginTop: 2 }}><b>Desc:</b> {field.tooltip}</div>
        )}
        {userEdited && (
          <div style={{ marginTop: 2, color: "#86efac" }}>✏️ You edited</div>
        )}
      </div>
    )
  ) : null;

  const conflictBadge = hasConflict && (
    <button
      type="button"
      data-conflict-badge="true"
      onMouseEnter={(e) => {
        e.stopPropagation();
        setShowTip(false);
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setShowTip(false);
        if (onToggleConflict) {
          onToggleConflict(!isConflictCardVisible);
        } else {
          setShowConflictCard((prev) => !prev);
        }
      }}
      title={`Data conflict: ${conflict!.candidates.length} candidate sources. Click to resolve.`}
      style={{
        position: "absolute",
        top: -6,
        right: -6,
        zIndex: 10005,
        cursor: "pointer",
      }}
      className="w-4 h-4 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-md ring-1.5 ring-white hover:scale-110 active:scale-95 transition-all select-none cursor-pointer before:absolute before:-inset-2.5 before:content-['']"
    >
      <svg className="w-2.5 h-2.5 text-slate-950 fill-current" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    </button>
  );

  const wrap = (child: React.ReactNode) => (
    <div
      style={{ position: "relative", width: "100%", height: "100%" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {tip}
      {conflictBadge}
      {isConflictCardVisible && conflict && (
        <ConflictResolverCard
          conflict={conflict}
          onSelectCandidate={(selectedVal) => {
            onChange(selectedVal);
          }}
          onClose={() => {
            if (onToggleConflict) {
              onToggleConflict(false);
            } else {
              setShowConflictCard(false);
            }
          }}
        />
      )}
      {child}
    </div>
  );

  if (isReadOnly) return <div style={{ ...shared, cursor: "default" }} />;

  switch (field.type) {
    case "text":
      if (field.is_comb && field.max_len && field.max_len > 1) {
        const chars = value.split("");
        const cols = field.max_len;
        return wrap(
          <div
            data-field={field.field_id}
            style={{
              display: "flex",
              width: "100%",
              maxWidth: "100%",
              height: "100%",
              overflow: "hidden",
              boxSizing: "border-box",
            }}
          >
            {Array.from({ length: cols }).map((_, i) => (
              <input
                key={i}
                type="text"
                data-field={i === 0 ? field.field_id : undefined}
                maxLength={1}
                value={chars[i] ?? ""}
                tabIndex={tabIndex}
                onChange={e => {
                  const next = [...chars];
                  next[i] = e.target.value.slice(-1);
                  onChange(next.join(""));
                }}
                onKeyDown={e => {
                  const inputs = (e.currentTarget.parentElement as HTMLElement)?.querySelectorAll("input");
                  if (e.key === "Backspace" && !chars[i] && i > 0) {
                    (inputs?.[i - 1] as HTMLInputElement)?.focus();
                  }
                }}
                onInput={e => {
                  if ((e.currentTarget as HTMLInputElement).value && i < cols - 1) {
                    const inputs = (e.currentTarget.parentElement as HTMLElement)?.querySelectorAll("input");
                    (inputs?.[i + 1] as HTMLInputElement)?.focus();
                  }
                }}
                style={{
                  flex: "1 1 0px",
                  minWidth: 0,
                  width: 0,
                  height: "100%",
                  background: bg,
                  border: "none",
                  borderRight: i < cols - 1 ? "1px solid rgba(100,150,200,0.4)" : "none",
                  outline: "none",
                  textAlign: "center",
                  fontSize: 11,
                  color: "#000",
                  fontFamily: "Arial, sans-serif",
                  padding: 0,
                  margin: 0,
                  boxSizing: "border-box",
                }}
              />
            ))}
          </div>
        );
      }
      return wrap(
        <input type="text" data-field={field.field_id} style={shared} value={value}
          onChange={e => onChange(e.target.value)}
          tabIndex={tabIndex}
          maxLength={field.max_len ?? undefined} />
      );

    case "multiline_text":
      return wrap(
        <textarea data-field={field.field_id} style={{ ...shared, resize: "none" }} value={value}
          onChange={e => onChange(e.target.value)}
          tabIndex={tabIndex} />
      );

    case "checkbox": {
      const checked = value === (field.on_state ?? "Yes");
      return wrap(
        <button type="button"
          data-field={field.field_id}
          style={{ ...shared, cursor: "pointer", fontSize: 14, fontWeight: "bold", color: "#1d4ed8" }}
          tabIndex={tabIndex}
          onClick={() => onChange(checked ? "" : (field.on_state ?? "Yes"))}>
          {checked ? "✓" : ""}
        </button>
      );
    }

    case "dropdown":
    case "listbox":
      return wrap(
        <select data-field={field.field_id} style={{ ...shared, cursor: "pointer" }} value={value}
          onChange={e => onChange(e.target.value)} tabIndex={tabIndex}>
          <option value="">—</option>
          {(field.options ?? []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );

    case "radio": {
      const opts = field.options ?? [];
      return wrap(
        <div data-field={field.field_id} tabIndex={tabIndex} style={{ ...shared, display: "flex", alignItems: "center", gap: 2 }}>
          {opts.map(opt => (
            <div key={opt} title={opt} onClick={() => onChange(opt)}
              style={{
                width: 12, height: 12, borderRadius: "50%",
                border: "1.5px solid #555", cursor: "pointer", flexShrink: 0,
                background: value === opt ? "#3b82f6" : "rgba(255,255,255,0.7)",
              }} />
          ))}
        </div>
      );
    }

    default:
      return <div style={shared} />;
  }
}
