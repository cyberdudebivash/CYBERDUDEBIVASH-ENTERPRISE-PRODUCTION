import { useEffect, useState } from "react";
import { Alert, LoadingSkeleton, MetricCard, Panel } from "@titan/design-system";
import type { AssessmentRecord } from "@titan/platform";
import type { RiskLevel } from "@titan/assessment-core";
import { dpdpV1, isScoredQuestion } from "@titan/assessment-core";
import { ApiError, getJson } from "../../../lib/apiClient.js";
import type { SectionState } from "../dashboard/useDashboardData.js";
import "./ComplianceIntelligencePanel.css";

const RISK_LEVELS: RiskLevel[] = ["critical", "high", "medium", "low"];

/** Section metadata (which DPDP section each scored question belongs to)
 * comes from the static question bank — label lookup only, never a second
 * scoring implementation. Every real pass/fail fact below still comes
 * entirely from each assessment's own server-computed `result.gaps`
 * (Security Release Blocker Sprint: never recomputed client-side). */
const SCORED_QUESTIONS_BY_SECTION = new Map<string, number>();
for (const question of dpdpV1.questions) {
  if (isScoredQuestion(question) && question.section) {
    SCORED_QUESTIONS_BY_SECTION.set(
      question.section,
      (SCORED_QUESTIONS_BY_SECTION.get(question.section) ?? 0) + 1,
    );
  }
}
const SCORED_QUESTIONS_BY_SECTION_TOTAL = [...SCORED_QUESTIONS_BY_SECTION.values()].reduce(
  (sum, count) => sum + count,
  0,
);

function useAllAssessments(): SectionState<AssessmentRecord[]> {
  const [state, setState] = useState<SectionState<AssessmentRecord[]>>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    getJson<AssessmentRecord[]>("/api/assessments")
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 403) {
          setState({ status: "forbidden" });
        } else {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Could not load assessments.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

function countByRiskLevel(assessments: AssessmentRecord[]): Record<RiskLevel, number> {
  const counts: Record<RiskLevel, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const assessment of assessments) counts[assessment.result.riskLevel] += 1;
  return counts;
}

