import type { NavigationItem } from "@/app/types";

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: "configuration", label: "Configuration", icon: "tune", weight: "300" },
  { id: "prompts", label: "Versions", icon: "terminal", filled: true },
  { id: "editor", label: "Editor", icon: "edit_note", weight: "300" },
  { id: "logs", label: "Logs", icon: "history", weight: "300" },
  { id: "analysis", label: "Analysis", icon: "analytics", weight: "300" },
  { id: "settings", label: "Project Settings", icon: "settings", weight: "300" },
];
