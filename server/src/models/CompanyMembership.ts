import mongoose, { Document, Schema, Types } from 'mongoose';

// ─── Main CompanyMembership Document Interface ────────────────────────────────

export interface ICompanyMembership extends Document {
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
  orgRole: 'owner' | 'member';
  joinedAt: Date;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const CompanyMembershipSchema = new Schema<ICompanyMembership>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Membership must belong to a user'],
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Membership must belong to a company'],
    },
    orgRole: {
      type: String,
      enum: ['owner', 'member'],
      required: [true, 'Organisation role is required'],
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // No updatedAt needed — memberships are created once and not edited
    timestamps: false,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

// Compound unique index: one membership row per user per company
// (a user CAN have separate rows for different companies)
CompanyMembershipSchema.index({ userId: 1, companyId: 1 }, { unique: true });

// Individual indexes for efficient single-direction lookups
CompanyMembershipSchema.index({ userId: 1 });
CompanyMembershipSchema.index({ companyId: 1 });

export default mongoose.model<ICompanyMembership>('CompanyMembership', CompanyMembershipSchema);
