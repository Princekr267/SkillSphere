import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IBooking extends Document {
  freelancerId: Types.ObjectId;
  clientId: Types.ObjectId;
  gigId: Types.ObjectId;
  date: Date;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    freelancerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    gigId: {
      type: Schema.Types.ObjectId,
      ref: 'Gig',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Compound index to ensure clean sorting by date and time
BookingSchema.index({ freelancerId: 1, date: 1, startTime: 1 });

export default mongoose.model<IBooking>('Booking', BookingSchema);
