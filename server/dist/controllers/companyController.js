"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resubmitCompany = exports.getCompanyGigs = exports.joinCompanyByInviteKey = exports.regenerateInviteKey = exports.getCompanyMembers = exports.getCompanyDetails = exports.getMyCompanies = exports.registerCompany = void 0;
const crypto_1 = __importDefault(require("crypto"));
const Company_1 = __importDefault(require("../models/Company"));
const CompanyMembership_1 = __importDefault(require("../models/CompanyMembership"));
const Gig_1 = __importDefault(require("../models/Gig"));
// ─── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Generate a unique alphanumeric invite key (10 chars, uppercase).
 * Retries on collision (extremely rare given the key space).
 */
const generateUniqueInviteKey = async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
        const key = crypto_1.default.randomBytes(6).toString('hex').toUpperCase().slice(0, 10);
        const existing = await Company_1.default.findOne({ inviteKey: key });
        if (!existing)
            return key;
    }
    // Fallback: use more entropy if collisions keep happening
    return crypto_1.default.randomBytes(8).toString('hex').toUpperCase().slice(0, 10);
};
// ─── POST /api/companies/register ─────────────────────────────────────────────
/**
 * @desc    Register a new company application
 * @route   POST /api/companies/register
 * @access  Private — Client only
 */
const registerCompany = async (req, res) => {
    try {
        const user = req.user;
        if (!user || user.role !== 'client') {
            return res.status(403).json({ success: false, message: 'Only clients can register a company' });
        }
        const { name, industry, description, website, registrationDetails } = req.body;
        if (!name || !industry) {
            return res.status(400).json({ success: false, message: 'Company name and industry are required' });
        }
        if (!registrationDetails?.country || !registrationDetails?.city) {
            return res.status(400).json({ success: false, message: 'Registration details must include country and city' });
        }
        const inviteKey = await generateUniqueInviteKey();
        const company = await Company_1.default.create({
            name: name.trim(),
            industry: industry.trim(),
            description: description?.trim(),
            website: website?.trim(),
            registrationDetails: {
                businessRegistrationNumber: registrationDetails.businessRegistrationNumber?.trim(),
                taxId: registrationDetails.taxId?.trim(),
                country: registrationDetails.country.trim(),
                city: registrationDetails.city.trim(),
            },
            status: 'pending',
            inviteKey,
            createdBy: user._id,
        });
        // Create the owner membership immediately
        await CompanyMembership_1.default.create({
            userId: user._id,
            companyId: company._id,
            orgRole: 'owner',
        });
        return res.status(201).json({ success: true, company });
    }
    catch (err) {
        console.error('registerCompany error:', err);
        return res.status(500).json({ success: false, message: err.message || 'Server error registering company' });
    }
};
exports.registerCompany = registerCompany;
// ─── GET /api/companies/mine ──────────────────────────────────────────────────
/**
 * @desc    Get all companies the logged-in user is a member of
 * @route   GET /api/companies/mine
 * @access  Private
 */
const getMyCompanies = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Not authorised' });
        const memberships = await CompanyMembership_1.default.find({ userId: user._id })
            .populate('companyId')
            .sort({ joinedAt: -1 });
        const companies = memberships.map((m) => ({
            orgRole: m.orgRole,
            joinedAt: m.joinedAt,
            company: m.companyId,
        }));
        return res.json({ success: true, companies });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message || 'Server error fetching companies' });
    }
};
exports.getMyCompanies = getMyCompanies;
// ─── GET /api/companies/:id ───────────────────────────────────────────────────
/**
 * @desc    Get details for a specific company (members only)
 * @route   GET /api/companies/:id
 * @access  Private — Company member only
 */
const getCompanyDetails = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Not authorised' });
        const membership = await CompanyMembership_1.default.findOne({
            userId: user._id,
            companyId: req.params.id,
        });
        if (!membership) {
            return res.status(403).json({ success: false, message: 'You are not a member of this company' });
        }
        const company = await Company_1.default.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('reviewedBy', 'name email');
        if (!company)
            return res.status(404).json({ success: false, message: 'Company not found' });
        return res.json({ success: true, company, orgRole: membership.orgRole });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message || 'Server error fetching company' });
    }
};
exports.getCompanyDetails = getCompanyDetails;
// ─── GET /api/companies/:id/members ──────────────────────────────────────────
/**
 * @desc    Get all members of a company (members can view, owner sees full list)
 * @route   GET /api/companies/:id/members
 * @access  Private — Company member only
 */
const getCompanyMembers = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Not authorised' });
        const callerMembership = await CompanyMembership_1.default.findOne({
            userId: user._id,
            companyId: req.params.id,
        });
        if (!callerMembership) {
            return res.status(403).json({ success: false, message: 'You are not a member of this company' });
        }
        const members = await CompanyMembership_1.default.find({ companyId: req.params.id })
            .populate('userId', 'name email avatar location')
            .sort({ joinedAt: 1 });
        return res.json({ success: true, members });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message || 'Server error fetching members' });
    }
};
exports.getCompanyMembers = getCompanyMembers;
// ─── POST /api/companies/:id/regenerate-key ───────────────────────────────────
/**
 * @desc    Regenerate the invite key for a company (owner only, approved only)
 * @route   POST /api/companies/:id/regenerate-key
 * @access  Private — Company owner only
 */
