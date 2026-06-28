import {
  UserPreferenceModel,
  type UserPreferenceDocument,
} from '@/models/user-preference.model.js';

export type { UserPreferenceDocument, PreferenceCategory } from '@/models/user-preference.model.js';

export async function insertUserPreference(
  doc: UserPreferenceDocument,
): Promise<UserPreferenceDocument> {
  await UserPreferenceModel.create(doc);
  return doc;
}

export async function findUserPreferenceById(
  id: string,
): Promise<UserPreferenceDocument | null> {
  return UserPreferenceModel.findById(id).lean<UserPreferenceDocument>();
}

export async function findPreferencesByUserId(
  userId: string,
): Promise<UserPreferenceDocument[]> {
  return UserPreferenceModel.find({ userId }).lean<UserPreferenceDocument[]>();
}

export async function findPreferencesByUserIdAndCategory(
  userId: string,
  category: string,
): Promise<UserPreferenceDocument[]> {
  return UserPreferenceModel.find({ userId, category }).lean<UserPreferenceDocument[]>();
}

export async function updateUserPreference(
  id: string,
  update: Partial<Pick<UserPreferenceDocument, 'category' | 'preferenceValue' | 'weight'>>,
): Promise<void> {
  await UserPreferenceModel.updateOne({ _id: id }, { $set: { ...update, updatedAt: new Date() } });
}

export async function deleteUserPreference(id: string): Promise<void> {
  await UserPreferenceModel.deleteOne({ _id: id });
}
