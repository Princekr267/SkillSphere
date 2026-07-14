import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Gig from '../models/Gig';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import Notification from '../models/Notification';
import { sendNotification } from '../socket';


// ─── GIG CATEGORIES ──────────────────────────────────────────────────────────
export const GIG_CATEGORIES = [
  'Technology & Development',
  'Design & Creative',
  'Home & Trades',
  'Writing & Translation',
  'Marketing & Sales',
  'Teaching & Tutoring',
  'Other',
] as const;

// ─── CREATE GIG ──────────────────────────────────────────────────────────────
/**
 * @desc    Create a new gig
 * @route   POST /api/gigs
 * @access  Private — Client only
 */
export const createGig = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({ success: false, message: 'Only clients can post gigs' });
    }

    const { title, description, category, budget, budgetType, skillsRequired, radiusKm } = req.body;

    if (!title || !description || !category || budget === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description, category, and budget',
      });
    }

    const gig = await Gig.create({
      clientId: user._id,
      title: title.trim(),
      description: description.trim(),
      category,
      budget: Number(budget),
      budgetType: budgetType || 'fixed',
      skillsRequired: Array.isArray(skillsRequired) ? skillsRequired : [],
      location: user.location,      // Inherit client's registered location
      radiusKm: Number(radiusKm) || 25,
      status: 'open',
      escrowStatus: 'none',
    });

    res.status(201).json({ success: true, gig });
  } catch (error) {
    console.error('createGig error:', error);
    res.status(500).json({ success: false, message: 'Server error creating gig' });
  }
};

// ─── GET ALL GIGS (with filters) ─────────────────────────────────────────────
/**
 * @desc    Get all open gigs with optional filters
 * @route   GET /api/gigs
 * @access  Public
 */
export const getGigs = async (req: Request, res: Response) => {
  try {
    const { category, skills, status, search, page = '1', limit = '20' } = req.query;

    const filter: any = { status: status || 'open' };

    if (category) filter.category = category;
    if (skills) {
      const skillArr = (skills as string).split(',').map(s => s.trim()).filter(Boolean);
      if (skillArr.length > 0) filter.skillsRequired = { $in: skillArr };
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search as string, $options: 'i' } },
        { description: { $regex: search as string, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [gigs, total] = await Promise.all([
      Gig.find(filter)
        .populate('clientId', 'name companyName location rating avatar')
        .sort({ createdAt: -1 })

        .skip(skip)
        .limit(limitNum),
      Gig.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, total, page: pageNum, gigs });
  } catch (error) {
    console.error('getGigs error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching gigs' });
  }
};

// ─── GET NEARBY GIGS ─────────────────────────────────────────────────────────
/**
 * @desc    Get gigs near a coordinate using $near (2dsphere index)
 * @route   GET /api/gigs/nearby?lat=&lng=&radius=&category=&skills=
 * @access  Public
 */
export const getNearbyGigs = async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius = '50', category, skills, search } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng query parameters are required' });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const radiusMeters = parseFloat(radius as string) * 1000; // km → metres

    const locationFilter: any = {
      $near: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: radiusMeters,
      },
    };

    const filter: any = {
      status: 'open',
      'location': locationFilter,
    };

    if (category) filter.category = category;
    if (skills) {
      const skillArr = (skills as string).split(',').map(s => s.trim()).filter(Boolean);
      if (skillArr.length > 0) filter.skillsRequired = { $in: skillArr };
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search as string, $options: 'i' } },
        { description: { $regex: search as string, $options: 'i' } },
      ];
    }

    const gigs = await Gig.find(filter)
      .populate('clientId', 'name companyName location rating avatar')
      .limit(100);


    res.status(200).json({ success: true, count: gigs.length, gigs });
  } catch (error) {
    console.error('getNearbyGigs error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching nearby gigs' });
  }
};

// ─── GET SINGLE GIG ──────────────────────────────────────────────────────────
/**
 * @desc    Get a single gig by ID
 * @route   GET /api/gigs/:id
 * @access  Public
 */
