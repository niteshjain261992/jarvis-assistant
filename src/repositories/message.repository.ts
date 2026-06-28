import { MessageModel, type MessageDocument, type MessageStatus } from '@/models/message.model.js';

export type { MessageDocument, MessageStatus };

export async function insertMessage(doc: MessageDocument): Promise<MessageDocument> {
  await MessageModel.create(doc);
  return doc;
}

export async function findMessageById(id: string): Promise<MessageDocument | null> {
  return MessageModel.findById(id).lean<MessageDocument>();
}

export async function findLatestActionMessageByParentId(
  parentId: string,
): Promise<MessageDocument | null> {
  return MessageModel.findOne({ parentId, type: 'action' })
    .sort({ sequenceNumber: -1 })
    .lean<MessageDocument>();
}

export async function findMessagesByConversationId(
  conversationId: string,
  limit = 20,
): Promise<MessageDocument[]> {
  return MessageModel.find({ conversationId })
    .sort({ sequenceNumber: 1 })
    .limit(limit)
    .lean<MessageDocument[]>();
}

export async function findRecentMessagesByConversationId(
  conversationId: string,
  limit = 10,
  beforeSequenceNumber?: number,
): Promise<MessageDocument[]> {
  const filter: { conversationId: string; sequenceNumber?: { $lt: number } } = { conversationId };
  if (beforeSequenceNumber !== undefined) {
    filter.sequenceNumber = { $lt: beforeSequenceNumber };
  }

  const messages = await MessageModel.find(filter)
    .sort({ sequenceNumber: -1 })
    .limit(limit)
    .lean<MessageDocument[]>();

  return messages.reverse();
}

export async function updateMessage(
  id: string,
  update: Partial<
    Pick<
      MessageDocument,
      | 'type'
      | 'content'
      | 'status'
      | 'actionName'
      | 'actionPayload'
      | 'actionResult'
      | 'actionExecutor'
      | 'model'
      | 'errorDetails'
    >
  >,
): Promise<void> {
  await MessageModel.updateOne({ _id: id }, { $set: { ...update, updatedAt: new Date() } });
}
