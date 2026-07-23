import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dpdpV1 } from "@titan/assessment-core";
import type { Answers } from "@titan/assessment-core";
import type { AssessmentRecord, Plan } from "@titan/platform";
import { isSelfServicePlan } from "@titan/platform";
import { Alert, Button, LoadingSkeleton, Panel } from "@titan/design-system";
import type { SectionState } from "../../admin/dashboard/useDashboardData.js";
import { useSession } from "../../admin/auth/SessionContext.js";
import { fetchPlans } from "../../admin/commercial/commercialApi.js";
import { PlanCard } from "../../admin/commercial/PlanCard.js";
import { fetchPortalOrganization } from "../portalApi.js";
import { ProgressBar } from "../../dpdp-assessment/ProgressBar.js";
import { QuestionStep } from "../../dpdp-assessment/QuestionStep.js";
import { RiskResults } from "../../dpdp-assessment/RiskResults.js";
import { buildDpdpReportPdf, reportFileName } from "../../dpdp-assessment/pdfReport.js";
import "../../dpdp-assessment/dpdp-assessment.css";
import { createDpdpScannerOrder, runDpdpScan, verifyDpdpScannerPayment } from "./dpdpScannerApi.js";
import {
  loadRazorpayCheckout,
  openRazorpayCheckout,
  type RazorpaySuccessResponse,
} from "./razorpayCheckout.js";
import { useDpdpScannerAccess } from "./useDpdpScannerAccess.js";
import "./DpdpScannerPage.css";

const questions = dpdpV1.questions;

/**
 * `/portal/dpdp-scanner` — the DPDP Compliance Scanner's own authenticated
 * home. `useDpdpScannerAccess` is the single source of truth for which of
 * the two real states below renders: the Razorpay paywall (no verified
 * payment yet) or the scanner itself (payment verified, subscription
 * active). Nothing here decides access client-side — every route this page
 * calls re-derives and re-checks it server-side (`router.ts`'s
 * `hasVerifiedDpdpScannerAccess`).
 */
export function DpdpScannerPage() {
  const { access, reload } = useDpdpScannerAccess();

  return (
    <div className="titan-dpdp-scanner-page">
      <h1 className="titan-dpdp-scanner-page__title">DPDP Compliance Scanner</h1>
      <AccessGate access={access} reload={reload} />
    </div>
  );
}

function AccessGate({ access, reload }: { access: SectionState<boolean>; reload: () => void }) {
  if (access.status === "loading") {
    return <LoadingSkeleton lines={4} label="Checking your scanner access…" />;
  }
  if (access.status === "forbidden") {
    return <p className="titan-dpdp-scanner-page__note">The scanner is currently unavailable.</p>;
  }
  if (access.status === "error") {
    return (
      <Alert variant="error" title="Could not check your scanner access">
        {access.message}
      </Alert>
    );
  }
  return access.data ? <Scanner /> : <Paywall onUnlocked={reload} />;
}

