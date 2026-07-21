import type { AssessmentRecord, LeadRecord } from "@titan/platform";
import type { RiskLevel } from "@titan/assessment-core";
import { RiskBadge } from "./RiskBadge.js";
import "./LeadRiskPanel.css";

const SEVERITY_ORDER: RiskLevel[] = ["critical", "high", "medium", "low"];

export interface LeadRiskPanelProps {
  lead: LeadRecord;
  linkedAssessment?: AssessmentRecord;
}

/**
 * Risk classification, findings by severity, and framework version — all
 * derived from `lead.result`/`lead.answers` (the server-recomputed
 * assessment result already on the record, Security Release Blocker
 * Sprint) or, when the lead links to a real standalone assessment, that
 * record's own `framework`/`frameworkVersion`. No separate "recommendation
 * engine" exists in this codebase yet (that's Module 4/5, ROADMAP.md's
 * Phase 2/3) — each finding shows the real gap data the risk engine
 * already computed (`@titan/assessment-core`'s `Gap`: the failed question,
 * its penalty, its section) rather than fabricating advisory text on top
 * of it.
 */
export function LeadRiskPanel({ lead, linkedAssessment }: LeadRiskPanelProps) {
  const { result } = lead;
  const gapsBySeverity = SEVERITY_ORDER.map((level) => ({
    level,
    gaps: result.gaps.filter((gap) => gap.level === level),
  })).filter((group) => group.gaps.length > 0);

  return (
    <div className="titan-lead-risk">
      <div className="titan-lead-risk__summary">
        <RiskBadge riskLevel={result.riskLevel} />
        <span className="titan-lead-risk__score">{result.score} / 100</span>
        <span className="titan-lead-risk__framework">
          {linkedAssessment
            ? `${linkedAssessment.framework} v${linkedAssessment.frameworkVersion}`
            : "DPDP v1.0.0"}
        </span>
      </div>

      <dl className="titan-lead-risk__breakdown">
        {SEVERITY_ORDER.map((level) => (
          <div
            key={level}
            className={`titan-lead-risk__breakdown-item titan-lead-risk__breakdown-item--${level}`}
          >
            <dt>{level}</dt>
            <dd>{result.breakdown[level]}</dd>
          </div>
        ))}
      </dl>

      {gapsBySeverity.length === 0 ? (
        <p className="titan-lead-risk__note">No gaps found — every scored control passed.</p>
      ) : (
        gapsBySeverity.map((group) => (
          <div key={group.level} className="titan-lead-risk__findings-group">
            <h3 className="titan-lead-risk__findings-heading">
              {group.level} findings ({group.gaps.length})
            </h3>
            <ul className="titan-lead-risk__findings-list">
              {group.gaps.map((gap) => (
                <li key={gap.questionId}>
                  <p className="titan-lead-risk__finding-question">{gap.question}</p>
                  {gap.penalty && <p className="titan-lead-risk__finding-penalty">{gap.penalty}</p>}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