const regenerateInviteKey = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Not authorised' });
        const membership = await CompanyMembership_1.default.findOne({
            userId: user._id,
            companyId: req.params.id,
            orgRole: 'owner',
        });
        if (!membership) {
            return res.status(403).json({ success: false, message: 'Only the company owner can regenerate the invite key' });
        }
        const company = await Company_1.default.findById(req.params.id);
        if (!company)
            return res.status(404).json({ success: false, message: 'Company not found' });
        if (company.status !== 'approved') {
            return res.status(400).json({ success: false, message: 'Company must be approved before managing invite keys' });
        }
        const newKey = await generateUniqueInviteKey();
        company.inviteKey = newKey;
        await company.save();
        return res.json({ success: true, inviteKey: newKey });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message || 'Server error regenerating invite key' });
    }
};
exports.regenerateInviteKey = regenerateInviteKey;
// ─── POST /api/companies/join ─────────────────────────────────────────────────
/**
 * @desc    Join a company using an invite key
 * @route   POST /api/companies/join
 * @access  Private — Client only
 */
const joinCompanyByInviteKey = async (req, res) => {
    try {
        const user = req.user;
        if (!user || user.role !== 'client') {
            return res.status(403).json({ success: false, message: 'Only clients can join a company' });
        }
        const { inviteKey } = req.body;
        if (!inviteKey || !inviteKey.trim()) {
            return res.status(400).json({ success: false, message: 'Invite key is required' });
        }
        const company = await Company_1.default.findOne({ inviteKey: inviteKey.trim().toUpperCase() });
        if (!company) {
            return res.status(404).json({ success: false, message: 'Invalid invite key — no company found' });
        }
        if (company.status !== 'approved') {
            return res.status(400).json({ success: false, message: 'This company is not yet active' });
        }
        // Check for existing membership to prevent duplicates
        const existing = await CompanyMembership_1.default.findOne({
            userId: user._id,
            companyId: company._id,
        });
        if (existing) {
            return res.status(400).json({ success: false, message: "You're already a member of this company" });
        }
        await CompanyMembership_1.default.create({
            userId: user._id,
            companyId: company._id,
            orgRole: 'member',
        });
        return res.status(201).json({
            success: true,
            company: {
                _id: company._id,
                name: company.name,
                industry: company.industry,
                status: company.status,
            },
        });
    }
    catch (err) {
        console.error('joinCompanyByInviteKey error:', err);
        return res.status(500).json({ success: false, message: err.message || 'Server error joining company' });
    }
};
exports.joinCompanyByInviteKey = joinCompanyByInviteKey;
// ─── GET /api/companies/:id/gigs ─────────────────────────────────────────────
/**
 * @desc    Get all gigs posted by any member of a company
 * @route   GET /api/companies/:id/gigs
 * @access  Private — Company member only
 */
const getCompanyGigs = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Not authorised' });
        const membership = await CompanyMembership_1.default.findOne({
            userId: user._id,
            companyId: req.params.id,
        });
        if (!membership) {
            return res.status(403).json({ success: false, message: 'You are not a member of this company' });
        }
        // Collect all member userIds for this company
        const allMemberships = await CompanyMembership_1.default.find({ companyId: req.params.id });
        const memberUserIds = allMemberships.map((m) => m.userId);
        const gigs = await Gig_1.default.find({ clientId: { $in: memberUserIds } })
            .populate('clientId', 'name email avatar companyName')
            .sort({ createdAt: -1 });
        return res.json({ success: true, gigs });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message || 'Server error fetching company gigs' });
    }
};
exports.getCompanyGigs = getCompanyGigs;
// ─── PUT /api/companies/:id/resubmit ─────────────────────────────────────────
/**
 * @desc    Owner edits and resubmits a rejected company application
 * @route   PUT /api/companies/:id/resubmit
 * @access  Private — Company owner only
 */
const resubmitCompany = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Not authorised' });
        const membership = await CompanyMembership_1.default.findOne({
            userId: user._id,
            companyId: req.params.id,
            orgRole: 'owner',
        });
        if (!membership) {
            return res.status(403).json({ success: false, message: 'Only the company owner can resubmit the application' });
        }
        const company = await Company_1.default.findById(req.params.id);
        if (!company)
            return res.status(404).json({ success: false, message: 'Company not found' });
        if (company.status !== 'rejected') {
            return res.status(400).json({ success: false, message: 'Only rejected applications can be resubmitted' });
        }
        const { name, industry, description, website, registrationDetails } = req.body;
        if (name)
            company.name = name.trim();
        if (industry)
            company.industry = industry.trim();
        if (description !== undefined)
            company.description = description?.trim();
        if (website !== undefined)
            company.website = website?.trim();
        if (registrationDetails) {
            company.registrationDetails = {
                businessRegistrationNumber: registrationDetails.businessRegistrationNumber?.trim(),
                taxId: registrationDetails.taxId?.trim(),
                country: registrationDetails.country?.trim() || company.registrationDetails.country,
                city: registrationDetails.city?.trim() || company.registrationDetails.city,
            };
        }
        // Reset back to pending and clear rejection data
        company.status = 'pending';
        company.rejectionReason = undefined;
        company.reviewedBy = undefined;
        company.reviewedAt = undefined;
        await company.save();
        return res.json({ success: true, company });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message || 'Server error resubmitting company' });
    }
};
exports.resubmitCompany = resubmitCompany;
