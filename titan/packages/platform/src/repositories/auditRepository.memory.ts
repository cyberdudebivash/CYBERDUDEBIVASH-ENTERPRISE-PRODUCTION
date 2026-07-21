import type {
  AuditEventRecord,
  AuditListFilter,
  AuditRepository,
  AuditSearchOptions,
  AuditSearchResult,
  NewAuditEvent,
} from "./types.js";

export function createInMemoryAuditRepository(): AuditRepository {
  const events: AuditEventRecord[] = [];

  return {
    async record(event: NewAuditEvent): Promise<AuditEventRecord> {
      const record: AuditEventRecord = { id: crypto.randomUUID(), ...event };
      events.push(record);
      return record;
    },

    async list(filter?: AuditListFilter): Promise<AuditEventRecord[]> {
      const matched = events.filter(
        (event) =>
          (!filter?.entityType || event.entityType === filter.entityType) &&
          (!filter?.entityId || event.entityId === filter.entityId),
      );
      return matched.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async search(options: AuditSearchOptions): Promise<AuditSearchResult> {
      let matched = [...events];

      if (options.search) {
        const needle = options.search.toLowerCase();
        matched = matched.filter(
          (event) =>
            event.action.toLowerCase().includes(needle) ||
            event.entityType.toLowerCase().includes(needle) ||
            (event.entityId?.toLowerCase().includes(needle) ?? false),
        );
      }
      if (options.actorId) {
        matched = matched.filter((event) => event.actorId === options.actorId);
      }
      if (options.organizationId) {
        matched = matched.filter((event) => event.organizationId === options.organizationId);
      }
      if (options.action) {
        matched = matched.filter((event) => event.action === options.action);
      }
      if (options.entityType) {
        matched = matched.filter((event) => event.entityType === options.entityType);
      }
      if (options.entityId) {
        matched = matched.filter((event) => event.entityId === options.entityId);
      }
      if (options.dateFrom) {
        matched = matched.filter((event) => event.createdAt >= options.dateFrom!);
      }
      if (options.dateTo) {
        matched = matched.filter((event) => event.createdAt <= options.dateTo!);
      }

      // Same "omitted means descending" convention as
      // OrganizationRepository.search — matches this repository's own
      // list()'s newest-first default.
      const direction = options.sortDirection === "asc" ? 1 : -1;
      matched.sort((a, b) => a.createdAt.localeCompare(b.createdAt) * direction);

      const total = matched.length;
      const page = Math.max(1, options.page ?? 1);
      const pageSize = Math.max(1, options.pageSize ?? 25);
      const start = (page - 1) * pageSize;
      const paged = matched.slice(start, start + pageSize);

      return { events: paged, total, page, pageSize };
    },
  };
}
