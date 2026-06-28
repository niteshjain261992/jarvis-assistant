import { UserModel, type UserDocument } from '@/models/user.model.js';

export type { UserDocument };

export async function insertUser(doc: UserDocument): Promise<UserDocument> {
  await UserModel.create(doc);
  return doc;
}

export async function findUserById(id: string): Promise<UserDocument | null> {
  return UserModel.findById(id).lean<UserDocument>();
}

export async function findSingleUser(): Promise<UserDocument | null> {
  return UserModel.findOne().lean<UserDocument>();
}

export async function updateUser(
  id: string,
  update: Partial<
    Pick<UserDocument, 'name' | 'dob' | 'homeLocation' | 'currentLat' | 'currentLon' | 'currentLocationName' | 'lastActive'>
  >,
): Promise<void> {
  await UserModel.updateOne({ _id: id }, { $set: { ...update, updatedAt: new Date() } });
}

export async function touchLastActive(id: string, timestamp: number): Promise<void> {
  await updateUser(id, { lastActive: timestamp });
}
