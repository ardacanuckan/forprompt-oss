"use client";

import { useEffect, useState } from "react";

// Prompt snippets
const promptSnippets = [
  "You are a helpful assistant...",
  "Respond in JSON format",
  "Be concise and professional",
  "Step by step reasoning",
  "Analyze the following:",
  "Summarize this document",
  "Act as an expert in...",
  "Consider edge cases",
  "Return structured data",
  "Follow these constraints:",
  "Use this context:",
  "Format output as...",
];

// Code symbols
const codeSymbols = ["{", "}", "[", "]", "<", ">", "//", ":", "=>", "..."];

interface FloatingItem {
  id: number;
  content: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  type: "prompt" | "symbol";
}

export function NeuralBackground() {
  const [items, setItems] = useState<FloatingItem[]>([]);

  useEffect(() => {
    // Generate floating items
    const generatedItems: FloatingItem[] = [];

    // Prompt cards - daha görünür
    promptSnippets.forEach((text, i) => {
      generatedItems.push({
        id: i,
        content: text,
        x: Math.random() * 90 + 5,
        y: Math.random() * 90 + 5,
        size: 11 + Math.random() * 3,
        opacity: 0.15 + Math.random() * 0.1, // Daha görünür: 0.15-0.25
        duration: 25 + Math.random() * 15,
        delay: Math.random() * -20,
        type: "prompt",
      });
    });

    // Code symbols - daha görünür
    codeSymbols.forEach((symbol, i) => {
      for (let j = 0; j < 2; j++) {
        generatedItems.push({
          id: 100 + i * 2 + j,
          content: symbol,
          x: Math.random() * 90 + 5,
          y: Math.random() * 90 + 5,
          size: 24 + Math.random() * 20,
          opacity: 0.08 + Math.random() * 0.06, // 0.08-0.14
          duration: 30 + Math.random() * 20,
          delay: Math.random() * -25,
          type: "symbol",
        });
      }
    });

    setItems(generatedItems);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-20">
      {/* Floating items */}
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute font-mono select-none animate-float"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            fontSize: `${item.size}px`,
            opacity: item.opacity,
            color: item.type === "prompt" ? "#888" : "#555",
            animationDuration: `${item.duration}s`,
            animationDelay: `${item.delay}s`,
            whiteSpace: "nowrap",
          }}
        >
          {item.type === "prompt" ? (
            <span className="px-2 py-1 rounded border border-neutral-700/50 bg-neutral-800/30 backdrop-blur-sm">
              {item.content}
            </span>
          ) : (
            <span className="font-bold">{item.content}</span>
          )}
        </div>
      ))}

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />
    </div>
  );
}
