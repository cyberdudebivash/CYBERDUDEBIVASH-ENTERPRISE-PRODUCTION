import { useState, type FormEvent } from "react";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  LoadingSkeleton,
  Panel,
  Timeline,
  type TimelineEntry,
} from "@titan/design-system";
import { usePortalSupport } from "./usePortalSupport.js";
import "./PortalSupportPage.css";

/**
 * Support Requests — a real, small write surface: submit a request, see
 * your own request history and its status. No ticketing platform: no
 * admin-side queue/assignment/resolution UI (`Do NOT implement:
 * Administration Console`), and every request's status reads "Open"
 * because there is no other status any request can reach yet
 * (`repositories/types.ts`'s own `SupportRequestStatus` comment) — stated
 * plainly rather than a fabricated in-progress/resolved workflow with
 * nothing driving the transitions.
 */
export function PortalSupportPage() {
  const { requests, isSubmitting, submitError, submit } = usePortalSupport();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [justSubmitted, setJustSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setJustSubmitted(false);
    const ok = await submit({ subject, message });
    if (ok) {
      setSubject("");
      setMessage("");
      setJustSubmitted(true);
    }
  }

  return (
    <div className="titan-portal-support">
      <h1 className="titan-portal-support__title">Support</h1>

      <Panel title="Submit a request">
        <form className="titan-portal-support__form" onSubmit={handleSubmit}>
          <label className="titan-portal-support__field">
            Subject
            <input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              required
            />
          </label>
          <label className="titan-portal-support__field">
            Message
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              required
            />
          </label>
          {submitError && (
            <Alert variant="error" title="Could not submit your request">
              {submitError}
            </Alert>
          )}
          {justSubmitted && (
            <Alert variant="success" title="Request submitted">
              We&apos;ve received your request and will be in touch.
            </Alert>
          )}
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Submit request
          </Button>
        </form>
      </Panel>

      <Panel title="Request history">
        <RequestHistory state={requests} />
      </Panel>
    </div>
  );
}

function RequestHistory({ state }: { state: ReturnType<typeof usePortalSupport>["requests"] }) {
  switch (state.status) {
    case "loading":
      return <LoadingSkeleton lines={3} label="Loading your requests…" />;
    case "forbidden":
      return (
        <p className="titan-portal-support__note">Support requests are currently unavailable.</p>
      );
    case "error":
      return (
        <Alert variant="error" title="Could not load your requests">
          {state.message}
        </Alert>
      );
    case "ready": {
      if (state.data.length === 0) {
        return (
          <EmptyState
            title="No requests yet"
            description="Submit a request above and it will show up here."
          />
        );
      }
      const entries: TimelineEntry[] = state.data.map((request) => ({
        id: request.id,
        label: (
          <>
            {request.subject} <Badge tone="info">{request.status}</Badge>
          </>
        ),
        detail: request.message,
        timestamp: new Date(request.createdAt).toLocaleString(),
      }));
      return <Timeline entries={entries} />;
    }
  }
}
