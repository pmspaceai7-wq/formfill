"use client";

import { useState } from "react";
import type { FormField } from "@/lib/types";

interface Props {
  field: FormField;
  value: string;
  onChange: (val: string) => void;
  tabIndex: number;
  aiSource: boolean;   // value came from AI
  userEdited: boolean; // user typed over it
}

export function FieldBox({ field, value, onChange, tabIndex, aiSource, userEdited }: Props) {
  const [showTip, setShowTip] = useState(false);
  const isReadOnly = field.read_only || field.type === "signature";

  // Visual state: user-edited = green, ai-filled = blue, empty = dashed outline
  const bg = isReadOnly
    ? "rgba(200,200,200,0.35)"
    : userEdited
    ? "rgba(187,247,208,0.65)"   // green
    : aiSource
    ? "rgba(147,210,255,0.65)"   // blue
    : "rgba(173,216,255,0.35)";  // faint blue (empty)

  const borderLeft = userEdited
    ? "3px solid #16a34a"
    : aiSource
    ? "3px solid #2563eb"
    : "1px dashed #93c5fd";

  const shared: React.CSSProperties = {
    display: "block",
    width: "100%",
    height: "100%",
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

  const tip = showTip ? (
    <div style={{
      position: "absolute", bottom: "105%", left: 0, zIndex: 9999,
      background: "#1e293b", color: "#fff", padding: "5px 8px",
      borderRadius: 5, fontSize: 11, whiteSpace: "pre-wrap",
      maxWidth: 260, pointerEvents: "none",
      boxShadow: "0 2px 8px rgba(0,0,0,0.35)", lineHeight: 1.4,
    }}>
      <div><b>Name:</b> {field.label}</div>
      {field.tooltip && field.tooltip !== field.label &&
        <div style={{ marginTop: 2 }}><b>Desc:</b> {field.tooltip}</div>}
      {aiSource && !userEdited && <div style={{ marginTop: 2, color: "#93c5fd" }}>🤖 AI filled</div>}
      {userEdited && <div style={{ marginTop: 2, color: "#86efac" }}>✏️ You edited</div>}
    </div>
  ) : null;

  const wrap = (child: React.ReactNode) => (
    <div
      style={{ position: "relative", width: "100%", height: "100%" }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      {tip}
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
          <div style={{ display: "flex", width: "100%", height: "100%" }}>
            {Array.from({ length: cols }).map((_, i) => (
              <input
                key={i}
                type="text"
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
                  flex: 1, height: "100%", background: bg,
                  border: "none", borderRight: i < cols - 1 ? "1px solid rgba(100,150,200,0.4)" : "none",
                  outline: "none", textAlign: "center", fontSize: 11, color: "#000",
                  fontFamily: "Arial, sans-serif", padding: 0,
                }}
              />
            ))}
          </div>
        );
      }
      return wrap(
        <input type="text" style={shared} value={value}
          onChange={e => onChange(e.target.value)}
          tabIndex={tabIndex}
          maxLength={field.max_len ?? undefined} />
      );

    case "multiline_text":
      return wrap(
        <textarea style={{ ...shared, resize: "none" }} value={value}
          onChange={e => onChange(e.target.value)}
          tabIndex={tabIndex} />
      );

    case "checkbox": {
      const checked = value === (field.on_state ?? "Yes");
      return wrap(
        <button type="button"
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
        <select style={{ ...shared, cursor: "pointer" }} value={value}
          onChange={e => onChange(e.target.value)} tabIndex={tabIndex}>
          <option value="">—</option>
          {(field.options ?? []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );

    case "radio": {
      const opts = field.options ?? [];
      return wrap(
        <div style={{ ...shared, display: "flex", alignItems: "center", gap: 2 }}>
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
