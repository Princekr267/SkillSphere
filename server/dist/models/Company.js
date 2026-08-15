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
const CompanySchema = new mongoose_1.Schema({
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
    },
    registrationDetails: {
        businessRegistrationNumber: { type: String, trim: true },
        taxId: { type: String, trim: true },
        country: { type: String, required: [true, 'Country is required'], trim: true },
        city: { type: String, required: [true, 'City is required'], trim: true },
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
    rejectionReason: {
        type: String,
        trim: true,
    },
    inviteKey: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Company must have a creator'],
    },
    reviewedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    reviewedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});
// ─── Indexes ─────────────────────────────────────────────────────────────────
// Unique index on inviteKey for fast join-by-key lookups
CompanySchema.index({ inviteKey: 1 }, { unique: true });
// Index for admin pending-review queries
CompanySchema.index({ status: 1, createdAt: -1 });
// Index for looking up companies owned/created by a user
CompanySchema.index({ createdBy: 1 });
exports.default = mongoose_1.default.model('Company', CompanySchema);
