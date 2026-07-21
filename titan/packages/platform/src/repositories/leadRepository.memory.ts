import type {
  LeadLifecyclePatch,
  LeadRecord,
  LeadRepository,
  LeadSearchOptions,
  LeadSearchResult,
  NewLead,
} from "./types.js";

/**
 * In-process implementation — what titan/apps/web's leadStore.ts approximates
 * today with localStorage, and what this package's own tests run against
 * directly. Also a reasonable default for local `wrangler dev` without a real D1
 * binding, once this Worker is actually run that way (Stage 4).
 */
export function createInMemoryLeadRepository(): LeadRepository {
  const leads: LeadRecord[] = [];

  return {
    async save(lead: NewLead): Promise<LeadRecord> {
      const record: LeadRecord = {
        id: crypto.randomUUID(),
        organizationId: lead.organizationId ?? null,
        assessmentId: lead.assessmentId ?? null,
        status: lead.status ?? "new",
        priority: lead.priority ?? "medium",
        assignedTo: lead.assignedTo ?? null,
        tags: lead.tags ?? [],
        ...lead,
      };
      leads.push(record);
      return record;
    },

    async list(): Promise<LeadRecord[]> {
      return [...leads].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    },

    async findById(id: string): Promise<LeadRecord | null> {
      return leads.find((lead) => lead.id === id) ?? null;
    },

    async update(id: string, patch: LeadLifecyclePatch): Promise<LeadRecord | null> {
      const index = leads.findIndex((lead) => lead.id === id);
      if (index === -1) return null;
      const current = leads[index]!;
      const updated: LeadRecord = {
        ...current,
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
        ...(patch.assignedTo !== undefined ? { assignedTo: patch.assignedTo } : {}),
        ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
      };
      leads[index] = updated;
      return updated;
    },

    async search(options: LeadSearchOptions): Promise<LeadSearchResult> {
      let matched = [...leads];

      if (options.search) {
        const needle = options.search.toLowerCase();
        matched = matched.filter(
          (lead) =>
            lead.name.toLowerCase().includes(needle) ||
            lead.email.toLowerCase().includes(needle) ||
            lead.company.toLowerCase().includes(needle),
        );
      }
      if (options.status) {
        matched = matched.filter((lead) => lead.status === options.status);
      }
      if (options.priority) {
        matched = matched.filter((lead) => lead.priority === options.priority);
      }
      if (options.assignedTo) {
        matched =
          options.assignedTo === "unassigned"
            ? matched.filter((lead) => lead.assignedTo === null)
            : matched.filter((lead) => lead.assignedTo === options.assignedTo);
      }
      if (options.assessmentId) {
        matched = matched.filter((lead) => lead.assessmentId === options.assessmentId);
      }

      const direction = options.sortDirection === "asc" ? 1 : -1;
      const sortBy = options.sortBy ?? "createdAt";
      matched.sort((a, b) => {
        const left = sortKey(a, sortBy);
        const right = sortKey(b, sortBy);
        if (left < right) return -1 * direction;
        if (left > right) return 1 * direction;
        return 0;
      });

      const total = matched.length;
      const page = Math.max(1, options.page ?? 1);
      const pageSize = Math.max(1, options.pageSize ?? 25);
      const start = (page - 1) * pageSize;
      const paged = matched.slice(start, start + pageSize);

      return { leads: paged, total, page, pageSize };
    },
  };
}

function sortKey(
  lead: LeadRecord,
  sortBy: NonNullable<LeadSearchOptions["sortBy"]>,
): string | number {
  switch (sortBy) {
    case "createdAt":
      return lead.timestamp;
    case "name":
      return lead.name.toLowerCase();
    case "company":
      return lead.company.toLowerCase();
    case "riskScore":
      return lead.result.score;
    case "status":
      return lead.status;
    case "priority":
      return lead.priority;
  }
}
