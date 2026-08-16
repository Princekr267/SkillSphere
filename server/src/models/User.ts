import mongoose, { Document, Schema } from 'mongoose';

// Interface for Skills
export interface ISkill {
  name: string;
  level: 'Beginner' | 'Intermediate' | 'Expert';
}

// Interface for Portfolio item
export interface IPortfolioItem {
  title: string;
  description: string;
  link?: string;
}

// Location sub-document interface
export interface ILocation {
  type: string;
  coordinates: [number, number]; // [lng, lat]
  city: string;
}

// Main User Document Interface
export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // Optional for safety when returning queries
  role: 'client' | 'freelancer' | 'super_admin';
  avatar?: string;
  location: ILocation;
  // Freelancer specific
  skills: ISkill[];
  hourlyRate?: number;
  portfolio: IPortfolioItem[];
  certifications: string[];
  experience?: Array<{
    title: string;
    company: string;
    startDate: string;
    endDate?: string;
    description?: string;
  }>;
  rating: number;
  reviewCount: number;
  completedGigsCount?: number;
  availability?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  profileViews?: number;
  resume?: {
    url: string;
    originalName?: string;
  };
  isVerified?: boolean;
  verificationToken?: string;
  verificationTokenExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordTokenExpires?: Date;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  isActive?: boolean;
  // Client specific
  companyName?: string;
  businessName?: string;
  bio?: string;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['client', 'freelancer', 'super_admin'],
      required: [true, 'Please specify a role'],
    },
    avatar: {
      type: String,
      default: '',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Please provide coordinates [lng, lat]'],
      },
      city: {
        type: String,
        required: [true, 'Please provide a city name'],
        trim: true,
      },
    },
    // Freelancer fields
    skills: [
      {
        name: { type: String, required: true },
        level: {
          type: String,
          enum: ['Beginner', 'Intermediate', 'Expert'],
          required: true,
        },
      },
    ],
    hourlyRate: {
      type: Number,
      min: 0,
    },
    portfolio: [
      {
        title: { type: String, required: true },
        description: { type: String, required: true },
        link: String,
      },
    ],
    certifications: [
      {
        type: String,
      },
    ],
    experience: [
      {
        title: { type: String, required: true },
        company: { type: String, required: true },
        startDate: { type: String, required: true },
        endDate: String,
        description: String,
      },
    ],
    rating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    completedGigsCount: {
      type: Number,
      default: 0,
    },
    availability: [
      {
        dayOfWeek: { type: Number, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
      },
    ],
    profileViews: {
      type: Number,
      default: 0,
    },
    resume: {
      url: { type: String },
      originalName: { type: String },
    },
    // Client fields
    companyName: {
      type: String,
      trim: true,
    },
    businessName: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    // Verification & Security
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationTokenExpires: Date,
    resetPasswordToken: String,
    resetPasswordTokenExpires: Date,
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create 2dsphere index for location coordination to support hyperlocal search
UserSchema.index({ location: '2dsphere' });

// Compare user password
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
