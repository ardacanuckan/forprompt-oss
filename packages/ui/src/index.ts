import { cx } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: Parameters<typeof cx>) => twMerge(cx(inputs));

// Component exports
export * from "./button";
export * from "./input";
export * from "./label";
export * from "./card";
export * from "./textarea";
export * from "./badge";
export * from "./select";
export * from "./tabs";
export * from "./separator";
export * from "./toast";
export * from "./theme";
export * from "./dropdown-menu";
export * from "./field";

// Animation components
export * from "./custom-cursor";
export * from "./grain-overlay";
export * from "./magnetic-button";
