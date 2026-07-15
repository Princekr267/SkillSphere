import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPayment extends Document {
  gigId: Types.ObjectId;
  proposalId?: Types.ObjectId;
  clientId: Types.ObjectId;
  freelancerId?: Types.ObjectId;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpayRefundId?: string;
  amount: number; // In INR (not paisa, e.g. 500.00)
  status: 'escrowed' | 'released' | 'refunded';
  transactionType: 'deposit' | 'payout' | 'refund';
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    gigId: {
      type: Schema.Types.ObjectId,
      ref: 'Gig',
      required: [true, 'Payment must be associated with a gig'],
    },
    proposalId: {
      type: Schema.Types.ObjectId,
      ref: 'Proposal',
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Payment must belong to a client'],
    },
    freelancerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    razorpayOrderId: {
      type: String,
      required: [true, 'Razorpay Order ID is required'],
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpayRefundId: {
      type: String,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0,
    },
    status: {
      type: String,
      enum: ['escrowed', 'released', 'refunded'],
      required: true,
    },
    transactionType: {
      type: String,
      enum: ['deposit', 'payout', 'refund'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IPayment>('Payment', PaymentSchema);
