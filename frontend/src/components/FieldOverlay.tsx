"use client";

import type { FieldCitation, FieldConflict, FieldInference, FormField } from "@/lib/types";
import { FieldBox } from "./FieldBox";

interface Props {
  fields: FormField[];
  renderedWidth: number;
  renderedHeight: number;
  values: Record<string, string>;
  aiValues: Record<string, string>;    // values filled by AI
  userEdited: Set<string>;             // field_ids the user has typed into
  onChange: (fieldId: string, value: string) => void;
  citations?: Record<string, FieldCitation>;
  conflicts?: Record<string, FieldConflict>;
  inferences?: Record<string, FieldInference>;
  sourceId?: string | null;
  onViewSource?: (info: {
    filename: string;
    line?: number | null;
    snippet?: string;
    fieldLabel?: string;
    value?: string;
  }) => void;
}

export function FieldOverlay({
  fields,
  renderedWidth,
  renderedHeight,
  values,
  aiValues,
  userEdited,
  onChange,
  citations = {},
  conflicts = {},
  inferences = {},
  sourceId,
  onViewSource,
}: Props) {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: renderedWidth, height: renderedHeight, zIndex: 10 }}>
      {fields.map((field, idx) => {
        const [x0, y0, x1, y1] = field.bbox;
        const left   = x0 * renderedWidth;
        const top    = y0 * renderedHeight;
        const width  = (x1 - x0) * renderedWidth;
        const height = (y1 - y0) * renderedHeight;

        return (
          <div key={field.field_id} style={{ position: "absolute", left, top, width, height, zIndex: 11 }}>
            <FieldBox
              field={field}
              value={values[field.field_id] ?? ""}
              onChange={(val) => onChange(field.field_id, val)}
              tabIndex={idx + 1}
              aiSource={field.field_id in aiValues && !userEdited.has(field.field_id)}
              userEdited={userEdited.has(field.field_id)}
              citation={citations[field.field_id]}
              conflict={conflicts[field.field_id]}
              inference={inferences[field.field_id]}
              sourceId={sourceId}
              onViewSource={onViewSource}
            />
          </div>
        );
      })}
    </div>
  );
}
