export type ViewType =
  | "prompts"
  | "editor"
  | "configuration"
  | "settings"
  | "logs"
  | "analysis";

export interface NavigationItem {
  id: ViewType;
  label: string;
  icon: string;
  weight?: string;
  filled?: boolean;
  count?: number | string;
}
