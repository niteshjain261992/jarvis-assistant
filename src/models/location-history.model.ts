import mongoose, { Schema } from 'mongoose';

export interface LocationHistoryDocument {
  _id: string;
  userId: string;
  latitude: number;
  longitude: number;
  locationName?: string;
  timestamp: number;
  createdAt: Date;
  updatedAt: Date;
}

export type LocationHistoryInsert = Omit<LocationHistoryDocument, '_id'>;

const locationHistorySchema = new Schema<LocationHistoryDocument>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, ref: 'User' },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    locationName: { type: String },
    timestamp: { type: Number, required: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: 'location_history', versionKey: false },
);

locationHistorySchema.index({ userId: 1, timestamp: -1 });

export const LocationHistoryModel = mongoose.model<LocationHistoryDocument>(
  'LocationHistory',
  locationHistorySchema,
);
