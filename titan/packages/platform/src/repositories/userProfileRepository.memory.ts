import type {
  NewUserProfile,
  UserProfilePatch,
  UserProfileRecord,
  UserProfileRepository,
} from "./types.js";

export function createInMemoryUserProfileRepository(): UserProfileRepository {
  const profiles: UserProfileRecord[] = [];

  return {
    async save(profile: NewUserProfile): Promise<UserProfileRecord> {
      const record: UserProfileRecord = { id: crypto.randomUUID(), ...profile };
      profiles.push(record);
      return record;
    },

    async findByUserId(userId: string): Promise<UserProfileRecord[]> {
      return profiles.filter((profile) => profile.userId === userId);
    },

    async findByOrganizationId(organizationId: string): Promise<UserProfileRecord[]> {
      return profiles.filter((profile) => profile.organizationId === organizationId);
    },

    async findById(id: string): Promise<UserProfileRecord | null> {
      return profiles.find((profile) => profile.id === id) ?? null;
    },

    async list(): Promise<UserProfileRecord[]> {
      return [...profiles];
    },

    async update(id: string, patch: UserProfilePatch): Promise<UserProfileRecord | null> {
      const index = profiles.findIndex((profile) => profile.id === id);
      if (index === -1) return null;
      const updated: UserProfileRecord = { ...profiles[index]!, role: patch.role };
      profiles[index] = updated;
      return updated;
    },

    async remove(id: string): Promise<boolean> {
      const index = profiles.findIndex((profile) => profile.id === id);
      if (index === -1) return false;
      profiles.splice(index, 1);
      return true;
    },
  };
}
