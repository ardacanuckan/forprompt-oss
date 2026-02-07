import type { FieldConfig } from "@/app/types";

export const PROMPT_FIELD_CONFIGS: FieldConfig[] = [
  {
    key: "purpose",
    label: "Purpose",
    placeholder: "What is the main goal of this prompt?",
    maxLength: 4000,
    rows: 8,
  },
  {
    key: "expectedBehavior",
    label: "Expected Behavior",
    placeholder: "How should the AI behave?",
    maxLength: 4000,
    rows: 10,
  },
  {
    key: "inputFormat",
    label: "Input Format",
    placeholder: "What format will the input follow?",
    maxLength: 4000,
    rows: 8,
  },
  {
    key: "outputFormat",
    label: "Output Format",
    placeholder: "What format should the output follow?",
    maxLength: 4000,
    rows: 8,
  },
  {
    key: "constraints",
    label: "Constraints & Rules",
    placeholder: "What should the AI avoid?",
    maxLength: 4000,
    rows: 8,
  },
  {
    key: "useCases",
    label: "Use Cases",
    placeholder: "Primary scenarios?",
    maxLength: 4000,
    rows: 8,
  },
];

export const INITIAL_PROMPT_FORM = {
  systemPrompt: "",
  description: "",
};
