import mongoose, { Schema } from 'mongoose';

export type ConversationSource = 'mobile' | 'cli' | 'api';
export type ConversationStatus = 'active' | 'idle' | 'archived' | 'error';

export interface ConversationDocument {
  _id: string;
  title?: string;
  source: ConversationSource;
  status: ConversationStatus;
  summary?: string;
  lastSequenceNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<ConversationDocument>(
  {
    _id: { type: String, required: true },
    title: { type: String },
    source: {
      type: String,
      enum: ['mobile', 'cli', 'api'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'idle', 'archived', 'error'],
      required: true,
    },
    summary: { type: String },
    lastSequenceNumber: { type: Number, required: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: 'conversations', versionKey: false },
);

export const ConversationModel = mongoose.model<ConversationDocument>(
  'Conversation',
  conversationSchema,
);
