import mongoose, { Schema } from 'mongoose';

export type MessageType = 'text' | 'action' | 'image';
export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageActionExecutor = 'assistant' | 'client' | 'server';
export type MessageStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface MessageDocument {
  _id: string;
  conversationId: string;
  parentId?: string;
  type: MessageType;
  role: MessageRole;
  sequenceNumber: number;
  content?: string;
  actionName?: string;
  actionPayload?: Record<string, unknown>;
  actionResult?: Record<string, unknown>;
  actionExecutor?: MessageActionExecutor;
  model?: string;
  status: MessageStatus;
  errorDetails?: string;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<MessageDocument>(
  {
    _id: { type: String, required: true },
    conversationId: { type: String, ref: 'Conversation', required: true },
    parentId: { type: String, ref: 'Message' },
    type: {
      type: String,
      enum: ['text', 'action', 'image'],
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    sequenceNumber: { type: Number, required: true },
    content: { type: String },
    actionName: { type: String },
    actionPayload: { type: Schema.Types.Mixed },
    actionResult: { type: Schema.Types.Mixed },
    actionExecutor: {
      type: String,
      enum: ['assistant', 'client', 'server'],
    },
    model: { type: String },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      required: true,
    },
    errorDetails: { type: String },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: 'messages', versionKey: false },
);

export const MessageModel = mongoose.model<MessageDocument>('Message', messageSchema);
