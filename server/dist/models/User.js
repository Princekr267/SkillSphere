"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const UserSchema = new mongoose_1.Schema({
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
        enum: ['client', 'freelancer', 'admin'],
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
    resumeUrl: {
        type: String,
    },
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
    // Client fields
    companyName: {
        type: String,
        trim: true,
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
}, {
    timestamps: true,
});
// Create 2dsphere index for location coordination to support hyperlocal search
UserSchema.index({ location: '2dsphere' });
// Compare user password
UserSchema.methods.comparePassword = async function (password) {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(password, this.password);
};
exports.default = mongoose_1.default.model('User', UserSchema);
