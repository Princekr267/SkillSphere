import mongoose, { Document, Schema, Types } from 'mongoose';

// ─── Registration details sub-document ───────────────────────────────────────

export interface IRegistrationDetails {
  businessRegistrationNumber?: string;
  taxId?: string;
  country: string;
  city: string;
}

// ─── Main Company Document Interface ─────────────────────────────────────────

export interface ICompany extends Document {
  name: string;
  industry: string;
  description?: string;
  website?: string;
  registrationDetails: IRegistrationDetails;
  inviteKey: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const CompanySchema = new Schema<ICompany>(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: 120,
    },
    industry: {
      type: String,
      required: [true, 'Industry is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    website: {
      type: String,
      trim: true,
      set: (val?: string) => {
        if (!val || !val.trim()) return undefined;
        const trimmed = val.trim();
        return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      },
    },
    registrationDetails: {
      businessRegistrationNumber: { type: String, trim: true },
      taxId: { type: String, trim: true },
      country: { type: String, required: [true, 'Country is required'], trim: true },
      city: { type: String, required: [true, 'City is required'], trim: true },
    },
    inviteKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Company must have a creator'],
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

// Index for looking up companies owned/created by a user
CompanySchema.index({ createdBy: 1 });

export default mongoose.model<ICompany>('Company', CompanySchema);
