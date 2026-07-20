import { describe, expect, it } from "vitest";
import { dpdpV1 } from "./dpdp-v1.js";
import { isScoredQuestion } from "./types.js";

describe("dpdpV1 question bank", () => {
  it("has 15 questions, matching the existing scanner's question count", () => {
    expect(dpdpV1.questions).toHaveLength(15);
  });

  it("has unique question ids", () => {
    const ids = dpdpV1.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has exactly 12 scored (boolean, non-qualification) questions", () => {
    // Regression guard for the bug found in ARCHITECTURE.md's Module 1 discovery
    // section: the source asset hardcoded its score denominator to 13 against an
    // actual count of 12. If this count ever changes, scoreAssessment's denominator
    // changes with it automatically (score.ts derives it, never hardcodes it).
    const scored = dpdpV1.questions.filter(isScoredQuestion);
    expect(scored).toHaveLength(12);
  });

  it("has exactly one free-text question and two qualification questions", () => {
    const textQuestions = dpdpV1.questions.filter((q) => q.type === "text");
    const qualificationQuestions = dpdpV1.questions.filter(
      (q) => q.type === "boolean" && q.riskField === "qualification",
    );
    expect(textQuestions).toHaveLength(1);
    expect(qualificationQuestions).toHaveLength(2);
  });

  it("gives every scored question a penalty and a section reference", () => {
    const scored = dpdpV1.questions.filter(isScoredQuestion);
    for (const question of scored) {
      expect(question.penalty, `${question.id} should have a penalty`).toBeTruthy();
      expect(question.section, `${question.id} should have a section`).toBeTruthy();
    }
  });
});
