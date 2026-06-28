import mongoose, { Schema } from 'mongoose';

export type PreferenceCategory = 'music' | 'movie' | 'food' | 'sports' | 'general';

export interface UserPreferenceDocument {
  _id: string;
  userId: string;
  category: string;
  preferenceValue: string;
  weight?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type UserPreferenceInsert = Omit<UserPreferenceDocument, '_id'>;

const userPreferenceSchema = new Schema<UserPreferenceDocument>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, ref: 'User' },
    category: { type: String, required: true },
    preferenceValue: { type: String, required: true },
    weight: { type: Number },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: 'user_preferences', versionKey: false },
);

userPreferenceSchema.index({ userId: 1, category: 1 });

export const UserPreferenceModel = mongoose.model<UserPreferenceDocument>(
  'UserPreference',
  userPreferenceSchema,
);
