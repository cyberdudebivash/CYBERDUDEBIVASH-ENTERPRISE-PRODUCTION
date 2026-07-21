import { useState } from "react";
import { Alert, Button } from "@titan/design-system";
import { LEAD_PRIORITIES, LEAD_STATUSES } from "@titan/platform";
import type { LeadLifecyclePatch, LeadPriority, LeadRecord, LeadStatus } from "@titan/platform";
import type { MeResponse } from "../auth/session.js";
import "./LeadLifecyclePanel.css";

export interface LeadLifecyclePanelProps {
  lead: LeadRecord;
  me: MeResponse;
  isSubmitting: boolean;
  submitError: string | null;
  onUpdate: (patch: LeadLifecyclePatch & { note?: string }) => Promise<void>;
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  disqualified: "Disqualified",
  converted: "Converted",
};

const PRIORITY_LABELS: Record<LeadPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

/**
 * Status/priority/assignment/tags/notes — the real write surface of the
 * Lead Intelligence Platform (Workstream 3). Every control here is a
 * direct `PATCH /api/leads/:id` call (`useLeadDetail`'s `onUpdate`), never
 * an optimistic local-only update — the panel re-renders from the server's
 * own re-read, matching this codebase's "trust the server, not the
 * mutation response" caution elsewhere (DECISION_LOG.md). Assignment is
 * deliberately "assign to me" / "unassign" only, not a picker over all
 * users — there is no user directory yet (User Management is a later EAP
 * phase, ROADMAP.md), and fabricating a picker over data this app can't
 * actually list would be worse than the honestly narrower control.
 */
export function LeadLifecyclePanel({
  lead,
  me,
  isSubmitting,
  submitError,
  onUpdate,
}: LeadLifecyclePanelProps) {
  const [tagInput, setTagInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const isAssignedToMe = lead.assignedTo === me.userId;

  async function handleAddTag() {
    const tag = tagInput.trim();
    if (!tag || lead.tags.includes(tag)) return;
    await onUpdate({ tags: [...lead.tags, tag] });
    setTagInput("");
  }

  async function handleRemoveTag(tag: string) {
    await onUpdate({ tags: lead.tags.filter((existing) => existing !== tag) });
  }

  async function handleAddNote() {
    const note = noteInput.trim();
    if (!note) return;
    await onUpdate({ note });
    setNoteInput("");
  }

  return (
    <div className="titan-lead-lifecycle">
      {submitError && (
        <Alert variant="error" title="Could not save this change">
          {submitError}
        </Alert>
      )}

      <label className="titan-lead-lifecycle__field">
        <span>Status</span>
        <select
          value={lead.status}
          disabled={isSubmitting}
          onChange={(event) => onUpdate({ status: event.target.value as LeadStatus })}
        >
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>

      <label className="titan-lead-lifecycle__field">
        <span>Priority</span>
        <select
          value={lead.priority}
          disabled={isSubmitting}
          onChange={(event) => onUpdate({ priority: event.target.value as LeadPriority })}
        >
          {LEAD_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </select>
      </label>

      <div className="titan-lead-lifecycle__field">
        <span>Assigned to</span>
        <div className="titan-lead-lifecycle__assignment">
          <span>{lead.assignedTo ? (isAssignedToMe ? "Me" : lead.assignedTo) : "Unassigned"}</span>
          {/* A Platform Administrator has authority over every lead, not
              just their own assignments, so both actions can apply at
              once: assigned-to-someone-else shows "Assign to me" (take it
              over) *and* "Unassign" (clear it) — not an either/or based on
              whether the current assignee happens to be the caller. */}
          {!isAssignedToMe && (
            <Button
              variant="ghost"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onUpdate({ assignedTo: me.userId })}
            >
              Assign to me
            </Button>
          )}
          {lead.assignedTo && (
            <Button
              variant="ghost"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onUpdate({ assignedTo: null })}
            >
              Unassign
            </Button>
          )}
        </div>
      </div>

      <div className="titan-lead-lifecycle__field">
        <span>Tags</span>
        <ul className="titan-lead-lifecycle__tags">
          {lead.tags.map((tag) => (
            <li key={tag}>
              {tag}
              <button
                type="button"
                aria-label={`Remove tag ${tag}`}
                disabled={isSubmitting}
                onClick={() => handleRemoveTag(tag)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="titan-lead-lifecycle__tag-add">
          <input
            type="text"
            aria-label="Add a tag"
            value={tagInput}
            disabled={isSubmitting}
            onChange={(event) => setTagInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleAddTag();
              }
            }}
          />
          <Button size="sm" disabled={isSubmitting || !tagInput.trim()} onClick={handleAddTag}>
            Add tag
          </Button>
        </div>
      </div>

      <div className="titan-lead-lifecycle__field">
        <span>Internal notes</span>
        <textarea
          aria-label="Add an internal note"
          value={noteInput}
          disabled={isSubmitting}
          onChange={(event) => setNoteInput(event.target.value)}
          placeholder="Add a note for the team…"
        />
        <Button size="sm" disabled={isSubmitting || !noteInput.trim()} onClick={handleAddNote}>
          Add note
        </Button>
      </div>
    </div>
  );
}
