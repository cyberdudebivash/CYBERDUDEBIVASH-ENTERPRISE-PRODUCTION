import type { AssessmentRecord } from "@titan/platform";
import type { QuestionBank, RiskLevel } from "@titan/assessment-core";
import { dpdpV1, isScoredQuestion } from "@titan/assessment-core";
import { RiskBadge } from "../leads/RiskBadge.js";
import { FrameworkBadge } from "./FrameworkBadge.js";
import "./AssessmentResultsPanel.css";

const SEVERITY_ORDER: RiskLevel[] = ["critical", "high", "medium", "low"];

// Same small, explicit registry as router.ts's resolveQuestionBank — exactly
// one entry today, a second real framework is a second entry here, not a
// restructure. Used purely as label/metadata lookup (question text, section,
// order) for rendering; every real pass/fail/score fact still comes
// entirely from this assessment's own server-computed `result` (Security
// Release Blocker Sprint: never recomputed client-side).
const QUESTION_BANKS: QuestionBank[] = [dpdpV1];

function resolveQuestionBank(framework: string, frameworkVersion: string): QuestionBank | null {
  return (
    QUESTION_BANKS.find((bank) => bank.id === framework && bank.version === frameworkVersion) ??
    null
  );
}

function formatAnswer(value: string | boolean | undefined): string {
  if (value === undefined) return "Not answered";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return value;
}

export interface AssessmentResultsPanelProps {
  assessment: AssessmentRecord;
}

/**
 * EAP-3 Workstream 3. Risk summary, severity breakdown, findings grouped by
 * severity — same structure and labeling as `LeadRiskPanel` (EAP-2), reused
 * deliberately rather than diverged, since both render the identical
 * `AssessmentResult` shape. Adds category/section coverage and full
 * question-by-question responses, which a single lead's risk panel never
 * needed (a lead has no standalone "review every question" view) — both use
 * the static question bank purely as a label lookup (text/section for a
 * `questionId`), joined against this assessment's own real `answers` and
 * server-computed `result.gaps`, never a second scoring implementation.
 */
export function AssessmentResultsPanel({ assessment }: AssessmentResultsPanelProps) {
  const { result } = assessment;
  const bank = resolveQuestionBank(assessment.framework, assessment.frameworkVersion);

  const gapsBySeverity = SEVERITY_ORDER.map((level) => ({
    level,
    gaps: result.gaps.filter((gap) => gap.level === level),
  })).filter((group) => group.gaps.length > 0);

  return (
    <div className="titan-assessment-results">
      <div className="titan-assessment-results__summary">
        <RiskBadge riskLevel={result.riskLevel} />
        <span className="titan-assessment-results__score">{result.score} / 100</span>
        <FrameworkBadge
          framework={assessment.framework}
          frameworkVersion={assessment.frameworkVersion}
        />
      </div>

      <dl className="titan-assessment-results__breakdown">
        {SEVERITY_ORDER.map((level) => (
          <div
            key={level}
            className={`titan-assessment-results__breakdown-item titan-assessment-results__breakdown-item--${level}`}
          >
            <dt>{level}</dt>
            <dd>{result.breakdown[level]}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="titan-assessment-results-findings">
        <h3 id="titan-assessment-results-findings" className="titan-assessment-results__heading">
          Findings
        </h3>
        {gapsBySeverity.length === 0 ? (
          <p className="titan-assessment-results__note">
            No gaps found — every scored control passed.
          </p>
        ) : (
          gapsBySeverity.map((group) => (
            <div key={group.level} className="titan-assessment-results__findings-group">
              <h4 className="titan-assessment-results__findings-heading">
                {group.level} findings ({group.gaps.length})
              </h4>
              <ul className="titan-assessment-results__findings-list">
                {group.gaps.map((gap) => (
                  <li key={gap.questionId}>
                    <p className="titan-assessment-results__finding-question">{gap.question}</p>
                    {gap.section && (
                      <p className="titan-assessment-results__finding-section">{gap.section}</p>
                    )}
                    {gap.penalty && (
                      <p className="titan-assessment-results__finding-penalty">{gap.penalty}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      {bank ? (
        <>
          <CategoryCoverage bank={bank} gaps={result.gaps} />
          <QuestionResponses bank={bank} answers={assessment.answers} gaps={result.gaps} />
        </>
      ) : (
        <p className="titan-assessment-results__note">
          Category coverage and question-by-question responses are not available for{" "}
          {assessment.framework} v{assessment.frameworkVersion} in this view — no question bank for
          it is registered here.
        </p>
      )}
    </div>
  );
}

function CategoryCoverage({
  bank,
  gaps,
}: {
  bank: QuestionBank;
  gaps: AssessmentRecord["result"]["gaps"];
}) {
  const totalsBySection = new Map<string, number>();
  for (const question of bank.questions) {
    if (isScoredQuestion(question) && question.section) {
      totalsBySection.set(question.section, (totalsBySection.get(question.section) ?? 0) + 1);
    }
  }
  const gapsBySection = new Map<string, number>();
  for (const gap of gaps) {
    if (gap.section) gapsBySection.set(gap.section, (gapsBySection.get(gap.section) ?? 0) + 1);
  }

  const sections = [...totalsBySection.entries()];
  if (sections.length === 0) return null;

  return (
    <section aria-labelledby="titan-assessment-results-coverage">
      <h3 id="titan-assessment-results-coverage" className="titan-assessment-results__heading">
        Category coverage
      </h3>
      <ul className="titan-assessment-results__coverage-list">
        {sections.map(([section, total]) => {
          const failed = gapsBySection.get(section) ?? 0;
          const passed = total - failed;
          return (
            <li key={section}>
              <span>{section}</span>
              <span>
                {passed} / {total} controls passing
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function QuestionResponses({
  bank,
  answers,
  gaps,
}: {
  bank: QuestionBank;
  answers: AssessmentRecord["answers"];
  gaps: AssessmentRecord["result"]["gaps"];
}) {
  const failedQuestionIds = new Set(gaps.map((gap) => gap.questionId));

  return (
    <section aria-labelledby="titan-assessment-results-responses">
      <h3 id="titan-assessment-results-responses" className="titan-assessment-results__heading">
        Question responses
      </h3>
      <ul className="titan-assessment-results__responses-list">
        {bank.questions.map((question) => (
          <li key={question.id}>
            <p className="titan-assessment-results__response-question">{question.text}</p>
            <p className="titan-assessment-results__response-answer">
              {formatAnswer(answers[question.id])}
              {isScoredQuestion(question) && answers[question.id] !== undefined && (
                <span
                  className={`titan-assessment-results__response-status titan-assessment-results__response-status--${
                    failedQuestionIds.has(question.id) ? "fail" : "pass"
                  }`}
                >
                  {failedQuestionIds.has(question.id) ? "Gap" : "Pass"}
                </span>
              )}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
