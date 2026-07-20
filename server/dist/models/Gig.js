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
// ─── Schema ──────────────────────────────────────────────────────────────────
const ApplicantSchema = new mongoose_1.Schema({
    freelancerId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, { _id: true });
const GigSchema = new mongoose_1.Schema({
    clientId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    isFlagged: {
        type: Boolean,
        default: false,
    },
    flagReason: {
        type: String,
    },
    milestones: [
        {
            title: { type: String, required: true },
            description: { type: String, required: true },
            status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
            fileUrl: { type: String },
            completedAt: { type: Date },
            dueDate: { type: Date },
        },
    ],
    progressLogs: [
        {
            message: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
        },
    ],
}, {
    timestamps: true,
});
// 2dsphere index for geospatial queries ($near, $geoWithin)
GigSchema.index({ location: '2dsphere' });
// Compound index for efficient filtering by status and category
GigSchema.index({ status: 1, category: 1 });
GigSchema.index({ clientId: 1 });
exports.default = mongoose_1.default.model('Gig', GigSchema);
