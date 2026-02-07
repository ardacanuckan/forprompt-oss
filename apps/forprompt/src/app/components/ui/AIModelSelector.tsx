"use client";

import { Select, SelectOption } from "@forprompt/ui/select";
import { AVAILABLE_MODELS } from "@constants";

interface AIModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

export function AIModelSelector({
  selectedModel,
  onModelChange,
  disabled,
}: AIModelSelectorProps) {
  const currentModel = AVAILABLE_MODELS.find((m) => m.id === selectedModel);

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
        Model:
      </label>
      <Select
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value)}
        disabled={disabled}
        className="w-56"
      >
        {AVAILABLE_MODELS.map((model) => (
          <SelectOption key={model.id} value={model.id}>
            {model.name}
          </SelectOption>
        ))}
      </Select>
      {currentModel && (
        <span className="text-xs text-muted-foreground hidden md:inline">
          {currentModel.provider} • {currentModel.description}
        </span>
      )}
    </div>
  );
}

