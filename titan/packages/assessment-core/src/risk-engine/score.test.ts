import { describe, expect, it } from "vitest";
import type { Question } from "../questions/types.js";
import { dpdpV1 } from "../questions/dpdp-v1.js";
import { getScoredQuestions, riskLevelForScore, scoreAssessment } from "./score.js";

const fixtureQuestions: Question[] = [
  { id: "name", type: "text", text: "Name?" },
  { id: "q1", type: "boolean", riskField: "critical", text: "Q1", penalty: "p1", section: "s1" },
  { id: "q2", type: "boolean", riskField: "high", text: "Q2", penalty: "p2", section: "s2" },
  { id: "q3", type: "boolean", riskField: "medium", text: "Q3", penalty: "p3", section: "s3" },
  { id: "gate", type: "boolean", riskField: "qualification", text: "Gate?" },
];

describe("getScoredQuestions", () => {
  it("excludes text and qualification questions", () => {
    expect(getScoredQuestions(fixtureQuestions).map((q) => q.id)).toEqual(["q1", "q2", "q3"]);
  });
});

describe("riskLevelForScore", () => {
  it.each([
    [0, "low"],
    [30, "low"],
    [31, "medium"],
    [60, "medium"],
    [61, "high"],
    [80, "high"],
    [81, "critical"],
    [100, "critical"],
  ] as const)("scores %i as %s", (score, level) => {
    expect(riskLevelForScore(score)).toBe(level);
  });
});

describe("scoreAssessment", () => {
  it("scores 0 with every scored question answered true", () => {
    const answers = { q1: true, q2: true, q3: true, gate: true, name: "Acme" };
    const result = scoreAssessment(fixtureQuestions, answers);
    expect(result.score).toBe(0);
    expect(result.riskLevel).toBe("low");
    expect(result.breakdown).toEqual({ critical: 0, high: 0, medium: 0, low: 3, total: 0 });
    expect(result.gaps).toEqual([]);
  });

  it("scores 100 with every scored question answered false", () => {
    const answers = { q1: false, q2: false, q3: false, gate: false, name: "Acme" };
    const result = scoreAssessment(fixtureQuestions, answers);
    expect(result.score).toBe(100);
    expect(result.riskLevel).toBe("critical");
    expect(result.breakdown).toEqual({ critical: 1, high: 1, medium: 1, low: 0, total: 3 });
  });

  it("ignores qualification and text questions when scoring", () => {
    const allFalseIncludingGate = { q1: false, q2: false, q3: false, gate: false };
    const allFalseExceptGate = { q1: false, q2: false, q3: false, gate: true };
    expect(scoreAssessment(fixtureQuestions, allFalseIncludingGate).score).toBe(
      scoreAssessment(fixtureQuestions, allFalseExceptGate).score,
    );
  });

  it("treats an unanswered question as neither a pass nor a gap", () => {
    const result = scoreAssessment(fixtureQuestions, { q1: false });
    expect(result.breakdown).toEqual({ critical: 1, high: 0, medium: 0, low: 0, total: 1 });
    expect(result.scoredQuestionCount).toBe(3);
  });

  it("carries the question's penalty and section into the gap record", () => {
    const result = scoreAssessment(fixtureQuestions, { q2: false });
    expect(result.gaps).toEqual([
      { questionId: "q2", question: "Q2", level: "high", penalty: "p2", section: "s2" },
    ]);
  });

  it("computes scoredQuestionCount rather than hardcoding it", () => {
    const result = scoreAssessment(fixtureQuestions, {});
    expect(result.scoredQuestionCount).toBe(getScoredQuestions(fixtureQuestions).length);
  });

  it("scores 0 for a question bank with no scoreable questions, instead of dividing by zero", () => {
    const textOnly: Question[] = [{ id: "name", type: "text", text: "Name?" }];
    const result = scoreAssessment(textOnly, { name: "Acme" });
    expect(result.scoredQuestionCount).toBe(0);
    expect(result.score).toBe(0);
    expect(result.riskLevel).toBe("low");
  });

  describe("against the real DPDP v1 question bank", () => {
    it("has exactly 12 scoreable questions — regression guard for the source asset's maxScore=13 bug", () => {
      expect(getScoredQuestions(dpdpV1.questions)).toHaveLength(12);
    });

    it("scores 100, not 92, when every scored question fails — the bug this module fixes", () => {
      const allFail = Object.fromEntries(
        getScoredQuestions(dpdpV1.questions).map((q) => [q.id, false]),
      );
      const result = scoreAssessment(dpdpV1.questions, allFail);
      expect(result.score).toBe(100);
      expect(result.riskLevel).toBe("critical");
    });

    it("scores 0 when every scored question passes", () => {
      const allPass = Object.fromEntries(
        getScoredQuestions(dpdpV1.questions).map((q) => [q.id, true]),
      );
      const result = scoreAssessment(dpdpV1.questions, allPass);
      expect(result.score).toBe(0);
      expect(result.riskLevel).toBe("low");
    });

    it("matches hand-computed math for a partial-failure scenario", () => {
      // First 3 of 12 scored questions fail: round((3/12)*100) = 25 -> "low" band.
      const scored = getScoredQuestions(dpdpV1.questions);
      const answers = Object.fromEntries(scored.map((q, i) => [q.id, i >= 3]));
      const result = scoreAssessment(dpdpV1.questions, answers);
      expect(result.score).toBe(25);
      expect(result.riskLevel).toBe("low");
      expect(result.breakdown.total).toBe(3);
    });
  });
});
