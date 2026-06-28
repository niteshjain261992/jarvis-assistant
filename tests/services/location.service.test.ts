jest.mock('@/services/user-context.service.js', () => ({
  upsertUserLocation: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/geocoding.service.js', () => ({
  reverseGeocode: jest.fn().mockResolvedValue('Bandra West, Mumbai, Maharashtra'),
}));

import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectMongo, disconnectMongo } from '@/config/mongodb.js';
import { LocationHistoryModel } from '@/models/location-history.model.js';
import { UserModel } from '@/models/user.model.js';
import type { LocationUpdateEnvelope } from '@/schemas/websocket/inbound-envelope.schema.js';
import * as userRepository from '@/repositories/user.repository.js';
import { processLocationUpdate } from '@/services/location.service.js';
import { reverseGeocode } from '@/services/geocoding.service.js';
import { upsertUserLocation } from '@/services/user-context.service.js';
import { ErrorResponse } from '@/utils/api-response.js';

const reverseGeocodeMock = reverseGeocode as jest.MockedFunction<typeof reverseGeocode>;
const upsertUserLocationMock = upsertUserLocation as jest.MockedFunction<typeof upsertUserLocation>;

let mongod: MongoMemoryServer;

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const NOW = new Date('2026-01-01T00:00:00.000Z');
const GEOCODED_NAME = 'Bandra West, Mumbai, Maharashtra';

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await connectMongo(mongod.getUri(), 'test');
}, 60_000);

afterAll(async () => {
  await disconnectMongo();
  await mongod.stop();
}, 30_000);

beforeEach(async () => {
  await LocationHistoryModel.deleteMany({});
  await UserModel.deleteMany({});
  upsertUserLocationMock.mockReset();
  upsertUserLocationMock.mockResolvedValue(undefined);
  reverseGeocodeMock.mockReset();
  reverseGeocodeMock.mockResolvedValue(GEOCODED_NAME);
});

function locationUpdateEnvelope(
  latitude: number,
  longitude: number,
  timestamp = 1_719_311_010,
): LocationUpdateEnvelope {
  return {
    type: 'LOCATION_UPDATE',
    message_id: 'loc-7g8h9i',
    timestamp,
    payload: {
      latitude,
      longitude,
      accuracy_meters: 12.5,
      speed_kmh: 0.0,
    },
  };
}

