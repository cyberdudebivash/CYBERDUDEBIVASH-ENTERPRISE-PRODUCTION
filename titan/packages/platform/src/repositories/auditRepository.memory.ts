import type { AuditEventRecord, AuditRepository, NewAuditEvent } from "./types.js";

export function createInMemoryAuditRepository(): AuditRepository {
  const events: AuditEventRecord[] = [];

  return {
    async record(event: NewAuditEvent): Promise<AuditEventRecord> {
      const record: AuditEventRecord = { id: crypto.randomUUID(), ...event };
      events.push(record);
      return record;
    },

    async list(): Promise<AuditEventRecord[]> {
      return [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
  };
}
