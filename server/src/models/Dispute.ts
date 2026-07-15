import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDispute extends Document {
  gigId: Types.ObjectId;
  raisedById: Types.ObjectId;
  againstId: Types.ObjectId;
  reason: string;
  evidenceUrl?: string;
  status: 'open' | 'resolved';
  resolutionNote?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DisputeSchema = new Schema<IDispute>(
  {
    gigId: {
      type: Schema.Types.ObjectId,
      ref: 'Gig',
      required: [true, 'Dispute must be associated with a gig'],
    },
    raisedById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Dispute must have a raiser'],
    },
    againstId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Dispute must be against a user'],
    },
    reason: {
      type: String,
      required: [true, 'Reason for dispute is required'],
      trim: true,
      maxlength: 1000,
    },
    evidenceUrl: {
      type: String,
    },
    status: {
      type: String,
      enum: ['open', 'resolved'],
      default: 'open',
    },
    resolutionNote: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IDispute>('Dispute', DisputeSchema);
