import type { AuditEventRecord, AuditListFilter, AuditRepository, NewAuditEvent } from "./types.js";

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
  };
}
