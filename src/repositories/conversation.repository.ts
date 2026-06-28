import {
  ConversationModel,
  type ConversationDocument,
  type ConversationSource,
  type ConversationStatus,
} from '@/models/conversation.model.js';

export type { ConversationDocument, ConversationSource, ConversationStatus };

export async function insertConversation(doc: ConversationDocument): Promise<ConversationDocument> {
  await ConversationModel.create(doc);
  return doc;
}

export async function findConversationById(id: string): Promise<ConversationDocument | null> {
  return ConversationModel.findById(id).lean<ConversationDocument>();
}

export async function findActiveConversation(
  source: ConversationSource = 'mobile',
): Promise<ConversationDocument | null> {
  return ConversationModel.findOne({ source, status: 'active' })
    .sort({ updatedAt: -1 })
    .lean<ConversationDocument>();
}

export async function updateConversation(
  id: string,
  update: Partial<Pick<ConversationDocument, 'title' | 'summary' | 'status' | 'lastSequenceNumber'>>,
): Promise<void> {
  await ConversationModel.updateOne({ _id: id }, { $set: { ...update, updatedAt: new Date() } });
}
