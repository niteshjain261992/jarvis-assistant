import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectMongo, disconnectMongo } from '@/config/mongodb.js';

let mongod: MongoMemoryServer | undefined;

beforeEach(async () => {
  await disconnectMongo();
});

afterEach(async () => {
  await disconnectMongo();
  if (mongod) {
    await mongod.stop();
    mongod = undefined;
  }
});

describe('mongodb config', () => {
  it('is disconnected before connect', () => {
    expect(mongoose.connection.readyState).toBe(0);
  });

  it('connects, exposes the database name, and disconnects', async () => {
    mongod = await MongoMemoryServer.create();
    await connectMongo(mongod.getUri(), 'test-db');

    expect(mongoose.connection.readyState).toBe(1);
    expect(mongoose.connection.name).toBe('test-db');

    await disconnectMongo();
    expect(mongoose.connection.readyState).toBe(0);
  });

  it('is idempotent when connect is called twice', async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    await connectMongo(uri, 'test-db');
    const firstDbName = mongoose.connection.name;
    await connectMongo(uri, 'other-db');

    expect(mongoose.connection.name).toBe(firstDbName);
    await disconnectMongo();
  });

  it('uses env defaults when connect is called without arguments', async () => {
    await mongoose.disconnect();
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    process.env.MONGODB_DATABASE = 'env-default-db';
    jest.resetModules();

    const freshMongoose =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('mongoose');
    const { env } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/config/env.js');
    const { connectMongo: connect, disconnectMongo: disconnect } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/config/mongodb.js');

    expect(env.MONGODB_DATABASE).toBe('env-default-db');
    expect(freshMongoose.connection.readyState).toBe(0);

    await connect();
    expect(freshMongoose.connection.name).toBe('env-default-db');
    await disconnect();
  });
}, 60_000);
