import type { RiskLevel } from "../questions/types.js";

export type Answers = Record<string, string | boolean | undefined>;

export interface Gap {
  questionId: string;
  question: string;
  level: RiskLevel;
  penalty?: string;
  section?: string;
}

export interface RiskBreakdown {
  critical: number;
  high: number;
  medium: number;
  low: number;
  /** Count of gaps (critical + high + medium) — the score's numerator. */
  total: number;
}

export interface AssessmentResult {
  /** 0-100. Higher means more risk, matching the source scanner's convention. */
  score: number;
  riskLevel: RiskLevel;
  breakdown: RiskBreakdown;
  gaps: Gap[];
  /** The score's denominator — computed from the question bank, never hardcoded. */
  scoredQuestionCount: number;
}
