import { useEffect, useState } from "react";
import type { AssessmentResult } from "@titan/assessment-core";

export interface RiskResultsProps {
  result: AssessmentResult;
}

const RISK_LABEL: Record<AssessmentResult["riskLevel"], string> = {
  low: "LOW RISK",
  medium: "MEDIUM RISK",
  high: "HIGH RISK",
  critical: "CRITICAL RISK",
};

const CIRCUMFERENCE = 2 * Math.PI * 85;

const UPSELL_TIERS = [
  {
    name: "Gap Analysis Lite",
    price: "Rs. 4,999",
    cadence: "One-time - 24h delivery",
    featured: false,
    features: [
      "20-point DPDP Checklist (PDF)",
      "30-min 1:1 Expert Call",
      "Personalized Priority Actions",
      "Email Support (7 days)",
    ],
  },
  {
    name: "Gap Analysis Pro",
    price: "Rs. 24,999",
    cadence: "One-time - 72h delivery",
    featured: true,
    features: [
      "Everything in Lite, plus:",
      "Full 50-page Risk Report",
      "Data Flow Mapping",
      "30-60-90 Day Remediation Roadmap",
      "Investor-Ready Documentation",
      "Priority Support (30 days)",
    ],
  },
  {
    name: "Compliance Package",
    price: "Rs. 49,999",
    cadence: "One-time - 2 weeks",
    featured: false,
    features: [
      "Everything in Pro, plus:",
      "Full Remediation Support",
      "DPO Appointment Guidance",
      "Vendor DPA Templates",
      "Breach Response Playbook",
      "Quarterly Review (1 year)",
    ],
  },
] as const;

export function RiskResults({ result }: RiskResultsProps) {
  const animatedScore = useAnimatedNumber(result.score);
  const offset = CIRCUMFERENCE - (result.score / 100) * CIRCUMFERENCE;

  return (
    <div className="dpdp-results">
      <div className="dpdp-risk-meter">
        <svg
          aria-hidden="true"
          width="200"
          height="200"
          viewBox="0 0 200 200"
          className="dpdp-risk-meter__ring"
        >
          <circle
            cx="100"
            cy="100"
            r="85"
            fill="none"
            className="dpdp-risk-meter__track"
            strokeWidth="12"
          />
          <circle
            cx="100"
            cy="100"
            r="85"
            fill="none"
            className={`dpdp-risk-meter__fill dpdp-risk-meter__fill--${result.riskLevel}`}
            strokeWidth="12"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
          />
        </svg>
        <div className="dpdp-risk-meter__value" aria-hidden="true">
          {animatedScore}
        </div>
        {/* The animated number above is decorative — this static text is what
            assistive tech actually gets, so it isn't read mid-animation. */}
        <p className="dpdp-sr-only">
          Risk score: {result.score} out of 100, {RISK_LABEL[result.riskLevel]}.
        </p>
        <p className={`dpdp-risk-meter__label dpdp-risk-meter__label--${result.riskLevel}`}>
          {RISK_LABEL[result.riskLevel]}
        </p>
      </div>

      <div className="dpdp-breakdown">
        <BreakdownItem label="Critical Gaps" value={result.breakdown.critical} level="critical" />
        <BreakdownItem label="High Risk" value={result.breakdown.high} level="high" />
        <BreakdownItem label="Medium Risk" value={result.breakdown.medium} level="medium" />
        <BreakdownItem label="Compliant Areas" value={result.breakdown.low} level="low" />
      </div>

      <div className="dpdp-gaps">
        {result.gaps.length > 0 ? (
          <>
            <h3>Identified Compliance Gaps ({result.gaps.length})</h3>
            <ul className="dpdp-gaps__list">
              {result.gaps.map((gap, i) => (
                <li key={gap.questionId} className="dpdp-gap">
                  <div className="dpdp-gap__icon" aria-hidden="true">
                    {i + 1}
                  </div>
                  <div>
                    <h4>{gap.question}</h4>
                    <p>
                      {gap.section ?? "DPDP Act 2023"} - this gap exposes your organization to
                      regulatory penalties and reputational risk.
                    </p>
                    {gap.penalty && (
                      <p className="dpdp-gap__penalty">Maximum penalty: {gap.penalty}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="dpdp-gaps__none">
            <h3>No critical gaps found against the questions answered</h3>
            <p>We still recommend a professional review to catch edge cases.</p>
          </div>
        )}
      </div>

      {/* PRODUCT_VISION.md: "not a compliance guarantee... must appear on every
          results page... as a stated fact of what the product is" — Discovery
          found the original's on-screen results card had no such text at all. */}
      <p className="dpdp-disclaimer">
        This is an automated, self-reported risk indicator based on the answers given above — not a
        compliance certification and not legal advice. A low-risk result does not mean your
        organization is DPDPA-compliant. For definitive guidance, consult a qualified DPDP legal
        expert.
      </p>

      <div className="dpdp-section-divider" />

      <div className="dpdp-upsell-intro">
        <h3>Ready to fix your gaps?</h3>
        <p>Professional DPDP compliance services tailored for Indian startups</p>
      </div>
      <div className="dpdp-upsell-grid">
        {UPSELL_TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`dpdp-upsell-card ${tier.featured ? "dpdp-upsell-card--featured" : ""}`}
          >
            {tier.featured && <div className="dpdp-upsell-card__badge">Most popular</div>}
            <div className="dpdp-upsell-card__name">{tier.name}</div>
            <div className="dpdp-upsell-card__price">{tier.price}</div>
            <div className="dpdp-upsell-card__cadence">{tier.cadence}</div>
            <ul className="dpdp-upsell-card__features">
              {tier.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function BreakdownItem({
  label,
  value,
  level,
}: {
  label: string;
  value: number;
  level: AssessmentResult["riskLevel"];
}) {
  return (
    <div className={`dpdp-breakdown__item dpdp-breakdown__item--${level}`}>
      <div className="dpdp-breakdown__label">{label}</div>
      <div className="dpdp-breakdown__value">{value}</div>
    </div>
  );
}

/** Mirrors the original's step-by-2-every-30ms count-up, cleaned up on unmount. */
function useAnimatedNumber(target: number): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    setValue(0);
    if (target <= 0) return;

    let current = 0;
    const id = window.setInterval(() => {
      current = Math.min(current + 2, target);
      setValue(current);
      if (current >= target) {
        window.clearInterval(id);
      }
    }, 30);

    return () => window.clearInterval(id);
  }, [target]);

  return value;
}
