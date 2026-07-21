import { useEffect, useState } from "react";
import { Alert, Button } from "@titan/design-system";
import type { OrganizationPatch, OrganizationRecord } from "@titan/platform";
import "./OrganizationAdministrationPanel.css";

export interface OrganizationAdministrationPanelProps {
  organization: OrganizationRecord;
  isSubmitting: boolean;
  submitError: string | null;
  onUpdate: (patch: OrganizationPatch & { note?: string }) => Promise<void>;
}

/**
 * Metadata editing, archive/restore, and notes — the real write surface of
 * Organization Administration (Workstream 5). Same pattern as
 * `LeadLifecyclePanel`: every control is a direct `PATCH
 * /api/organizations/:id` call (`useOrganizationDetail`'s `update`), never
 * an optimistic local-only update — the panel re-renders from the server's
 * own re-read. Name/industry/region edit on blur (committing only when the
 * field actually changed, same "don't manufacture a no-op audit event"
 * discipline `router.ts`'s `updateOrganization` already applies server-side).
 */
export function OrganizationAdministrationPanel({
  organization,
  isSubmitting,
  submitError,
  onUpdate,
}: OrganizationAdministrationPanelProps) {
  const [name, setName] = useState(organization.name);
  const [industry, setIndustry] = useState(organization.industry ?? "");
  const [region, setRegion] = useState(organization.region ?? "");
  const [tagInput, setTagInput] = useState("");
  const [noteInput, setNoteInput] = useState("");

  // Resyncs the edit buffers only when the *organization itself* changes
  // (React Router reuses this component across a `:id` param change on the
  // same route — a real characteristic, not a hypothetical one), not on
  // every re-render. Keying on `organization.id` rather than `organization`
  // deliberately preserves in-progress typing across a same-organization
  // refetch (e.g. clicking Archive mid-edit shouldn't wipe an unrelated
  // field's unsaved keystrokes).
  useEffect(() => {
    setName(organization.name);
    setIndustry(organization.industry ?? "");
    setRegion(organization.region ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization.id]);

  async function commitName() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== organization.name) await onUpdate({ name: trimmed });
  }

  async function commitIndustry() {
    const trimmed = industry.trim();
    const next = trimmed === "" ? null : trimmed;
    if (next !== organization.industry) await onUpdate({ industry: next });
  }

  async function commitRegion() {
    const trimmed = region.trim();
    const next = trimmed === "" ? null : trimmed;
    if (next !== organization.region) await onUpdate({ region: next });
  }

  async function handleAddTag() {
    const tag = tagInput.trim();
    if (!tag || organization.tags.includes(tag)) return;
    await onUpdate({ tags: [...organization.tags, tag] });
    setTagInput("");
  }

  async function handleRemoveTag(tag: string) {
    await onUpdate({ tags: organization.tags.filter((existing) => existing !== tag) });
  }

  async function handleAddNote() {
    const note = noteInput.trim();
    if (!note) return;
    await onUpdate({ note });
    setNoteInput("");
  }

  const isArchived = organization.status === "archived";

  return (
    <div className="titan-organization-administration">
      {submitError && (
        <Alert variant="error" title="Could not save this change">
          {submitError}
        </Alert>
      )}

      <label className="titan-organization-administration__field">
        <span>Name</span>
        <input
          type="text"
          value={name}
          disabled={isSubmitting}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => void commitName()}
        />
      </label>

      <label className="titan-organization-administration__field">
        <span>Industry</span>
        <input
          type="text"
          value={industry}
          disabled={isSubmitting}
          onChange={(event) => setIndustry(event.target.value)}
          onBlur={() => void commitIndustry()}
        />
      </label>

      <label className="titan-organization-administration__field">
        <span>Region</span>
        <input
          type="text"
          value={region}
          disabled={isSubmitting}
          onChange={(event) => setRegion(event.target.value)}
          onBlur={() => void commitRegion()}
        />
      </label>

      <div className="titan-organization-administration__field">
        <span>Tags</span>
        <ul className="titan-organization-administration__tags">
          {organization.tags.map((tag) => (
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
        <div className="titan-organization-administration__tag-add">
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

      <div className="titan-organization-administration__field">
        <span>Lifecycle</span>
        <div className="titan-organization-administration__lifecycle">
          <span>{isArchived ? "Archived" : "Active"}</span>
          <Button
            variant={isArchived ? "secondary" : "danger"}
            size="sm"
            disabled={isSubmitting}
            onClick={() => onUpdate({ status: isArchived ? "active" : "archived" })}
          >
            {isArchived ? "Restore" : "Archive"}
          </Button>
        </div>
      </div>

      <div className="titan-organization-administration__field">
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
