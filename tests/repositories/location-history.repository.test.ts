import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectMongo, disconnectMongo } from '@/config/mongodb.js';
import { UserModel } from '@/models/user.model.js';
import { LocationHistoryModel } from '@/models/location-history.model.js';
import * as userRepository from '@/repositories/user.repository.js';
import * as locationHistoryRepository from '@/repositories/location-history.repository.js';

let mongod: MongoMemoryServer;

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const HISTORY_ID_1 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const HISTORY_ID_2 = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const NOW = new Date('2026-01-01T00:00:00.000Z');

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
});

describe('location-history.repository', () => {
  beforeEach(async () => {
    await userRepository.insertUser({
      _id: USER_ID,
      name: 'Tony',
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it('inserts and finds a location by id', async () => {
    await locationHistoryRepository.insertLocationHistory({
      _id: HISTORY_ID_1,
      userId: USER_ID,
      latitude: 28.4595,
      longitude: 77.0266,
      locationName: 'Office',
      timestamp: 1_700_000_000,
      createdAt: NOW,
      updatedAt: NOW,
    });

    const found = await locationHistoryRepository.findLocationHistoryById(HISTORY_ID_1);

    expect(found).toMatchObject({
      _id: HISTORY_ID_1,
      userId: USER_ID,
      latitude: 28.4595,
      longitude: 77.0266,
      locationName: 'Office',
      timestamp: 1_700_000_000,
    });
  });

  it('returns locations newest-first', async () => {
    await locationHistoryRepository.insertLocationHistory({
      _id: HISTORY_ID_1,
      userId: USER_ID,
      latitude: 28.0,
      longitude: 77.0,
      timestamp: 1_700_000_000,
      createdAt: NOW,
      updatedAt: NOW,
    });
    await locationHistoryRepository.insertLocationHistory({
      _id: HISTORY_ID_2,
      userId: USER_ID,
      latitude: 29.0,
      longitude: 78.0,
      timestamp: 1_800_000_000,
      createdAt: NOW,
      updatedAt: NOW,
    });

    const found = await locationHistoryRepository.findLocationHistoryByUserId(USER_ID);

    expect(found.map((row) => row.timestamp)).toEqual([1_800_000_000, 1_700_000_000]);
  });

  it('respects the limit parameter', async () => {
    for (let i = 0; i < 3; i += 1) {
      await locationHistoryRepository.insertLocationHistory({
        _id: `dddddddd-dddd-dddd-dddd-dddddddddd${i}`,
        userId: USER_ID,
        latitude: 28.0 + i,
        longitude: 77.0,
        timestamp: 1_700_000_000 + i,
        createdAt: NOW,
        updatedAt: NOW,
      });
    }

    const found = await locationHistoryRepository.findLocationHistoryByUserId(USER_ID, 2);

    expect(found).toHaveLength(2);
  });

  it('deletes a location row', async () => {
    await locationHistoryRepository.insertLocationHistory({
      _id: HISTORY_ID_1,
      userId: USER_ID,
      latitude: 28.4595,
      longitude: 77.0266,
      timestamp: 1_700_000_000,
      createdAt: NOW,
      updatedAt: NOW,
    });

    await locationHistoryRepository.deleteLocationHistory(HISTORY_ID_1);

    expect(await locationHistoryRepository.findLocationHistoryById(HISTORY_ID_1)).toBeNull();
  });
});