describe('processLocationUpdate', () => {
  it('sets the user location on the first fix without history', async () => {
    await userRepository.insertUser({
      _id: USER_ID,
      name: 'Tony',
      createdAt: NOW,
      updatedAt: NOW,
    });

    await processLocationUpdate(locationUpdateEnvelope(28.4595, 77.0266));

    const user = await userRepository.findUserById(USER_ID);
    expect(user).toMatchObject({
      currentLat: 28.4595,
      currentLon: 77.0266,
      lastActive: 1_719_311_010,
    });
    expect(await LocationHistoryModel.countDocuments()).toBe(0);
  });

  it('updates location without history when movement is within 50 meters', async () => {
    await userRepository.insertUser({
      _id: USER_ID,
      name: 'Tony',
      currentLat: 28.4595,
      currentLon: 77.0266,
      createdAt: NOW,
      updatedAt: NOW,
    });

    await processLocationUpdate(locationUpdateEnvelope(28.45951, 77.02661));

    const user = await userRepository.findUserById(USER_ID);
    expect(user).toMatchObject({
      currentLat: 28.45951,
      currentLon: 77.02661,
    });
    expect(await LocationHistoryModel.countDocuments()).toBe(0);
  });

  it('does NOT call reverseGeocode when movement is within 50 meters', async () => {
    await userRepository.insertUser({
      _id: USER_ID,
      name: 'Tony',
      currentLat: 28.4595,
      currentLon: 77.0266,
      currentLocationName: 'Juhu, Mumbai, Maharashtra',
      createdAt: NOW,
      updatedAt: NOW,
    });

    await processLocationUpdate(locationUpdateEnvelope(28.45951, 77.02661));

    expect(reverseGeocodeMock).not.toHaveBeenCalled();
    // Sub-threshold pings must not overwrite the existing name.
    const user = await userRepository.findUserById(USER_ID);
    expect(user?.currentLocationName).toBe('Juhu, Mumbai, Maharashtra');
  });

  it('calls reverseGeocode on the first fix', async () => {
    await userRepository.insertUser({
      _id: USER_ID,
      name: 'Tony',
      createdAt: NOW,
      updatedAt: NOW,
    });

    await processLocationUpdate(locationUpdateEnvelope(28.4595, 77.0266));

    expect(reverseGeocodeMock).toHaveBeenCalledTimes(1);
    expect(reverseGeocodeMock).toHaveBeenCalledWith(28.4595, 77.0266);
  });

  it('calls reverseGeocode once when movement exceeds the threshold', async () => {
    await userRepository.insertUser({
      _id: USER_ID,
      name: 'Tony',
      currentLat: 28.4595,
      currentLon: 77.0266,
      createdAt: NOW,
      updatedAt: NOW,
    });

    await processLocationUpdate(locationUpdateEnvelope(28.4605, 77.0266));

    expect(reverseGeocodeMock).toHaveBeenCalledTimes(1);
    expect(reverseGeocodeMock).toHaveBeenCalledWith(28.4605, 77.0266);
  });

  it('archives the previous location when movement exceeds 50 meters', async () => {
    await userRepository.insertUser({
      _id: USER_ID,
      name: 'Tony',
      currentLat: 28.4595,
      currentLon: 77.0266,
      createdAt: NOW,
      updatedAt: NOW,
    });

    await processLocationUpdate(locationUpdateEnvelope(28.4605, 77.0266, 1_719_311_020));

    const user = await userRepository.findUserById(USER_ID);
    expect(user).toMatchObject({
      currentLat: 28.4605,
      currentLon: 77.0266,
      lastActive: 1_719_311_020,
    });

    const history = await LocationHistoryModel.find().lean();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      userId: USER_ID,
      latitude: 28.4595,
      longitude: 77.0266,
      timestamp: 1_719_311_020,
    });
    expect(typeof history[0]?._id).toBe('string');
    expect(history[0]?._id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('throws NOT_FOUND when no user exists', async () => {
    await expect(processLocationUpdate(locationUpdateEnvelope(28.4595, 77.0266))).rejects.toEqual(
      ErrorResponse.NOT_FOUND('User not found'),
    );
  });

  it('calls upsertUserLocation on the first fix (no prior location)', async () => {
    await userRepository.insertUser({
      _id: USER_ID,
      name: 'Tony',
      createdAt: NOW,
      updatedAt: NOW,
    });

    await processLocationUpdate(locationUpdateEnvelope(28.4595, 77.0266));

    expect(upsertUserLocationMock).toHaveBeenCalledWith(
      expect.objectContaining({ currentLat: 28.4595, currentLon: 77.0266 }),
    );
  });

  it('calls upsertUserLocation when movement exceeds the threshold', async () => {
    await userRepository.insertUser({
      _id: USER_ID,
      name: 'Tony',
      currentLat: 28.4595,
      currentLon: 77.0266,
      createdAt: NOW,
      updatedAt: NOW,
    });

    await processLocationUpdate(locationUpdateEnvelope(28.4605, 77.0266));

    expect(upsertUserLocationMock).toHaveBeenCalledWith(
      expect.objectContaining({ currentLat: 28.4605, currentLon: 77.0266 }),
    );
  });

  it('does NOT call upsertUserLocation when movement is below the threshold', async () => {
    await userRepository.insertUser({
      _id: USER_ID,
      name: 'Tony',
      currentLat: 28.4595,
      currentLon: 77.0266,
      createdAt: NOW,
      updatedAt: NOW,
    });

    await processLocationUpdate(locationUpdateEnvelope(28.45951, 77.02661));

    expect(upsertUserLocationMock).not.toHaveBeenCalled();
  });

  it('succeeds even when upsertUserLocation throws (non-fatal side effect)', async () => {
    upsertUserLocationMock.mockRejectedValueOnce(new Error('Qdrant down'));
    await userRepository.insertUser({
      _id: USER_ID,
      name: 'Tony',
      createdAt: NOW,
      updatedAt: NOW,
    });

    await expect(processLocationUpdate(locationUpdateEnvelope(28.4595, 77.0266))).resolves.toBeUndefined();

    const user = await userRepository.findUserById(USER_ID);
    expect(user?.currentLat).toBe(28.4595);
  });

  it('stores currentLocationName on the user when geocoding succeeds', async () => {
    await userRepository.insertUser({
      _id: USER_ID,
      name: 'Tony',
      createdAt: NOW,
      updatedAt: NOW,
    });

    await processLocationUpdate(locationUpdateEnvelope(28.4595, 77.0266));

    const user = await userRepository.findUserById(USER_ID);
    expect(user?.currentLocationName).toBe(GEOCODED_NAME);
  });

  it('passes currentLocationName to upsertUserLocation after geocoding', async () => {
    await userRepository.insertUser({
      _id: USER_ID,
      name: 'Tony',
      createdAt: NOW,
      updatedAt: NOW,
    });

    await processLocationUpdate(locationUpdateEnvelope(28.4595, 77.0266));

    expect(upsertUserLocationMock).toHaveBeenCalledWith(
      expect.objectContaining({ currentLocationName: GEOCODED_NAME }),
    );
  });

  it('history row carries the previous location name (ordering proof)', async () => {
    const PREV_NAME = 'Juhu, Mumbai, Maharashtra';
    await userRepository.insertUser({
      _id: USER_ID,
      name: 'Tony',
      currentLat: 28.4595,
      currentLon: 77.0266,
      currentLocationName: PREV_NAME,
      createdAt: NOW,
      updatedAt: NOW,
    });

    await processLocationUpdate(locationUpdateEnvelope(28.4605, 77.0266));

    const history = await LocationHistoryModel.find().lean();
    expect(history).toHaveLength(1);
    expect(history[0]?.locationName).toBe(PREV_NAME);
  });

  it('still updates coordinates when geocoding returns null (non-fatal)', async () => {
    reverseGeocodeMock.mockResolvedValue(null);
    await userRepository.insertUser({
      _id: USER_ID,
      name: 'Tony',
      createdAt: NOW,
      updatedAt: NOW,
    });

    await expect(processLocationUpdate(locationUpdateEnvelope(28.4595, 77.0266))).resolves.toBeUndefined();

    const user = await userRepository.findUserById(USER_ID);
    expect(user?.currentLat).toBe(28.4595);
    expect(user?.currentLocationName).toBeUndefined();
  });

  it('does not write the string "null" when geocoding returns null', async () => {
    reverseGeocodeMock.mockResolvedValue(null);
    await userRepository.insertUser({
      _id: USER_ID,
      name: 'Tony',
      createdAt: NOW,
      updatedAt: NOW,
    });

    await processLocationUpdate(locationUpdateEnvelope(28.4595, 77.0266));

    const user = await userRepository.findUserById(USER_ID);
    expect(user?.currentLocationName).not.toBe('null');
  });

  it('never modifies homeLocation on location updates', async () => {
    await userRepository.insertUser({
      _id: USER_ID,
      name: 'Tony',
      homeLocation: 'Pune, Maharashtra',
      createdAt: NOW,
      updatedAt: NOW,
    });

    await processLocationUpdate(locationUpdateEnvelope(28.4595, 77.0266));

    const user = await userRepository.findUserById(USER_ID);
    expect(user?.homeLocation).toBe('Pune, Maharashtra');
  });
});
