import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Gig from '../models/Gig';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import Notification from '../models/Notification';
import { sendNotification } from '../socket';
import { moderateText } from '../services/moderationService';
import Warning from '../models/Warning';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

const isCloudinaryConfigured = (): boolean => {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  return !!(
    cloud && key && secret &&
    cloud !== 'placeholder_cloud_name' &&
    key !== 'placeholder_api_key' &&
    secret !== 'placeholder_api_secret'
  );
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}


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

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Email verification required. Please verify your email address to post new gigs.',
      });
    }

    const { title, description, category, budget, budgetType, skillsRequired, radiusKm } = req.body;

    if (!title || !description || !category || budget === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description, category, and budget',
      });
    }

    // Moderation scan
    const scanText = `${title} ${description}`;
    const moderation = await moderateText(scanText);
    const isFlagged = moderation.isToxic;
    const flagReason = moderation.reason || '';

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
      isFlagged,
      flagReason,
    });

    if (isFlagged) {
      await Warning.create({
        type: 'gig',
        targetId: gig._id,
        offenderId: user._id,
        content: `Title: ${gig.title} | Desc: ${gig.description}`,
        reason: flagReason,
      });

      const notif = await Notification.create({
        userId: user._id,
        type: 'gig_flagged',
        title: 'Gig Flagged for Moderation',
        body: `Your gig "${gig.title.substring(0, 30)}" has been flagged by platform safety: ${flagReason}`,
        link: `/client-dashboard`,
      });
      sendNotification(user._id.toString(), notif);
    }

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
    const { category, skills, status, search, minPrice, maxPrice, minRating, page = '1', limit = '20' } = req.query;

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

    if (minPrice || maxPrice) {
      filter.budget = {};
      if (minPrice) filter.budget.$gte = Number(minPrice);
      if (maxPrice) filter.budget.$lte = Number(maxPrice);
    }

    if (minRating) {
      const clients = await User.find({ role: 'client', rating: { $gte: Number(minRating) } }).select('_id');
      const clientIds = clients.map(c => c._id);
      filter.clientId = { $in: clientIds };
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
    const { lat, lng, radius = '50', category, skills, search, minPrice, maxPrice, minRating } = req.query;

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

    if (minPrice || maxPrice) {
      filter.budget = {};
      if (minPrice) filter.budget.$gte = Number(minPrice);
      if (maxPrice) filter.budget.$lte = Number(maxPrice);
    }

    if (minRating) {
      const clients = await User.find({ role: 'client', rating: { $gte: Number(minRating) } }).select('_id');
      const clientIds = clients.map(c => c._id);
      filter.clientId = { $in: clientIds };
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

    // Automated 24-hour deadline reminder checks
    if (gig.status === 'in_progress' && gig.acceptedFreelancerId && gig.milestones.length > 0) {
      const now = new Date();
      for (const m of gig.milestones) {
        if (m.status === 'pending' && m.dueDate) {
          const timeDiff = new Date(m.dueDate).getTime() - now.getTime();
          const hoursDiff = timeDiff / (1000 * 3600);
          if (hoursDiff > 0 && hoursDiff <= 24) {
            // Check if reminder was already dispatched in notifications database to prevent duplicates
            const existingNotif = await Notification.findOne({
              userId: gig.acceptedFreelancerId,
              title: 'Milestone Deadline Nearing',
              body: new RegExp(m.title, 'i')
            });

            if (!existingNotif) {
              const notif = await Notification.create({
                userId: gig.acceptedFreelancerId,
                type: 'gig_flagged',
                title: 'Milestone Deadline Nearing',
                body: `Reminder: The milestone "${m.title}" is due soon (in ${Math.round(hoursDiff)} hours)!`,
                link: `/gig/${gig._id}`,
              });
              sendNotification(gig.acceptedFreelancerId.toString(), notif);
            }
          }
        }
      }
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
        freelancer.completedGigsCount = (freelancer.completedGigsCount || 0) + 1;
        await freelancer.save();
      }
    }

    // Also update client completedGigsCount
    const client = await User.findById(gig.clientId);
    if (client) {
      client.completedGigsCount = (client.completedGigsCount || 0) + 1;
      await client.save();
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

/**
 * @desc    Add milestones to a gig
 * @route   POST /api/gigs/:id/milestones
 * @access  Private — Participants only
 */
export const addMilestones = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { milestones } = req.body;
    if (!Array.isArray(milestones) || milestones.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide milestones list array' });
    }

    const gig = await Gig.findById(req.params.id);
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });

    const userIdStr = req.user?._id.toString();
    const isParticipant =
      gig.clientId.toString() === userIdStr ||
      gig.acceptedFreelancerId?.toString() === userIdStr;

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Not authorised to set milestones' });
    }

    gig.milestones = milestones.map(m => ({
      title: m.title,
      description: m.description,
      status: 'pending',
      dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
    }));

    gig.progressLogs.push({
      message: `${req.user?.name} defined new milestones list tracker.`,
      createdAt: new Date(),
    });

    await gig.save();

    // Notify other user
    const otherUserId = gig.clientId.toString() === userIdStr ? gig.acceptedFreelancerId : gig.clientId;
    if (otherUserId) {
      const notif = await Notification.create({
        userId: otherUserId,
        type: 'new_application',
        title: 'Project Milestones Setup',
        body: `${req.user?.name} has added progress milestones tracking to "${gig.title.substring(0, 30)}"`,
        link: `/gig/${gig._id}`,
      });
      sendNotification(otherUserId.toString(), notif);
    }

    return res.json({ success: true, gig });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Mark a milestone completed and attach optional deliverable file
 * @route   PUT /api/gigs/:id/milestones/:milestoneId
 * @access  Private — Accepted freelancer only
 */