export const getGigById = async (req: Request, res: Response) => {
  try {
    const gig = await Gig.findById(req.params.id)
      .populate('clientId', 'name companyName location rating reviewCount avatar')
      .populate('applicants.freelancerId', 'name skills hourlyRate rating location avatar');

    if (!gig) {
      return res.status(404).json({ success: false, message: 'Gig not found' });
    }

    res.status(200).json({ success: true, gig });
  } catch (error) {
    console.error('getGigById error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching gig' });
  }
};

// ─── GET MY GIGS (Client) ────────────────────────────────────────────────────
/**
 * @desc    Get all gigs posted by the logged-in client
 * @route   GET /api/gigs/my
 * @access  Private — Client only
 */
export const getMyGigs = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({ success: false, message: 'Only clients can access this route' });
    }

    const gigs = await Gig.find({ clientId: user._id })
      .populate('applicants.freelancerId', 'name skills hourlyRate rating location avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, gigs });
  } catch (error) {
    console.error('getMyGigs error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET MY APPLICATIONS (Freelancer) ────────────────────────────────────────
/**
 * @desc    Get all gigs a freelancer has applied to
 * @route   GET /api/gigs/applications
 * @access  Private — Freelancer only
 */
export const getMyApplications = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({ success: false, message: 'Only freelancers can access this route' });
    }

    const gigs = await Gig.find({
      'applicants.freelancerId': user._id,
    })
      .populate('clientId', 'name companyName location rating avatar')
      .sort({ updatedAt: -1 });


    // Enrich each gig response with the freelancer's own application status
    const result = gigs.map(gig => {
      const myApp = gig.applicants.find(
        a => a.freelancerId.toString() === (user._id as any).toString()
      );
      return {
        _id: gig._id,
        title: gig.title,
        category: gig.category,
        budget: gig.budget,
        budgetType: gig.budgetType,
        location: gig.location,
        status: gig.status,
        escrowStatus: gig.escrowStatus,
        clientId: gig.clientId,
        myApplication: myApp,
      };
    });

    res.status(200).json({ success: true, applications: result });
  } catch (error) {
    console.error('getMyApplications error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── UPDATE GIG ──────────────────────────────────────────────────────────────
/**
 * @desc    Update gig details
 * @route   PUT /api/gigs/:id
 * @access  Private — Owner client only
 */
export const updateGig = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const gig = await Gig.findById(req.params.id);

    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });
    if (gig.clientId.toString() !== (user?._id as any).toString()) {
      return res.status(403).json({ success: false, message: 'Not authorised to update this gig' });
    }

    const allowedUpdates = ['title', 'description', 'category', 'budget', 'budgetType', 'skillsRequired', 'radiusKm', 'status'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) (gig as any)[field] = req.body[field];
    });

    await gig.save();
    res.status(200).json({ success: true, gig });
  } catch (error) {
    console.error('updateGig error:', error);
    res.status(500).json({ success: false, message: 'Server error updating gig' });
  }
};

// ─── DELETE GIG ──────────────────────────────────────────────────────────────
/**
 * @desc    Delete a gig
 * @route   DELETE /api/gigs/:id
 * @access  Private — Owner client only
 */
export const deleteGig = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const gig = await Gig.findById(req.params.id);

    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });
    if (gig.clientId.toString() !== (user?._id as any).toString()) {
      return res.status(403).json({ success: false, message: 'Not authorised to delete this gig' });
    }

    await gig.deleteOne();
    res.status(200).json({ success: true, message: 'Gig removed' });
  } catch (error) {
    console.error('deleteGig error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting gig' });
  }
};

// ─── APPLY TO GIG ────────────────────────────────────────────────────────────
/**
 * @desc    Freelancer applies to a gig
 * @route   POST /api/gigs/:id/apply
 * @access  Private — Freelancer only
 */
export const applyToGig = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({ success: false, message: 'Only freelancers can apply to gigs' });
    }

    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'A cover message is required' });
    }

    const gig = await Gig.findById(req.params.id);
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });
    if (gig.status !== 'open') {
      return res.status(400).json({ success: false, message: 'This gig is no longer accepting applications' });
    }

    // Check for duplicate application
    const alreadyApplied = gig.applicants.some(
      a => a.freelancerId.toString() === (user._id as any).toString()
    );
    if (alreadyApplied) {
      return res.status(400).json({ success: false, message: 'You have already applied to this gig' });
    }

    gig.applicants.push({
      freelancerId: user._id as any,
      message: message.trim(),
      appliedAt: new Date(),
      status: 'pending',
    });

    await gig.save();

    // Trigger notification
    const notif = await Notification.create({
      userId: gig.clientId,
      type: 'new_application',
      title: 'New Application Received',
      body: `${user.name} applied to "${gig.title}"`,
      link: `/client-dashboard`,
    });
    sendNotification(gig.clientId.toString(), notif);

    res.status(200).json({ success: true, message: 'Application submitted successfully' });
  } catch (error) {
    console.error('applyToGig error:', error);
    res.status(500).json({ success: false, message: 'Server error submitting application' });
  }
};

