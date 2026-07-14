import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMessage extends Document {
  gigId: Types.ObjectId;
  senderId: Types.ObjectId;
  body: string;
  sentAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    gigId:    { type: Schema.Types.ObjectId, ref: 'Gig',  required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body:     { type: String, required: true, trim: true, maxlength: 4000 },
    sentAt:   { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Compound index for fast per-gig history retrieval sorted by time
MessageSchema.index({ gigId: 1, sentAt: 1 });

export default mongoose.model<IMessage>('Message', MessageSchema);
