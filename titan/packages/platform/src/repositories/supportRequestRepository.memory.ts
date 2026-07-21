import type { NewSupportRequest, SupportRequestRecord, SupportRequestRepository } from "./types.js";

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
  };
}
