// Data shapes for a question bank. Framework-agnostic on purpose (PRODUCT_VISION.md:
// "DPDP is the first module, not the whole product") — nothing here references DPDP.
// The DPDP-specific content lives entirely in ./dpdp-v1.ts as data, not in these types.

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type QuestionRiskField = RiskLevel | "qualification";

interface BaseQuestion {
  id: string;
  text: string;
  hint?: string;
}

export interface TextQuestion extends BaseQuestion {
  type: "text";
}

/** A boolean question that counts toward the risk score when answered false. */
export interface ScoredQuestion extends BaseQuestion {
  type: "boolean";
  riskField: RiskLevel;
  penalty?: string;
  section?: string;
}

/** A boolean question used for routing/segmentation, excluded from scoring. */
export interface QualificationQuestion extends BaseQuestion {
  type: "boolean";
  riskField: "qualification";
}

export type BooleanQuestion = ScoredQuestion | QualificationQuestion;

export type Question = TextQuestion | BooleanQuestion;

export interface QuestionBank {
  id: string;
  version: string;
  framework: string;
  questions: Question[];
}

export function isScoredQuestion(question: Question): question is ScoredQuestion {
  return question.type === "boolean" && question.riskField !== "qualification";
}
