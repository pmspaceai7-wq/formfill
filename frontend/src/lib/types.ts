export type FieldType =
  | "text"
  | "multiline_text"
  | "checkbox"
  | "radio"
  | "dropdown"
  | "listbox"
  | "signature";

export interface FormField {
  field_id: string;
  raw_name: string;
  label: string;
  tooltip: string | null;
  type: FieldType;
  page: number;
  bbox: [number, number, number, number]; // [x0, y0, x1, y1] normalised 0-1 top-left
  options: string[] | null;
  on_state: string | null;
  max_len: number | null;
  is_comb: boolean;
  required: boolean;
  read_only: boolean;
}

export interface PageInfo {
  number: number;
  width: number;
  height: number;
  image: string;
}

export interface FormSchema {
  form_id: string;
  filename: string;
  page_count: number;
  pages: PageInfo[];
  fields: FormField[];
}

export interface SourceItem {
  name: string;
  chars: number;
}

export interface SourceWarning {
  file: string;
  warning: string;
}

export interface SourceSummary {
  source_id: string;
  items: SourceItem[];
  warnings: SourceWarning[];
  /** Facts newly learned or updated from this upload. */
  facts_learned?: number;
  /** Total facts now held in the profile. */
  facts_total?: number;
}

/** One remembered fact about the user, reused across every form. */
export interface ProfileFact {
  key: string;
  value: string;
  group: string;
  source: string;
  updated_at: string;
  user_edited: boolean;
}

export interface ProfileResponse {
  profile_id: string;
  facts: ProfileFact[];
}
