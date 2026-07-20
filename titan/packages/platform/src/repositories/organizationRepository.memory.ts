import type { NewOrganization, OrganizationRecord, OrganizationRepository } from "./types.js";

export function createInMemoryOrganizationRepository(): OrganizationRepository {
  const organizations: OrganizationRecord[] = [];

  return {
    async save(organization: NewOrganization): Promise<OrganizationRecord> {
      const record: OrganizationRecord = { id: crypto.randomUUID(), ...organization };
      organizations.push(record);
      return record;
    },

    async findBySlug(slug: string): Promise<OrganizationRecord | null> {
      return organizations.find((org) => org.slug === slug) ?? null;
    },

    async list(): Promise<OrganizationRecord[]> {
      return [...organizations].sort((a, b) => a.name.localeCompare(b.name));
    },
  };
}
