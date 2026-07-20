export type {
  Question,
  TextQuestion,
  BooleanQuestion,
  ScoredQuestion,
  QualificationQuestion,
  QuestionBank,
  QuestionRiskField,
  RiskLevel,
} from "./questions/types.js";
export { isScoredQuestion } from "./questions/types.js";
export { dpdpV1 } from "./questions/dpdp-v1.js";

export type { Answers, Gap, RiskBreakdown, AssessmentResult } from "./risk-engine/types.js";
export { scoreAssessment, riskLevelForScore, getScoredQuestions } from "./risk-engine/score.js";
