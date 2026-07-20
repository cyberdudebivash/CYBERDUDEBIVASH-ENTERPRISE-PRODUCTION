import type { NewUserProfile, UserProfileRecord, UserProfileRepository } from "./types.js";

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
  };
}
