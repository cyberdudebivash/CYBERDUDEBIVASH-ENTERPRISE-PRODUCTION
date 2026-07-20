import { useState } from "react";
import type { FormEvent } from "react";
import type { Answers, AssessmentResult } from "@titan/assessment-core";
import { ApiError, isValidEmail, submitLead } from "./leadStore.js";
import { buildDpdpReportPdf, reportFileName } from "./pdfReport.js";

export interface LeadCaptureFormProps {
  answers: Answers;
  result: AssessmentResult;
}

type Status = "idle" | "submitting" | "sent" | "error";

// Discovery (ARCHITECTURE.md) found the original validated email with
// `includes("@") && includes(".")` (accepts "@.") and reported errors via blocking
// `alert()` popups. This uses a real format check (leadStore.ts) and inline,
// AT-announced (role="alert") error text instead.
export function LeadCaptureForm({ answers, result }: LeadCaptureFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedCompany = company.trim();

    if (!trimmedName || !trimmedCompany) {
      setError("Please fill in all fields to receive your report.");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    setStatus("submitting");

    try {
      await submitLead({
        name: trimmedName,
        email: trimmedEmail,
        company: trimmedCompany,
        answers,
        result,
        timestamp: new Date().toISOString(),
        source: "dpdp-scan",
      });

      const doc = await buildDpdpReportPdf({
        name: trimmedName,
        email: trimmedEmail,
        company: trimmedCompany,
        result,
      });
      doc.save(reportFileName(trimmedCompany));

      setStatus("sent");
    } catch (submitError) {
      setStatus("error");
      // ApiError's message already distinguishes "couldn't reach the server"
      // from "the server rejected the request" (apiClient.ts) — surface it
      // instead of a single generic string, so a network outage doesn't read
      // the same as a validation bug. The form itself isn't cleared and the
      // submit button re-enables, so resubmitting is just clicking Send again.
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : "Something went wrong sending your report. Please try again.",
      );
    }
  }

  if (status === "sent") {
    return (
      <div className="dpdp-lead-capture dpdp-lead-capture--sent">
        <h3>Report sent</h3>
        <p>
          Your detailed DPDP Risk Report has been downloaded. We&rsquo;ll also follow up at{" "}
          <strong>{email.trim()}</strong> within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <div className="dpdp-lead-capture">
      <h3>Get your full report via email</h3>
      <p>
        Download a detailed PDF with remediation steps, DPDP section references, and penalty
        exposure for each gap.
      </p>
      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        <div className="dpdp-form-group">
          <label htmlFor="dpdp-lead-name" className="dpdp-sr-only">
            Full name
          </label>
          <input
            id="dpdp-lead-name"
            className="dpdp-form-input"
            placeholder="Full Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <label htmlFor="dpdp-lead-email" className="dpdp-sr-only">
            Work email
          </label>
          <input
            id="dpdp-lead-email"
            type="email"
            className="dpdp-form-input"
            placeholder="Work Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label htmlFor="dpdp-lead-company" className="dpdp-sr-only">
            Company name
          </label>
          <input
            id="dpdp-lead-company"
            className="dpdp-form-input"
            placeholder="Company Name"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            required
          />
        </div>

        {error && (
          <p role="alert" className="dpdp-form-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="dpdp-btn dpdp-btn--primary"
          disabled={status === "submitting"}
        >
          {status === "submitting" ? "Sending..." : "Send My Report"}
        </button>

        <p className="dpdp-lead-capture__privacy">
          We respect your privacy. No spam, ever. Unsubscribe anytime.
        </p>
      </form>
    </div>
  );
}
