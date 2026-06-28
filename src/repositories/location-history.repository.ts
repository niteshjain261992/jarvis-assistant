import {
  LocationHistoryModel,
  type LocationHistoryDocument,
} from '@/models/location-history.model.js';

export type { LocationHistoryDocument };

export async function insertLocationHistory(
  doc: LocationHistoryDocument,
): Promise<LocationHistoryDocument> {
  await LocationHistoryModel.create(doc);
  return doc;
}

export async function findLocationHistoryById(
  id: string,
): Promise<LocationHistoryDocument | null> {
  return LocationHistoryModel.findById(id).lean<LocationHistoryDocument>();
}

export async function findLocationHistoryByUserId(
  userId: string,
  limit = 50,
): Promise<LocationHistoryDocument[]> {
  return LocationHistoryModel.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean<LocationHistoryDocument[]>();
}

export async function deleteLocationHistory(id: string): Promise<void> {
  await LocationHistoryModel.deleteOne({ _id: id });
}
