import { useEffect, useState } from "react";
import { dpdpV1, scoreAssessment } from "@titan/assessment-core";
import type { Answers, AssessmentResult } from "@titan/assessment-core";
import { Particles } from "./Particles.js";
import { ProgressBar } from "./ProgressBar.js";
import { QuestionStep } from "./QuestionStep.js";
import { RiskResults } from "./RiskResults.js";
import { LeadCaptureForm } from "./LeadCaptureForm.js";
import "./dpdp-assessment.css";

type Phase = "landing" | "questions" | "loading" | "results";

/** Purely cosmetic — scoring itself is instant. Matches the original's perceived-
 * value framing ("Analyzing...") rather than showing a result the instant the
 * last question is answered. */
const ANALYSIS_DELAY_MS = 2000;

const questions = dpdpV1.questions;

// Workstream 1-3: this page is the only thing standing between a person and the
// DPDP scan. It owns no question data and no scoring logic of its own — both come
// from @titan/assessment-core, so there is exactly one place either can be wrong.
export function DpdpAssessmentPage() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);

  const currentQuestion = questions[index];

  useEffect(() => {
    if (phase !== "loading") return;
    const id = window.setTimeout(() => setPhase("results"), ANALYSIS_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  function handleAnswerChange(value: string | boolean) {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  }

  function goNext() {
    if (index < questions.length - 1) {
      setIndex((i) => i + 1);
      return;
    }
    setResult(scoreAssessment(questions, answers));
    setPhase("loading");
  }

  function goPrev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  const canAdvance = currentQuestion
    ? currentQuestion.type === "text"
      ? typeof answers[currentQuestion.id] === "string" &&
        (answers[currentQuestion.id] as string).trim() !== ""
      : answers[currentQuestion.id] !== undefined
    : false;

  return (
    <div className="dpdp-root">
      <Particles />
      <div className="dpdp-container">
        <header className="dpdp-header">
          <a href="https://cyberdudebivash.in" className="dpdp-logo">
            <span className="dpdp-logo__icon" aria-hidden="true">
              C
            </span>
            <span className="dpdp-logo__text">
              CYBERDUDE<span className="dpdp-logo__accent">BIVASH</span>
            </span>
          </a>
          <div className="dpdp-header-badge">
            <span className="dpdp-header-badge__pulse" aria-hidden="true" />
            Sentinel APEX v184.0 Active
          </div>
        </header>

        <main>
          {phase === "landing" && (
            <section className="dpdp-hero" aria-labelledby="dpdp-hero-heading">
              <p className="dpdp-hero-badge">DPDP Act 2023 Compliant Scan</p>
              <h1 id="dpdp-hero-heading">
                Is Your Startup <span className="dpdp-gradient">DPDP-Compliant?</span>
              </h1>
              <p className="dpdp-hero-subtitle">
                The DPDP Act 2023 deadline is <strong>May 2027</strong>. Penalties go up to{" "}
                <strong className="dpdp-danger-text">₹250 crore</strong>. Find your compliance gaps
                in 5 minutes — free, instant, no spam.
              </p>
              <div className="dpdp-hero-stats">
                <div className="dpdp-stat">
                  <div className="dpdp-stat__value">5 min</div>
                  <div className="dpdp-stat__label">Duration</div>
                </div>
                <div className="dpdp-stat">
                  <div className="dpdp-stat__value">{questions.length}</div>
                  <div className="dpdp-stat__label">Questions</div>
                </div>
                <div className="dpdp-stat">
                  <div className="dpdp-stat__value">100%</div>
                  <div className="dpdp-stat__label">Free</div>
                </div>
              </div>
              <button
                type="button"
                className="dpdp-cta-button"
                onClick={() => setPhase("questions")}
              >
                Start Free Risk Scan
              </button>
              {/* "No Data Stored" (the original's badge here) was contradicted by
                the lead-capture step storing exactly that — Discovery,
                ARCHITECTURE.md. This describes what the scoring step itself
                actually does, which stays true regardless of what happens later. */}
              <div className="dpdp-trust-badges">
                <span>Scored Instantly In Your Browser</span>
                <span>Enterprise-Grade Security</span>
                <span>Instant PDF Report</span>
              </div>
            </section>
          )}

          {phase === "questions" && currentQuestion && (
            <div className="dpdp-scanner-card">
              <div className="dpdp-scanner-header">
                <h2>DPDP Compliance Risk Scanner</h2>
                <p>
                  Answer {questions.length} questions about your data practices. Get your
                  personalized risk report instantly.
                </p>
              </div>
              <ProgressBar current={index + 1} total={questions.length} />
              <QuestionStep
                question={currentQuestion}
                position={index + 1}
                value={answers[currentQuestion.id]}
                onChange={handleAnswerChange}
              />
              <div className="dpdp-nav-buttons">
                <button
                  type="button"
                  className="dpdp-btn dpdp-btn--secondary"
                  onClick={goPrev}
                  style={{ visibility: index === 0 ? "hidden" : "visible" }}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="dpdp-btn dpdp-btn--primary"
                  onClick={goNext}
                  disabled={!canAdvance}
                >
                  {index === questions.length - 1 ? "Get My Report" : "Next"}
                </button>
              </div>
            </div>
          )}

          {phase === "loading" && (
            <div className="dpdp-loading" role="status">
              <span className="dpdp-spinner" aria-hidden="true" />
              <p>Analyzing your compliance posture...</p>
              <p className="dpdp-loading__subtext">
                Cross-referencing against DPDP Act 2023 sections
              </p>
            </div>
          )}

          {phase === "results" && result && (
            <>
              <RiskResults result={result} />
              <LeadCaptureForm answers={answers} result={result} />
            </>
          )}
        </main>

        <footer className="dpdp-footer">
          <p>© 2026 CYBERDUDEBIVASH® Private Limited. All rights reserved.</p>
          <p>GSTIN: 21ARKPN8270G1ZP | PAN: ARKPN8270G</p>
          <p>
            <a href="https://cyberdudebivash.in">Home</a> ·{" "}
            <a href="https://cyberdudebivash.in/privacy">Privacy</a> ·{" "}
            <a href="https://cyberdudebivash.in/terms">Terms</a> ·{" "}
            <a href="mailto:contact@cyberdudebivash.in">Contact</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
