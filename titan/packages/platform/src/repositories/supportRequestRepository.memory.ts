import type {
  NewSupportRequest,
  SupportRequestPatch,
  SupportRequestRecord,
  SupportRequestRepository,
  SupportRequestSearchOptions,
  SupportRequestSearchResult,
} from "./types.js";

export function createInMemorySupportRequestRepository(): SupportRequestRepository {
  const requests: SupportRequestRecord[] = [];

  return {
    async save(request: NewSupportRequest): Promise<SupportRequestRecord> {
      const record: SupportRequestRecord = {
        id: crypto.randomUUID(),
        status: "open",
        ...request,
      };
      requests.push(record);
      return record;
    },

    async listByUser(userId: string): Promise<SupportRequestRecord[]> {
      return requests
        .filter((request) => request.createdBy === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async findById(id: string): Promise<SupportRequestRecord | null> {
      return requests.find((request) => request.id === id) ?? null;
    },

    async update(id: string, patch: SupportRequestPatch): Promise<SupportRequestRecord | null> {
      const index = requests.findIndex((request) => request.id === id);
      if (index === -1) return null;
      const updated: SupportRequestRecord = { ...requests[index]!, status: patch.status };
      requests[index] = updated;
      return updated;
    },

    async search(options: SupportRequestSearchOptions): Promise<SupportRequestSearchResult> {
      let matched = [...requests];

      if (options.search) {
        const needle = options.search.toLowerCase();
        matched = matched.filter(
          (request) =>
            request.subject.toLowerCase().includes(needle) ||
            request.message.toLowerCase().includes(needle),
        );
      }
      if (options.status) {
        matched = matched.filter((request) => request.status === options.status);
      }
      if (options.organizationId) {
        matched = matched.filter((request) => request.organizationId === options.organizationId);
      }

      // Newest first by default (mirrors LeadRepository.memory.ts's own
      // createdAt-desc default) — applied as the default direction rather
      // than a default sortBy, since this entity has exactly one sortable
      // field.
      const direction = options.sortDirection === "asc" ? 1 : -1;
      matched.sort((a, b) => a.createdAt.localeCompare(b.createdAt) * direction);

      const total = matched.length;
      const page = Math.max(1, options.page ?? 1);
      const pageSize = Math.max(1, options.pageSize ?? 25);
      const start = (page - 1) * pageSize;
      const paged = matched.slice(start, start + pageSize);

      return { requests: paged, total, page, pageSize };
    },
  };
}