export const updateMilestone = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });

    if (gig.acceptedFreelancerId?.toString() !== req.user?._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the assigned freelancer can complete milestones' });
    }

    // Find milestone in array subdocuments
    const milestone = (gig.milestones as any).id(req.params.milestoneId);
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });

    // File upload deliverable logic
    let deliverableUrl = milestone.fileUrl;
    if (req.file) {
      if (isCloudinaryConfigured()) {
        try {
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'skillsphere_deliverables',
          });
          deliverableUrl = result.secure_url;
          fs.unlinkSync(req.file.path);
        } catch (cloudError) {
          console.error('Cloudinary deliverable upload error, local fallback:', cloudError);
          const serverUrl = `${req.protocol}://${req.get('host')}`;
          deliverableUrl = `${serverUrl}/uploads/${req.file.filename}`;
        }
      } else {
        const serverUrl = `${req.protocol}://${req.get('host')}`;
        deliverableUrl = `${serverUrl}/uploads/${req.file.filename}`;
      }
    }

    milestone.status = 'completed';
    milestone.completedAt = new Date();
    if (deliverableUrl) {
      milestone.fileUrl = deliverableUrl;
    }

    gig.progressLogs.push({
      message: `Freelancer completed milestone: "${milestone.title}".`,
      createdAt: new Date(),
    });

    await gig.save();

    // Notify client
    const notif = await Notification.create({
      userId: gig.clientId,
      type: 'gig_flagged',
      title: 'Milestone Completed!',
      body: `${req.user?.name} completed "${milestone.title}". Deliverables are attached.`,
      link: `/gig/${gig._id}`,
    });
    sendNotification(gig.clientId.toString(), notif);

    // If all milestones completed, send a release reminder
    const allCompleted = gig.milestones.every(m => m.status === 'completed');
    if (allCompleted) {
      const releaseNotif = await Notification.create({
        userId: gig.clientId,
        type: 'gig_flagged',
        title: 'Release Escrow Funds',
        body: `All milestones completed for "${gig.title}". Review deliverables and release payment escrow.`,
        link: `/gig/${gig._id}`,
      });
      sendNotification(gig.clientId.toString(), releaseNotif);
    }

    return res.json({ success: true, gig });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Add custom message progress log entry
 * @route   POST /api/gigs/:id/progress-logs
 * @access  Private — Participants only
 */
export const addProgressLog = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

    const gig = await Gig.findById(req.params.id);
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });

    const userIdStr = req.user?._id.toString();
    const isParticipant =
      gig.clientId.toString() === userIdStr ||
      gig.acceptedFreelancerId?.toString() === userIdStr;

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Not authorised to log progress' });
    }

    gig.progressLogs.push({
      message: `${req.user?.name}: ${message}`,
      createdAt: new Date(),
    });

    await gig.save();
    return res.json({ success: true, gig });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Upload an attachment for a chat message
 * @route   POST /api/gigs/messages/upload
 * @access  Private
 */
export const uploadMessageAttachment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    res.status(200).json({
      success: true,
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Attachment upload failed', error: error.message });
  }
};
