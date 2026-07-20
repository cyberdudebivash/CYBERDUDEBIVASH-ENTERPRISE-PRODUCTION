import type { Question, RiskLevel } from "../questions/types.js";
import { isScoredQuestion } from "../questions/types.js";
import type { Answers, AssessmentResult, Gap, RiskBreakdown } from "./types.js";

/**
 * Questions that count toward the score. Always derived from the question bank,
 * never a hardcoded count — the source asset's bug (ARCHITECTURE.md: Module 1
 * discovery) was exactly a hand-maintained count drifting from the real one.
 */
export function getScoredQuestions(questions: Question[]) {
  return questions.filter(isScoredQuestion);
}

export function riskLevelForScore(score: number): RiskLevel {
  if (score > 80) return "critical";
  if (score > 60) return "high";
  if (score > 30) return "medium";
  return "low";
}

export function scoreAssessment(questions: Question[], answers: Answers): AssessmentResult {
  const scoredQuestions = getScoredQuestions(questions);
  const breakdown: RiskBreakdown = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
  const gaps: Gap[] = [];

  for (const question of scoredQuestions) {
    const answer = answers[question.id];
    if (answer === false) {
      breakdown[question.riskField] += 1;
      breakdown.total += 1;
      gaps.push({
        questionId: question.id,
        question: question.text,
        level: question.riskField,
        penalty: question.penalty,
        section: question.section,
      });
    } else if (answer === true) {
      breakdown.low += 1;
    }
  }

  const scoredQuestionCount = scoredQuestions.length;
  const score =
    scoredQuestionCount === 0 ? 0 : Math.round((breakdown.total / scoredQuestionCount) * 100);

  return {
    score,
    riskLevel: riskLevelForScore(score),
    breakdown,
    gaps,
    scoredQuestionCount,
  };
}