// ─── UPDATE APPLICANT STATUS (Accept / Reject) ────────────────────────────────
/**
 * @desc    Client accepts or rejects a freelancer's application
 * @route   PUT /api/gigs/:id/applicants/:applicantId
 * @access  Private — Owner client only
 */
export const updateApplicantStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be accepted or rejected' });
    }

    const gig = await Gig.findById(req.params.id);
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });
    if (gig.clientId.toString() !== (user?._id as any).toString()) {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }


    const applicant = gig.applicants.find(
      a => a._id!.toString() === req.params.applicantId
    );
    if (!applicant) return res.status(404).json({ success: false, message: 'Applicant not found' });


    applicant.status = status;

    if (status === 'accepted') {
      // Reject all other applicants automatically
      gig.applicants.forEach(a => {
        if (a._id!.toString() !== req.params.applicantId) a.status = 'rejected';
      });
      gig.status = 'in_progress';
      gig.acceptedFreelancerId = applicant.freelancerId;
      gig.escrowStatus = 'funds_deposited'; // Simulated escrow
    }

    await gig.save();

    // Trigger notification
    const notif = await Notification.create({
      userId: applicant.freelancerId,
      type: status === 'accepted' ? 'application_accepted' : 'application_rejected',
      title: status === 'accepted' ? 'Application Accepted!' : 'Application Declined',
      body: status === 'accepted'
        ? `Your application for "${gig.title}" was accepted!`
        : `Your application for "${gig.title}" was declined.`,
      link: `/freelancer-dashboard`,
    });
    sendNotification(applicant.freelancerId.toString(), notif);

    res.status(200).json({ success: true, gig });
  } catch (error) {
    console.error('updateApplicantStatus error:', error);
    res.status(500).json({ success: false, message: 'Server error updating applicant' });
  }
};

// ─── ESCROW: RELEASE FUNDS ────────────────────────────────────────────────────
/**
 * @desc    Client marks gig as complete and releases simulated escrow funds
 * @route   PUT /api/gigs/:id/release
 * @access  Private — Owner client only
 */
export const releaseEscrow = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const gig = await Gig.findById(req.params.id);

    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });
    if (gig.clientId.toString() !== (user?._id as any).toString()) {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }
    if (gig.escrowStatus !== 'funds_deposited') {
      return res.status(400).json({ success: false, message: 'Funds have not been deposited or already released' });
    }

    gig.escrowStatus = 'released';
    gig.status = 'completed';

    // Update the accepted freelancer's rating average (simple increment)
    if (gig.acceptedFreelancerId) {
      const freelancer = await User.findById(gig.acceptedFreelancerId);
      if (freelancer) {
        const totalScore = freelancer.rating * freelancer.reviewCount + 5; // Default 5-star release bonus
        freelancer.reviewCount += 1;
        freelancer.rating = parseFloat((totalScore / freelancer.reviewCount).toFixed(2));
        await freelancer.save();
      }
    }

    await gig.save();

    // Trigger notification
    if (gig.acceptedFreelancerId) {
      const notif = await Notification.create({
        userId: gig.acceptedFreelancerId,
        type: 'escrow_released',
        title: 'Escrow Funds Released',
        body: `Client released funds for "${gig.title}". Gig completed!`,
        link: `/freelancer-dashboard`,
      });
      sendNotification(gig.acceptedFreelancerId.toString(), notif);
    }

    res.status(200).json({ success: true, message: 'Funds released. Gig marked complete.', gig });
  } catch (error) {
    console.error('releaseEscrow error:', error);
    res.status(500).json({ success: false, message: 'Server error releasing escrow' });
  }
};
