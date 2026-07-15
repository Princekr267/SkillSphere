import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProposal extends Document {
  gigId: Types.ObjectId;
  freelancerId: Types.ObjectId;
  coverLetter: string;
  bidAmount: number;
  completionTime: number; // in days
  status: 'pending' | 'accepted' | 'rejected' | 'negotiating';
  lastProposedBy: 'client' | 'freelancer';
  clientCounterAmount?: number;
  freelancerCounterAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProposalSchema = new Schema<IProposal>(
  {
    gigId: {
      type: Schema.Types.ObjectId,
      ref: 'Gig',
      required: [true, 'Proposal must belong to a gig'],
    },
    freelancerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Proposal must belong to a freelancer'],
    },
    coverLetter: {
      type: String,
      required: [true, 'Cover letter is required'],
      trim: true,
      maxlength: 2000,
    },
    bidAmount: {
      type: Number,
      required: [true, 'Bid amount is required'],
      min: 0,
    },
    completionTime: {
      type: Number,
      required: [true, 'Completion time (in days) is required'],
      min: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'negotiating'],
      default: 'pending',
    },
    lastProposedBy: {
      type: String,
      enum: ['client', 'freelancer'],
      default: 'freelancer',
    },
    clientCounterAmount: {
      type: Number,
    },
    freelancerCounterAmount: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent multiple proposals from the same freelancer on the same gig
ProposalSchema.index({ gigId: 1, freelancerId: 1 }, { unique: true });

export default mongoose.model<IProposal>('Proposal', ProposalSchema);
