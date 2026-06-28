import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectMongo, disconnectMongo } from '@/config/mongodb.js';
import { UserModel } from '@/models/user.model.js';
import * as userRepository from '@/repositories/user.repository.js';

let mongod: MongoMemoryServer;

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
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
  await UserModel.deleteMany({});
});

describe('user.repository', () => {
  const baseDoc: userRepository.UserDocument = {
    _id: USER_ID,
    name: 'Tony',
    dob: '1990-05-15',
    homeLocation: 'Gurugram, India',
    createdAt: NOW,
    updatedAt: NOW,
  };

  it('inserts and finds a user by id', async () => {
    await userRepository.insertUser(baseDoc);

    const found = await userRepository.findUserById(USER_ID);

    expect(found).toMatchObject({
      _id: USER_ID,
      name: 'Tony',
      dob: '1990-05-15',
      homeLocation: 'Gurugram, India',
    });
  });

  it('returns null when the user does not exist', async () => {
    expect(await userRepository.findUserById('00000000-0000-0000-0000-000000000000')).toBeNull();
  });

  it('updates profile and location fields', async () => {
    await userRepository.insertUser(baseDoc);

    await userRepository.updateUser(USER_ID, {
      currentLat: 28.4595,
      currentLon: 77.0266,
      lastActive: 1_700_000_000,
    });

    const found = await userRepository.findUserById(USER_ID);

    expect(found).toMatchObject({
      currentLat: 28.4595,
      currentLon: 77.0266,
      lastActive: 1_700_000_000,
    });
  });

  it('touchLastActive sets lastActive timestamp', async () => {
    await userRepository.insertUser(baseDoc);

    await userRepository.touchLastActive(USER_ID, 1_800_000_000);

    const found = await userRepository.findUserById(USER_ID);

    expect(found?.lastActive).toBe(1_800_000_000);
  });

  it('findSingleUser returns the user when one exists', async () => {
    await userRepository.insertUser(baseDoc);

    const found = await userRepository.findSingleUser();

    expect(found).toMatchObject({ _id: USER_ID, name: 'Tony' });
  });

  it('findSingleUser returns null when no user exists', async () => {
    expect(await userRepository.findSingleUser()).toBeNull();
  });
});
