import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IReview extends Document {
  gigId: Types.ObjectId;
  reviewerId: Types.ObjectId;
  revieweeId: Types.ObjectId;
  rating: number;
  comment: string;
  isFlagged?: boolean;
  fraudFlags?: string[];
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    gigId: {
      type: Schema.Types.ObjectId,
      ref: 'Gig',
      required: true,
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    revieweeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    fraudFlags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Prevent duplicate reviews per gig per reviewer
ReviewSchema.index({ gigId: 1, reviewerId: 1 }, { unique: true });

export default mongoose.model<IReview>('Review', ReviewSchema);
