import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectMongo, disconnectMongo } from '@/config/mongodb.js';
import { UserModel } from '@/models/user.model.js';
import { UserPreferenceModel } from '@/models/user-preference.model.js';
import * as userRepository from '@/repositories/user.repository.js';
import * as userPreferenceRepository from '@/repositories/user-preference.repository.js';

let mongod: MongoMemoryServer;

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PREF_ID_1 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const PREF_ID_2 = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
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
  await UserPreferenceModel.deleteMany({});
  await UserModel.deleteMany({});
});

describe('user-preference.repository', () => {
  beforeEach(async () => {
    await userRepository.insertUser({
      _id: USER_ID,
      name: 'Tony',
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it('inserts and finds a preference by id', async () => {
    await userPreferenceRepository.insertUserPreference({
      _id: PREF_ID_1,
      userId: USER_ID,
      category: 'music',
      preferenceValue: 'Classic Rock',
      weight: 4,
      createdAt: NOW,
      updatedAt: NOW,
    });

    const found = await userPreferenceRepository.findUserPreferenceById(PREF_ID_1);

    expect(found).toMatchObject({
      _id: PREF_ID_1,
      userId: USER_ID,
      category: 'music',
      preferenceValue: 'Classic Rock',
      weight: 4,
    });
  });

  it('finds all preferences for a user', async () => {
    await userPreferenceRepository.insertUserPreference({
      _id: PREF_ID_1,
      userId: USER_ID,
      category: 'music',
      preferenceValue: 'Classic Rock',
      createdAt: NOW,
      updatedAt: NOW,
    });
    await userPreferenceRepository.insertUserPreference({
      _id: PREF_ID_2,
      userId: USER_ID,
      category: 'food',
      preferenceValue: 'Vegetarian',
      createdAt: NOW,
      updatedAt: NOW,
    });

    const found = await userPreferenceRepository.findPreferencesByUserId(USER_ID);

    expect(found).toHaveLength(2);
    expect(found.map((p) => p._id).sort()).toEqual([PREF_ID_1, PREF_ID_2].sort());
  });

  it('finds preferences filtered by category', async () => {
    await userPreferenceRepository.insertUserPreference({
      _id: PREF_ID_1,
      userId: USER_ID,
      category: 'music',
      preferenceValue: 'Classic Rock',
      createdAt: NOW,
      updatedAt: NOW,
    });
    await userPreferenceRepository.insertUserPreference({
      _id: PREF_ID_2,
      userId: USER_ID,
      category: 'movie',
      preferenceValue: 'Sci-Fi',
      createdAt: NOW,
      updatedAt: NOW,
    });

    const found = await userPreferenceRepository.findPreferencesByUserIdAndCategory(USER_ID, 'music');

    expect(found).toHaveLength(1);
    expect(found[0]?.category).toBe('music');
  });

  it('updates preference fields', async () => {
    await userPreferenceRepository.insertUserPreference({
      _id: PREF_ID_1,
      userId: USER_ID,
      category: 'music',
      preferenceValue: 'Classic Rock',
      createdAt: NOW,
      updatedAt: NOW,
    });

    await userPreferenceRepository.updateUserPreference(PREF_ID_1, {
      preferenceValue: 'Jazz',
      weight: 5,
    });

    const found = await userPreferenceRepository.findUserPreferenceById(PREF_ID_1);

    expect(found).toMatchObject({
      preferenceValue: 'Jazz',
      weight: 5,
    });
  });

  it('deletes a preference', async () => {
    await userPreferenceRepository.insertUserPreference({
      _id: PREF_ID_1,
      userId: USER_ID,
      category: 'music',
      preferenceValue: 'Classic Rock',
      createdAt: NOW,
      updatedAt: NOW,
    });

    await userPreferenceRepository.deleteUserPreference(PREF_ID_1);

    expect(await userPreferenceRepository.findUserPreferenceById(PREF_ID_1)).toBeNull();
  });
});