function countByFramework(assessments: AssessmentRecord[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const assessment of assessments) {
    const key = `${assessment.framework} v${assessment.frameworkVersion}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Outstanding findings grouped by their DPDP section, across every
 * assessment at once — real `result.gaps` data, aggregated, not
 * re-derived. Sorted by count so the most common open finding leads. */
function countGapsBySection(assessments: AssessmentRecord[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const assessment of assessments) {
    for (const gap of assessment.result.gaps) {
      if (!gap.section) continue;
      counts.set(gap.section, (counts.get(gap.section) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function monthKey(createdAt: string): string {
  return createdAt.slice(0, 7); // "2026-07-21T..." -> "2026-07"
}

/** Average risk score per calendar month, most recent first — a real trend
 * over `createdAt`/`result.score`, not a fabricated chart. Capped at the 6
 * most recent months so this stays a compact list, not an unbounded one. */
function averageScoreByMonth(assessments: AssessmentRecord[]): Array<[string, number, number]> {
  const buckets = new Map<string, { total: number; count: number }>();
  for (const assessment of assessments) {
    const key = monthKey(assessment.createdAt);
    const bucket = buckets.get(key) ?? { total: 0, count: 0 };
    bucket.total += assessment.result.score;
    bucket.count += 1;
    buckets.set(key, bucket);
  }
  return [...buckets.entries()]
    .map(([month, { total, count }]): [string, number, number] => [
      month,
      Math.round(total / count),
      count,
    ])
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6);
}

/**
 * EAP-3 Workstream 5. Aggregate compliance visualization computed entirely
 * client-side from `GET /api/assessments` (the existing, unfiltered
 * full-list endpoint EAP-1's Dashboard already fetches) — the same
 * "aggregate view over an already-fetched list" pattern DashboardPage's own
 * `RiskBreakdown`/`AuditSummary` establish, not a new server-side
 * aggregation endpoint this scope doesn't justify. Every number here
 * traces to a real, already-server-computed `AssessmentRecord` — no
 * recommendations, no fabricated coverage percentages, no invented
 * taxonomy: "section" is the DPDP question bank's own real field
 * (`@titan/assessment-core`), not a category this view invented.
 */
export function ComplianceIntelligencePanel() {
  const state = useAllAssessments();

  if (state.status === "loading") {
    return <LoadingSkeleton lines={4} label="Loading compliance intelligence…" />;
  }
  if (state.status === "forbidden") {
    return (
      <p className="titan-compliance-intelligence__note">
        Platform Administrator role required to view this.
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <Alert variant="error" title="Could not load compliance intelligence">
        {state.message}
      </Alert>
    );
  }

  return <ComplianceIntelligenceContent assessments={state.data} />;
}

function ComplianceIntelligenceContent({ assessments }: { assessments: AssessmentRecord[] }) {
  if (assessments.length === 0) {
    return (
      <p className="titan-compliance-intelligence__note">
        No assessments yet — compliance intelligence will appear once the first one is recorded.
      </p>
    );
  }

  const riskCounts = countByRiskLevel(assessments);
  const frameworkCounts = countByFramework(assessments);
  const gapsBySection = countGapsBySection(assessments);
  const trend = averageScoreByMonth(assessments);
  const totalFindings = assessments.reduce((sum, a) => sum + a.result.gaps.length, 0);
  const averageScore = Math.round(
    assessments.reduce((sum, a) => sum + a.result.score, 0) / assessments.length,
  );
  const fullyScoredCount = assessments.filter(
    (a) =>
      a.framework === dpdpV1.id &&
      a.frameworkVersion === dpdpV1.version &&
      a.result.scoredQuestionCount === SCORED_QUESTIONS_BY_SECTION_TOTAL,
  ).length;

  return (
    <div className="titan-compliance-intelligence">
      <div className="titan-compliance-intelligence__metrics">
        <MetricCard label="Assessments" value={assessments.length} />
        <MetricCard label="Average risk score" value={`${averageScore} / 100`} />
        <MetricCard label="Outstanding findings" value={totalFindings} />
      </div>

      <div className="titan-compliance-intelligence__grid">
        <Panel title="Risk distribution">
          <ul className="titan-compliance-intelligence__risk-list">
            {RISK_LEVELS.map((level) => (
              <li
                key={level}
                className={`titan-compliance-intelligence__risk-item titan-compliance-intelligence__risk-item--${level}`}
              >
                <span className="titan-compliance-intelligence__risk-label">{level}</span>
                <span className="titan-compliance-intelligence__risk-count">
                  {riskCounts[level]}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Framework status">
          <ul className="titan-compliance-intelligence__list">
            {[...frameworkCounts.entries()].map(([framework, count]) => (
              <li key={framework}>
                <span>{framework}</span>
                <span>{count}</span>
              </li>
            ))}
          </ul>
          <p className="titan-compliance-intelligence__note">
            {fullyScoredCount} of {assessments.length} DPDP assessments scored the full{" "}
            {SCORED_QUESTIONS_BY_SECTION_TOTAL}-question set.
          </p>
        </Panel>

        <Panel title="Outstanding findings by section">
          {gapsBySection.length === 0 ? (
            <p className="titan-compliance-intelligence__note">
              No open findings — every scored control passes across every assessment.
            </p>
          ) : (
            <ul className="titan-compliance-intelligence__list">
              {gapsBySection.map(([section, count]) => (
                <li key={section}>
                  <span>{section}</span>
                  <span>{count}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Risk trend">
          <ul className="titan-compliance-intelligence__list">
            {trend.map(([month, avgScore, count]) => (
              <li key={month}>
                <span>{month}</span>
                <span>
                  {avgScore} / 100 avg ({count} assessment{count === 1 ? "" : "s"})
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
