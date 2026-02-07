/**
 * Prompt Analysis Results - stores AI-generated analysis for prompt versions
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  real,
  jsonb,
} from 'drizzle-orm/pg-core';
import { promptVersions } from './prompt-versions';

// Type definitions for JSONB columns
export interface AlignmentCheck {
  purposeAlignment: {
    score: number;
    feedback: string;
  };
  behaviorAlignment: {
    score: number;
    feedback: string;
  };
  constraintsAlignment: {
    score: number;
    feedback: string;
  };
}

export interface ToolUsageAnalysis {
  tools: Array<{
    name: string;
    isProperlyInstructed: boolean;
    issues: string[];
    suggestions: string[];
  }>;
  overallToolUsage: string;
}

export const promptAnalysisResults = pgTable(
  'prompt_analysis_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    versionId: uuid('version_id')
      .notNull()
      .references(() => promptVersions.id, { onDelete: 'cascade' }),
    clarityScore: real('clarity_score').notNull(),
    improvements: jsonb('improvements').$type<string[]>().notNull(),
    edgeCases: jsonb('edge_cases').$type<string[]>().notNull(),
    optimizations: jsonb('optimizations').$type<string[]>().notNull(),
    overallAssessment: text('overall_assessment').notNull(),
    // Alignment check (optional)
    alignmentCheck: jsonb('alignment_check').$type<AlignmentCheck>(),
    // Tool usage analysis (optional)
    toolUsageAnalysis: jsonb('tool_usage_analysis').$type<ToolUsageAnalysis>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('prompt_analysis_results_version_id_idx').on(table.versionId),
    index('prompt_analysis_results_version_created_idx').on(
      table.versionId,
      table.createdAt
    ),
  ]
);

export type PromptAnalysisResult = typeof promptAnalysisResults.$inferSelect;
export type NewPromptAnalysisResult = typeof promptAnalysisResults.$inferInsert;
