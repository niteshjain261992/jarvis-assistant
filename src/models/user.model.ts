import mongoose, { Schema } from 'mongoose';

export interface UserDocument {
  _id: string;
  name?: string;
  dob?: string;
  homeLocation?: string;
  currentLat?: number;
  currentLon?: number;
  currentLocationName?: string;
  lastActive?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type UserInsert = Omit<UserDocument, '_id'>;

const userSchema = new Schema<UserDocument>(
  {
    _id: { type: String, required: true },
    name: { type: String },
    dob: { type: String },
    homeLocation: { type: String },
    currentLat: { type: Number },
    currentLon: { type: Number },
    currentLocationName: { type: String },
    lastActive: { type: Number },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: 'users', versionKey: false },
);

export const UserModel = mongoose.model<UserDocument>('User', userSchema);
