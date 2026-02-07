export type FieldKey =
  | "purpose"
  | "expectedBehavior"
  | "inputFormat"
  | "outputFormat"
  | "constraints"
  | "useCases"
  | "additionalNotes"
  | "toolsNotes"
  | "referencePrompt";

export interface FieldConfig {
  key: FieldKey;
  label: string;
  placeholder: string;
  maxLength: number;
  rows: number;
}

export type ToolType = "analysis" | "test" | "edit" | null;
