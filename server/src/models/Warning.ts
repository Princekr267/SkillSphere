import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IWarning extends Document {
  type: 'gig' | 'message' | 'manual';
  targetId?: Types.ObjectId;
  offenderId: Types.ObjectId;
  content: string;
  reason: string;
  createdAt: Date;
}

const WarningSchema = new Schema<IWarning>(
  {
    type: {
      type: String,
      enum: ['gig', 'message', 'manual'],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    offenderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IWarning>('Warning', WarningSchema);