function Paywall({ onUnlocked }: { onUnlocked: () => void }) {
  const [plans, setPlans] = useState<SectionState<Plan[]>>({ status: "loading" });
  const [submittingPlanId, setSubmittingPlanId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPlans()
      .then((data) => {
        if (!cancelled) setPlans({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPlans({
            status: "error",
            message: error instanceof Error ? error.message : "Could not load plans.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function verifyPayment(response: RazorpaySuccessResponse) {
    try {
      await verifyDpdpScannerPayment(response);
      setSubmittingPlanId(null);
      onUnlocked();
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Payment could not be verified. If you were charged, contact support.",
      );
      setSubmittingPlanId(null);
    }
  }

  async function unlock(plan: Plan) {
    setCheckoutError(null);
    setSubmittingPlanId(plan.id);
    try {
      const order = await createDpdpScannerOrder(plan.id);
      await loadRazorpayCheckout();
      openRazorpayCheckout({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        order_id: order.orderId,
        name: "CYBERDUDEBIVASH",
        description: `${plan.name} — DPDP Compliance Scanner`,
        theme: { color: "#00d4ff" },
        handler: (response) => {
          void verifyPayment(response);
        },
        modal: {
          // The visitor closed the widget without paying — not an error,
          // just back to an unlocked button.
          ondismiss: () => setSubmittingPlanId(null),
        },
      });
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Could not start checkout. Please try again.",
      );
      setSubmittingPlanId(null);
    }
  }

  return (
    <Panel title="Unlock the DPDP Compliance Scanner">
      <p className="titan-dpdp-scanner-paywall__intro">
        The scanner is a premium feature. Choose a plan below to unlock it — checkout is handled by
        Razorpay, and access activates the moment your payment is verified.
      </p>
      {checkoutError && (
        <Alert variant="error" title="Could not complete checkout">
          {checkoutError}
        </Alert>
      )}
      {plans.status === "loading" && <LoadingSkeleton lines={3} label="Loading plans…" />}
      {plans.status === "error" && (
        <Alert variant="error" title="Could not load plans">
          {plans.message}
        </Alert>
      )}
      {plans.status === "ready" && (
        <div className="titan-dpdp-scanner-paywall__plans">
          {plans.data.filter(isSelfServicePlan).map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              disabled={submittingPlanId !== null}
              onSelect={() => void unlock(plan)}
              selectLabel={
                submittingPlanId === plan.id ? "Opening checkout…" : `Unlock with ${plan.name}`
              }
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

type ScanPhase = "intro" | "questions" | "results";

function Scanner() {
  const [phase, setPhase] = useState<ScanPhase>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [saved, setSaved] = useState<AssessmentRecord | null>(null);
  const [isSubmittingScan, setIsSubmittingScan] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const currentQuestion = questions[index];

  function handleAnswerChange(value: string | boolean) {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  }

  function goPrev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  async function goNext() {
    if (index < questions.length - 1) {
      setIndex((i) => i + 1);
      return;
    }
    setScanError(null);
    setIsSubmittingScan(true);
    try {
      const record = await runDpdpScan(answers);
      setSaved(record);
      setPhase("results");
    } catch (error) {
      setScanError(
        error instanceof Error ? error.message : "Could not run your scan. Please try again.",
      );
    } finally {
      setIsSubmittingScan(false);
    }
  }

  function startOver() {
    setIndex(0);
    setAnswers({});
    setSaved(null);
    setScanError(null);
    setPhase("questions");
  }

  const canAdvance = currentQuestion
    ? currentQuestion.type === "text"
      ? typeof answers[currentQuestion.id] === "string" &&
        (answers[currentQuestion.id] as string).trim() !== ""
      : answers[currentQuestion.id] !== undefined
    : false;

  if (phase === "intro") {
    return (
      <Panel title="Start a new scan">
        <div className="titan-dpdp-scanner-intro">
          <p className="titan-dpdp-scanner-page__note">
            Answer {questions.length} questions about your organization&rsquo;s data practices. Your
            risk score, gap analysis, and PDF report are generated instantly and saved to your
            organization&rsquo;s own assessment history.
          </p>
          <Button onClick={() => setPhase("questions")}>Start scan</Button>
        </div>
      </Panel>
    );
  }

  if (phase === "results" && saved) {
    return <ScanResults saved={saved} onRunAnother={startOver} />;
  }

  return (
    <div className="dpdp-scanner-card">
      {scanError && (
        <Alert variant="error" title="Could not run your scan">
          {scanError}
        </Alert>
      )}
      {currentQuestion && (
        <>
          <div className="dpdp-scanner-header">
            <h2>DPDP Compliance Risk Scanner</h2>
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
              disabled={isSubmittingScan}
            >
              Back
            </button>
            <button
              type="button"
              className="dpdp-btn dpdp-btn--primary"
              onClick={() => void goNext()}
              disabled={!canAdvance || isSubmittingScan}
            >
              {isSubmittingScan
                ? "Scoring…"
                : index === questions.length - 1
                  ? "Get My Report"
                  : "Next"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ScanResults({
  saved,
  onRunAnother,
}: {
  saved: AssessmentRecord;
  onRunAnother: () => void;
}) {
  const session = useSession();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPortalOrganization()
      .then((organization) => {
        if (!cancelled) setOrganizationName(organization.name);
      })
      .catch(() => {
        // Non-critical — downloadPdf() below falls back to a generic label.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function downloadPdf() {
    setPdfError(null);
    setIsDownloading(true);
    try {
      const email = session.status === "authenticated" ? (session.me.email ?? "") : "";
      const company = organizationName ?? "Your organization";
      const doc = await buildDpdpReportPdf({
        name: email || "Compliance Team",
        email,
        company,
        result: saved.result,
      });
      doc.save(reportFileName(company));
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : "Could not generate the PDF report.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <>
      <RiskResults result={saved.result} />
      <div className="titan-dpdp-scanner-page__actions">
        <Button onClick={() => void downloadPdf()} isLoading={isDownloading}>
          Download PDF report
        </Button>
        <Button variant="ghost" onClick={onRunAnother}>
          Run another scan
        </Button>
      </div>
      {pdfError && <p className="titan-dpdp-scanner-page__pdf-error">{pdfError}</p>}
      <p className="titan-dpdp-scanner-page__note">
        <Link to={`/portal/assessments/${saved.id}`}>View saved result</Link>
        {" · "}
        <Link to="/portal/assessments">View full history</Link>
      </p>
    </>
  );
}
