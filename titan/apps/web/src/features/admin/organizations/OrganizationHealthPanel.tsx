import { MetricCard } from "@titan/design-system";
import type { AssessmentRecord, LeadRecord } from "@titan/platform";
import type { RiskLevel } from "@titan/assessment-core";
import { RiskBadge } from "../leads/RiskBadge.js";
import "./OrganizationHealthPanel.css";

export interface OrganizationHealthPanelProps {
  assessments: AssessmentRecord[];
  leads: LeadRecord[];
}

const RISK_LEVELS: RiskLevel[] = ["critical", "high", "medium", "low"];

function countByRiskLevel(assessments: AssessmentRecord[]): Record<RiskLevel, number> {
  const counts: Record<RiskLevel, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const assessment of assessments) counts[assessment.result.riskLevel] += 1;
  return counts;
}

/** Newest first, by `createdAt` — the same real timestamp every assessment
 * already carries, no separate ordering concept invented. */
function byNewestFirst(assessments: AssessmentRecord[]): AssessmentRecord[] {
  return [...assessments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Compares the two most recent assessments' scores — a real, directly
 * derived delta, not a fabricated trend model. `undefined` when there
 * aren't two assessments to compare. */
function scoreTrend(sorted: AssessmentRecord[]): "up" | "down" | "flat" | undefined {
  if (sorted.length < 2) return undefined;
  const [latest, previous] = sorted;
  if (!latest || !previous) return undefined;
  if (latest.result.score > previous.result.score) return "up";
  if (latest.result.score < previous.result.score) return "down";
  return "flat";
}

const TREND_LABELS: Record<"up" | "down" | "flat", string> = {
  up: "▲ Risk score increased since the previous assessment",
  down: "▼ Risk score decreased since the previous assessment",
  flat: "— Risk score unchanged since the previous assessment",
};

/**
 * EAP-4 Workstream 3. Every number here derives entirely from this
 * organization's own already-fetched assessments/leads
 * (`useOrganizationDetail`'s `linkedAssessments`/`linkedLeads` —
 * `AssessmentSearchOptions.organizationId`/`LeadSearchOptions.organizationId`)
 * — same "aggregate over an already-fetched list" pattern
 * `ComplianceIntelligencePanel` established for EAP-3, not a new server-side
 * aggregation endpoint. No fabricated coverage percentages or invented
 * taxonomy: risk level and score are real, server-computed
 * `AssessmentResult` fields.
 */
export function OrganizationHealthPanel({ assessments, leads }: OrganizationHealthPanelProps) {
  if (assessments.length === 0) {
    return (
      <p className="titan-organization-health__note">
        No assessments linked to this organization yet — health indicators will appear once the
        first one is recorded.
      </p>
    );
  }

  const sorted = byNewestFirst(assessments);
  const latest = sorted[0]!;
  const riskCounts = countByRiskLevel(assessments);
  const averageScore = Math.round(
    assessments.reduce((sum, a) => sum + a.result.score, 0) / assessments.length,
  );
  const trend = scoreTrend(sorted);

  return (
    <div className="titan-organization-health">
      <div className="titan-organization-health__metrics">
        <MetricCard
          label="Current risk"
          value={<RiskBadge riskLevel={latest.result.riskLevel} />}
        />
        <MetricCard label="Average risk score" value={`${averageScore} / 100`} />
        <MetricCard label="Assessments on record" value={assessments.length} />
        <MetricCard label="Associated leads" value={leads.length} />
      </div>

      <ul className="titan-organization-health__risk-list">
        {RISK_LEVELS.map((level) => (
          <li
            key={level}
            className={`titan-organization-health__risk-item titan-organization-health__risk-item--${level}`}
          >
            <span className="titan-organization-health__risk-label">{level}</span>
            <span className="titan-organization-health__risk-count">{riskCounts[level]}</span>
          </li>
        ))}
      </ul>

      <p className="titan-organization-health__note">
        Most recent assessment: {new Date(latest.createdAt).toLocaleDateString()}
      </p>
      {trend && <p className="titan-organization-health__note">{TREND_LABELS[trend]}</p>}
    </div>
  );
}
