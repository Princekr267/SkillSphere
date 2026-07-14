import mongoose, { Document, Schema, Types } from 'mongoose';

// ─── Sub-document interfaces ────────────────────────────────────────────────

export interface IApplicant {
  _id?: Types.ObjectId;
  freelancerId: Types.ObjectId;
  message: string;
  appliedAt: Date;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface IGigLocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
  city: string;
}

// ─── Main Gig Document Interface ─────────────────────────────────────────────

export interface IGig extends Document {
  clientId: Types.ObjectId;
  title: string;
  description: string;
  category: string;
  budget: number;
  budgetType: 'fixed' | 'hourly';
  skillsRequired: string[];
  location: IGigLocation;
  radiusKm: number;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  applicants: IApplicant[];
  // Simulated escrow fields
  escrowStatus: 'none' | 'funds_deposited' | 'released' | 'refunded';
  acceptedFreelancerId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const ApplicantSchema = new Schema<IApplicant>(
  {
    freelancerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { _id: true }
);

const GigSchema = new Schema<IGig>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Gig must belong to a client'],
    },
    title: {
      type: String,
      required: [true, 'Gig title is required'],
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: [true, 'Gig description is required'],
      trim: true,
      maxlength: 3000,
    },
    category: {
      type: String,
      required: [true, 'Gig category is required'],
      enum: [
        'Technology & Development',
        'Design & Creative',
        'Home & Trades',
        'Writing & Translation',
        'Marketing & Sales',
        'Teaching & Tutoring',
        'Other',
      ],
    },
    budget: {
      type: Number,
      required: [true, 'Budget is required'],
      min: 0,
    },
    budgetType: {
      type: String,
      enum: ['fixed', 'hourly'],
      default: 'fixed',
    },
    skillsRequired: [
      {
        type: String,
        trim: true,
      },
    ],
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: [true, 'Gig location coordinates are required'],
      },
      city: {
        type: String,
        required: [true, 'Gig city is required'],
        trim: true,
      },
    },
    radiusKm: {
      type: Number,
      default: 25,
      min: 1,
      max: 500,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'completed', 'cancelled'],
      default: 'open',
    },
    applicants: [ApplicantSchema],
    // Simulated escrow
    escrowStatus: {
      type: String,
      enum: ['none', 'funds_deposited', 'released', 'refunded'],
      default: 'none',
    },
    acceptedFreelancerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for geospatial queries ($near, $geoWithin)
GigSchema.index({ location: '2dsphere' });

// Compound index for efficient filtering by status and category
GigSchema.index({ status: 1, category: 1 });
GigSchema.index({ clientId: 1 });

export default mongoose.model<IGig>('Gig', GigSchema);
