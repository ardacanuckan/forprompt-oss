"use client";

import { Button } from "@forprompt/ui/button";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  isLoading?: boolean;
  warning?: string | null;
  disabled?: boolean;
  disabledReason?: string;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isLoading = false,
  warning,
  disabled = false,
  disabledReason,
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-sidebar-bg rounded-lg border border-content-border shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {title}
          </h3>
          <p className="text-text-secondary text-sm mb-4">
            {description}
          </p>

          {warning && (
            <div className="mb-4 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-yellow-500 text-[18px] mt-0.5">warning</span>
                <p className="text-sm text-yellow-500">{warning}</p>
              </div>
            </div>
          )}

          {disabled && disabledReason && (
            <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/30">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-red-500 text-[18px] mt-0.5">block</span>
                <p className="text-sm text-red-400">{disabledReason}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-content-border text-text-primary hover:bg-sidebar-hover"
            >
              {cancelText}
            </Button>
            <Button
              variant={variant === "destructive" ? "destructive" : "default"}
              onClick={onConfirm}
              disabled={isLoading || disabled}
              className={variant === "destructive" ? "" : "bg-gray-100 hover:bg-white text-gray-900"}
            >
              {isLoading ? "Processing..." : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

