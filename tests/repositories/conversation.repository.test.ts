import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectMongo, disconnectMongo } from '@/config/mongodb.js';
import { ConversationModel } from '@/models/conversation.model.js';
import * as conversationRepository from '@/repositories/conversation.repository.js';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await connectMongo(mongod.getUri(), 'test');
}, 60_000);

afterAll(async () => {
  await disconnectMongo();
  await mongod.stop();
}, 30_000);

beforeEach(async () => {
  await ConversationModel.deleteMany({});
});

describe('conversation.repository', () => {
  const baseDoc: conversationRepository.ConversationDocument = {
    _id: 'conv-1',
    source: 'mobile',
    status: 'active',
    lastSequenceNumber: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('inserts and finds a conversation by id', async () => {
    await conversationRepository.insertConversation(baseDoc);

    const found = await conversationRepository.findConversationById('conv-1');

    expect(found).toMatchObject({
      _id: 'conv-1',
      source: 'mobile',
      status: 'active',
      lastSequenceNumber: 0,
    });
  });

  it('returns null when the conversation does not exist', async () => {
    expect(await conversationRepository.findConversationById('missing')).toBeNull();
  });

  it('defaults to mobile source when findActiveConversation is called without args', async () => {
    await conversationRepository.insertConversation(baseDoc);

    const found = await conversationRepository.findActiveConversation();

    expect(found?._id).toBe('conv-1');
  });

  it('finds the most recently updated active conversation for a source', async () => {
    await conversationRepository.insertConversation(baseDoc);
    await conversationRepository.insertConversation({
      ...baseDoc,
      _id: 'conv-2',
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    await conversationRepository.insertConversation({
      ...baseDoc,
      _id: 'conv-archived',
      status: 'archived',
      updatedAt: new Date('2026-01-03T00:00:00.000Z'),
    });

    const found = await conversationRepository.findActiveConversation('mobile');

    expect(found?._id).toBe('conv-2');
  });

  it('updates status, summary, and lastSequenceNumber fields', async () => {
    await conversationRepository.insertConversation(baseDoc);

    await conversationRepository.updateConversation('conv-1', {
      status: 'archived',
      summary: 'Camera session',
      lastSequenceNumber: 3,
    });

    const found = await conversationRepository.findConversationById('conv-1');

    expect(found).toMatchObject({
      status: 'archived',
      summary: 'Camera session',
      lastSequenceNumber: 3,
    });
    expect(found!.updatedAt.getTime()).toBeGreaterThan(baseDoc.updatedAt.getTime());
  });
});
