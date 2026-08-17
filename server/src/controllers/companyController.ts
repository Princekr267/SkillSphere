import crypto from 'crypto';
import { Response } from 'express';
import Company from '../models/Company';
import CompanyMembership from '../models/CompanyMembership';
import Gig from '../models/Gig';
import { AuthRequest } from '../middleware/auth';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a unique alphanumeric invite key (10 chars, uppercase).
 * Retries on collision (extremely rare given the key space).
 */
const generateUniqueInviteKey = async (): Promise<string> => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const key = crypto.randomBytes(6).toString('hex').toUpperCase().slice(0, 10);
    const existing = await Company.findOne({ inviteKey: key });
    if (!existing) return key;
  }
  // Fallback: use more entropy if collisions keep happening
  return crypto.randomBytes(8).toString('hex').toUpperCase().slice(0, 10);
};

// ─── POST /api/companies/register ─────────────────────────────────────────────

/**
 * @desc    Register a new company (instant access)
 * @route   POST /api/companies/register
 * @access  Private — Client only
 */
export const registerCompany = async (req: AuthRequest, res: Response): Promise<any> => {
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

    const company = await Company.create({
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
      inviteKey,
      createdBy: user._id,
    });

    // Create the owner membership immediately
    await CompanyMembership.create({
      userId: user._id,
      companyId: company._id,
      orgRole: 'owner',
    });

    return res.status(201).json({ success: true, company });
  } catch (err: any) {
    console.error('registerCompany error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error registering company' });
  }
};

// ─── GET /api/companies/mine ──────────────────────────────────────────────────

/**
 * @desc    Get all companies the logged-in user is a member of
 * @route   GET /api/companies/mine
 * @access  Private
 */
export const getMyCompanies = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Not authorised' });

    const memberships = await CompanyMembership.find({ userId: user._id })
      .populate('companyId')
      .sort({ joinedAt: -1 });

    const companies = memberships
      .filter((m) => m.companyId) // ensure company exists
      .map((m) => ({
        orgRole: m.orgRole,
        joinedAt: m.joinedAt,
        company: m.companyId,
      }));

    return res.json({ success: true, companies });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Server error fetching companies' });
  }
};

// ─── GET /api/companies/:id ───────────────────────────────────────────────────

/**
 * @desc    Get details for a specific company (members only)
 * @route   GET /api/companies/:id
 * @access  Private — Company member only
 */
export const getCompanyDetails = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Not authorised' });

    const membership = await CompanyMembership.findOne({
      userId: user._id,
      companyId: req.params.id,
    });
    if (!membership) {
      return res.status(403).json({ success: false, message: 'You are not a member of this company' });
    }

    const company = await Company.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    return res.json({ success: true, company, orgRole: membership.orgRole });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Server error fetching company' });
  }
};

// ─── GET /api/companies/:id/members ──────────────────────────────────────────

/**
 * @desc    Get all members of a company (members can view, owner sees full list)
 * @route   GET /api/companies/:id/members
 * @access  Private — Company member only
 */
export const getCompanyMembers = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Not authorised' });

    const callerMembership = await CompanyMembership.findOne({
      userId: user._id,
      companyId: req.params.id,
    });
    if (!callerMembership) {
      return res.status(403).json({ success: false, message: 'You are not a member of this company' });
    }

    const members = await CompanyMembership.find({ companyId: req.params.id })
      .populate('userId', 'name email avatar location')
      .sort({ joinedAt: 1 });

    return res.json({ success: true, members });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Server error fetching members' });
  }
};

// ─── POST /api/companies/:id/regenerate-key ───────────────────────────────────

/**
 * @desc    Regenerate the invite key for a company (owner only)
 * @route   POST /api/companies/:id/regenerate-key
 * @access  Private — Company owner only
 */
export const regenerateInviteKey = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Not authorised' });

    const membership = await CompanyMembership.findOne({
      userId: user._id,
      companyId: req.params.id,
      orgRole: 'owner',
    });
    if (!membership) {
      return res.status(403).json({ success: false, message: 'Only the company owner can regenerate the invite key' });
    }

    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    const newKey = await generateUniqueInviteKey();
    company.inviteKey = newKey;
    await company.save();

    return res.json({ success: true, inviteKey: newKey });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Server error regenerating invite key' });
  }
};

// ─── POST /api/companies/join ─────────────────────────────────────────────────

/**
 * @desc    Join a company using an invite key
 * @route   POST /api/companies/join
 * @access  Private — Client only
 */
export const joinCompanyByInviteKey = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({ success: false, message: 'Only clients can join a company' });
    }

    const { inviteKey } = req.body;
    if (!inviteKey || !inviteKey.trim()) {
      return res.status(400).json({ success: false, message: 'Invite key is required' });
    }

    const company = await Company.findOne({ inviteKey: inviteKey.trim().toUpperCase() });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Invalid invite key — no company found' });
    }

    // Check for existing membership to prevent duplicates
    const existing = await CompanyMembership.findOne({
      userId: user._id,
      companyId: company._id,
    });
    if (existing) {
      return res.status(400).json({ success: false, message: "You're already a member of this company" });
    }

    await CompanyMembership.create({
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
      },
    });
  } catch (err: any) {
    console.error('joinCompanyByInviteKey error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error joining company' });
  }
};

// ─── GET /api/companies/:id/gigs ─────────────────────────────────────────────

/**
 * @desc    Get all gigs posted by any member of a company
 * @route   GET /api/companies/:id/gigs
 * @access  Private — Company member only
 */
export const getCompanyGigs = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Not authorised' });

    const membership = await CompanyMembership.findOne({
      userId: user._id,
      companyId: req.params.id,
    });
    if (!membership) {
      return res.status(403).json({ success: false, message: 'You are not a member of this company' });
    }

    // Collect all member userIds for this company
    const allMemberships = await CompanyMembership.find({ companyId: req.params.id });
    const memberUserIds = allMemberships.map((m) => m.userId);

    const gigs = await Gig.find({ clientId: { $in: memberUserIds } })
      .populate('clientId', 'name email avatar companyName')
      .sort({ createdAt: -1 });

    return res.json({ success: true, gigs });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Server error fetching company gigs' });
  }
};

// ─── DELETE /api/companies/:companyId/members/:userId ────────────────────────

/**
 * @desc    Remove a member from a company (owner only)
 * @route   DELETE /api/companies/:companyId/members/:userId
 * @access  Private — Company owner only
 */
export const removeCompanyMember = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Not authorised' });

    const { companyId, userId } = req.params;

    // Check that requester is the owner of this company
    const requesterMembership = await CompanyMembership.findOne({
      userId: user._id,
      companyId,
      orgRole: 'owner',
    });
    if (!requesterMembership) {
      return res.status(403).json({ success: false, message: 'Only the company owner can remove members' });
    }

    // Block owner self-removal
    if (userId.toString() === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Owners cannot remove themselves. Transfer ownership or contact support to dissolve the company.',
      });
    }

    // Find the target membership
    const targetMembership = await CompanyMembership.findOne({
      userId,
      companyId,
    });
    if (!targetMembership) {
      return res.status(404).json({ success: false, message: 'Member not found in this company' });
    }

    // Protect against removing another owner
    if (targetMembership.orgRole === 'owner') {
      return res.status(400).json({ success: false, message: 'Cannot remove another owner' });
    }

    await CompanyMembership.findByIdAndDelete(targetMembership._id);

    return res.json({ success: true, message: 'Member removed successfully' });
  } catch (err: any) {
    console.error('removeCompanyMember error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error removing member' });
  }
};
