"use client";

import { cn } from "@forprompt/ui";

interface PromptCompletenessBarProps {
  score: number; // 0-100
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function PromptCompletenessBar({
  score,
  size = "md",
  showLabel = false,
  className,
}: PromptCompletenessBarProps) {
  // Determine color based on score
  const getColor = () => {
    if (score >= 71) return "text-emerald-500";
    if (score >= 31) return "text-yellow-500";
    return "text-red-500";
  };

  const getBgColor = () => {
    if (score >= 71) return "bg-emerald-500/10";
    if (score >= 31) return "bg-yellow-500/10";
    return "bg-red-500/10";
  };

  const getStrokeColor = () => {
    if (score >= 71) return "#10b981"; // emerald-500
    if (score >= 31) return "#eab308"; // yellow-500
    return "#ef4444"; // red-500
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      container: "w-8 h-8",
      svg: 32,
      strokeWidth: 3,
      fontSize: "text-[10px]",
      labelSize: "text-xs",
    },
    md: {
      container: "w-12 h-12",
      svg: 48,
      strokeWidth: 4,
      fontSize: "text-xs",
      labelSize: "text-sm",
    },
    lg: {
      container: "w-16 h-16",
      svg: 64,
      strokeWidth: 5,
      fontSize: "text-sm",
      labelSize: "text-base",
    },
  };

  const config = sizeConfig[size];
  const radius = (config.svg - config.strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("relative", config.container)}>
        {/* Background circle with subtle color */}
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            getBgColor()
          )}
        />
        
        {/* SVG Progress Circle */}
        <svg
          width={config.svg}
          height={config.svg}
          className="absolute inset-0 -rotate-90"
        >
          {/* Background track */}
          <circle
            cx={config.svg / 2}
            cy={config.svg / 2}
            r={radius}
            fill="none"
            stroke="#262626"
            strokeWidth={config.strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={config.svg / 2}
            cy={config.svg / 2}
            r={radius}
            fill="none"
            stroke={getStrokeColor()}
            strokeWidth={config.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        
        {/* Score text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-bold", getColor(), config.fontSize)}>
            {score}
          </span>
        </div>
      </div>
      
      {showLabel && (
        <span className={cn("text-neutral-400", config.labelSize)}>
          Complete
        </span>
      )}
    </div>
  );
}

