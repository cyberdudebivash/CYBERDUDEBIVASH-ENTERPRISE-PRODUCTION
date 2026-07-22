import type {
  LicensePatch,
  LicenseRecord,
  LicenseRepository,
  LicenseSearchOptions,
  LicenseSearchResult,
  NewLicense,
} from "./types.js";

export function createInMemoryLicenseRepository(): LicenseRepository {
  const licenses: LicenseRecord[] = [];

  return {
    async save(license: NewLicense): Promise<LicenseRecord> {
      const record: LicenseRecord = {
        id: crypto.randomUUID(),
        ...license,
        updatedAt: license.createdAt,
      };
      licenses.push(record);
      return record;
    },

    async findByOrganizationId(organizationId: string): Promise<LicenseRecord | null> {
      return licenses.find((l) => l.organizationId === organizationId) ?? null;
    },

    async findById(id: string): Promise<LicenseRecord | null> {
      return licenses.find((l) => l.id === id) ?? null;
    },

    async search(options: LicenseSearchOptions): Promise<LicenseSearchResult> {
      let filtered = [...licenses];

      if (options.search) {
        const needle = options.search.toLowerCase();
        filtered = filtered.filter(
          (l) =>
            l.organizationId.toLowerCase().includes(needle) ||
            l.subscriptionId.toLowerCase().includes(needle),
        );
      }
      if (options.status) {
        filtered = filtered.filter((l) => l.status === options.status);
      }

      const sortBy = options.sortBy ?? "createdAt";
      const direction = options.sortDirection === "asc" ? 1 : -1;
      filtered.sort((a, b) => {
        const left = sortBy === "seatLimit" ? a.seatLimit : a.createdAt;
        const right = sortBy === "seatLimit" ? b.seatLimit : b.createdAt;
        return left < right ? -1 * direction : left > right ? 1 * direction : 0;
      });

      const page = Math.max(1, options.page ?? 1);
      const pageSize = Math.max(1, options.pageSize ?? 25);
      const start = (page - 1) * pageSize;

      return {
        licenses: filtered.slice(start, start + pageSize),
        total: filtered.length,
        page,
        pageSize,
      };
    },

    async update(id: string, patch: LicensePatch): Promise<LicenseRecord | null> {
      const index = licenses.findIndex((l) => l.id === id);
      if (index === -1) return null;
      const updated: LicenseRecord = {
        ...licenses[index]!,
        ...(patch.seatLimit !== undefined ? { seatLimit: patch.seatLimit } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.expiresAt !== undefined ? { expiresAt: patch.expiresAt } : {}),
        updatedAt: new Date().toISOString(),
      };
      licenses[index] = updated;
      return updated;
    },
  };
}
