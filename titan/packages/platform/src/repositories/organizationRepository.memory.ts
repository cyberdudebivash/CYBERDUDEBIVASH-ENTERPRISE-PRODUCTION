import type {
  NewOrganization,
  OrganizationPatch,
  OrganizationRecord,
  OrganizationRepository,
  OrganizationSearchOptions,
  OrganizationSearchResult,
} from "./types.js";

export function createInMemoryOrganizationRepository(): OrganizationRepository {
  const organizations: OrganizationRecord[] = [];

  return {
    async save(organization: NewOrganization): Promise<OrganizationRecord> {
      const record: OrganizationRecord = {
        id: crypto.randomUUID(),
        status: organization.status ?? "active",
        ...organization,
        updatedAt: organization.createdAt,
      };
      organizations.push(record);
      return record;
    },

    async findBySlug(slug: string): Promise<OrganizationRecord | null> {
      return organizations.find((org) => org.slug === slug) ?? null;
    },

    async findById(id: string): Promise<OrganizationRecord | null> {
      return organizations.find((org) => org.id === id) ?? null;
    },

    async list(): Promise<OrganizationRecord[]> {
      return [...organizations].sort((a, b) => a.name.localeCompare(b.name));
    },

    async search(options: OrganizationSearchOptions): Promise<OrganizationSearchResult> {
      let matched = [...organizations];

      if (options.search) {
        const needle = options.search.toLowerCase();
        matched = matched.filter(
          (org) =>
            org.name.toLowerCase().includes(needle) ||
            org.slug.toLowerCase().includes(needle) ||
            (org.industry?.toLowerCase().includes(needle) ?? false) ||
            (org.region?.toLowerCase().includes(needle) ?? false),
        );
      }
      if (options.status) {
        matched = matched.filter((org) => org.status === options.status);
      }
      if (options.industry) {
        matched = matched.filter((org) => org.industry === options.industry);
      }
      if (options.region) {
        matched = matched.filter((org) => org.region === options.region);
      }
      if (options.tag) {
        matched = matched.filter((org) => org.tags.includes(options.tag!));
      }

      const direction = options.sortDirection === "asc" ? 1 : -1;
      const sortBy = options.sortBy ?? "name";
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

      return { organizations: paged, total, page, pageSize };
    },

    async update(id: string, patch: OrganizationPatch): Promise<OrganizationRecord | null> {
      const index = organizations.findIndex((org) => org.id === id);
      if (index === -1) return null;
      const current = organizations[index]!;
      const updated: OrganizationRecord = {
        ...current,
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.industry !== undefined ? { industry: patch.industry } : {}),
        ...(patch.region !== undefined ? { region: patch.region } : {}),
        ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
        updatedAt: new Date().toISOString(),
      };
      organizations[index] = updated;
      return updated;
    },
  };
}

function sortKey(
  org: OrganizationRecord,
  sortBy: NonNullable<OrganizationSearchOptions["sortBy"]>,
): string {
  switch (sortBy) {
    case "name":
      return org.name.toLowerCase();
    case "createdAt":
      return org.createdAt;
    case "updatedAt":
      return org.updatedAt;
  }
}
