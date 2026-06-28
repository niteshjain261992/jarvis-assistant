import { randomUUID } from 'node:crypto';
import type { LocationUpdateEnvelope } from '@/schemas/websocket/inbound-envelope.schema.js';
import * as locationHistoryRepository from '@/repositories/location-history.repository.js';
import * as userRepository from '@/repositories/user.repository.js';
import { reverseGeocode } from '@/services/geocoding.service.js';
import { upsertUserLocation } from '@/services/user-context.service.js';
import { ErrorResponse } from '@/utils/api-response.js';
import { haversineDistanceMeters } from '@/utils/haversine.js';
import { logger } from '@/utils/logger.js';

const LOCATION_HISTORY_DISTANCE_THRESHOLD_METERS = 50;

function hasStoredLocation(user: userRepository.UserDocument): boolean {
  return user.currentLat !== undefined && user.currentLon !== undefined;
}

export async function processLocationUpdate(envelope: LocationUpdateEnvelope): Promise<void> {
  const user = await userRepository.findSingleUser();
  if (!user) {
    throw ErrorResponse.NOT_FOUND('User not found');
  }

  const { latitude, longitude } = envelope.payload;

  let shouldEmbedLocation = !hasStoredLocation(user); // always embed on first fix

  if (hasStoredLocation(user)) {
    const distanceMeters = haversineDistanceMeters(
      user.currentLat!,
      user.currentLon!,
      latitude,
      longitude,
    );

    if (distanceMeters > LOCATION_HISTORY_DISTANCE_THRESHOLD_METERS) {
      const now = new Date();
      await locationHistoryRepository.insertLocationHistory({
        _id: randomUUID(),
        userId: user._id,
        latitude: user.currentLat!,
        longitude: user.currentLon!,
        locationName: user.currentLocationName,
        timestamp: envelope.timestamp,
        createdAt: now,
        updatedAt: now,
      });
      shouldEmbedLocation = true;
    } else {
      logger.info(
        { distanceMeters, userId: user._id },
        'Location update is too close to the previous update, skipping history',
      );
    }
  }

  // Reverse-geocode only when the location actually changed enough to matter
  // (first fix or movement past the threshold). Sub-threshold pings must not
  // hit Nominatim — the distance check is what gates request frequency.
  const newLocationName = shouldEmbedLocation ? await reverseGeocode(latitude, longitude) : null;

  await userRepository.updateUser(user._id, {
    currentLat: latitude,
    currentLon: longitude,
    lastActive: envelope.timestamp,
    ...(newLocationName !== null ? { currentLocationName: newLocationName } : {}),
  });

  if (shouldEmbedLocation) {
    try {
      await upsertUserLocation({
        ...user,
        currentLat: latitude,
        currentLon: longitude,
        lastActive: envelope.timestamp,
        currentLocationName: newLocationName ?? undefined,
      });
    } catch (err) {
      logger.error({ err }, 'Location embed side-effect failed unexpectedly');
    }
  }
}
