import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectMongo, disconnectMongo } from '@/config/mongodb.js';
import { MessageModel } from '@/models/message.model.js';
import * as messageRepository from '@/repositories/message.repository.js';

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
  await MessageModel.deleteMany({});
});

describe('message.repository', () => {
  const baseDoc: messageRepository.MessageDocument = {
    _id: 'msg-1',
    conversationId: 'conv-1',
    type: 'text',
    role: 'user',
    sequenceNumber: 1,
    content: 'open camera',
    status: 'completed',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('inserts and finds a message by id', async () => {
    await messageRepository.insertMessage(baseDoc);

    const found = await messageRepository.findMessageById('msg-1');

    expect(found).toMatchObject({
      _id: 'msg-1',
      conversationId: 'conv-1',
      content: 'open camera',
      status: 'completed',
    });
  });

  it('returns null when the message does not exist', async () => {
    expect(await messageRepository.findMessageById('missing')).toBeNull();
  });

  it('finds messages by conversation id in sequence order', async () => {
    await messageRepository.insertMessage(baseDoc);
    await messageRepository.insertMessage({
      ...baseDoc,
      _id: 'msg-2',
      role: 'assistant',
      parentId: 'msg-1',
      sequenceNumber: 2,
      status: 'pending',
      content: undefined,
    });

    const found = await messageRepository.findMessagesByConversationId('conv-1');

    expect(found.map((message) => message._id)).toEqual(['msg-1', 'msg-2']);
  });

  it('finds the most recent messages in chronological order', async () => {
    for (let sequenceNumber = 1; sequenceNumber <= 12; sequenceNumber += 1) {
      await messageRepository.insertMessage({
        ...baseDoc,
        _id: `msg-${sequenceNumber}`,
        sequenceNumber,
        content: `message-${sequenceNumber}`,
      });
    }

    const found = await messageRepository.findRecentMessagesByConversationId('conv-1', 10);

    expect(found.map((message) => message.sequenceNumber)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('excludes messages at or after beforeSequenceNumber', async () => {
    for (let sequenceNumber = 1; sequenceNumber <= 4; sequenceNumber += 1) {
      await messageRepository.insertMessage({
        ...baseDoc,
        _id: `msg-${sequenceNumber}`,
        sequenceNumber,
        content: `message-${sequenceNumber}`,
      });
    }

    const found = await messageRepository.findRecentMessagesByConversationId('conv-1', 10, 4);

    expect(found.map((message) => message.sequenceNumber)).toEqual([1, 2, 3]);
  });

  it('returns an empty array when no prior messages exist', async () => {
    const found = await messageRepository.findRecentMessagesByConversationId('conv-1', 10, 1);

    expect(found).toEqual([]);
  });

  it('updates assistant action fields', async () => {
    await messageRepository.insertMessage(baseDoc);

    await messageRepository.updateMessage('msg-1', {
      type: 'action',
      status: 'completed',
      actionName: 'OPEN:CAMERA',
      actionExecutor: 'client',
      actionPayload: { target: 'camera' },
      model: 'llama3.1:8b',
    });

    const found = await messageRepository.findMessageById('msg-1');

    expect(found).toMatchObject({
      type: 'action',
      status: 'completed',
      actionName: 'OPEN:CAMERA',
      actionExecutor: 'client',
      actionPayload: { target: 'camera' },
      model: 'llama3.1:8b',
    });
    expect(found!.updatedAt.getTime()).toBeGreaterThan(baseDoc.updatedAt.getTime());
  });
});
