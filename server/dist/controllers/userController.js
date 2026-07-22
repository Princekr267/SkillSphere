"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteResume = exports.deleteAvatar = exports.getFreelancerAnalytics = exports.updateAvailability = exports.getUserById = exports.uploadAvatar = exports.uploadResume = exports.updateUserProfile = void 0;
const cloudinary_1 = require("cloudinary");
const fs_1 = __importDefault(require("fs"));
const User_1 = __importDefault(require("../models/User"));
const Proposal_1 = __importDefault(require("../models/Proposal"));
const Payment_1 = __importDefault(require("../models/Payment"));
// Configure Cloudinary only if credentials are not default placeholders
const isCloudinaryConfigured = () => {
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const key = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    return !!(cloud && key && secret &&
        cloud !== 'placeholder_cloud_name' &&
        key !== 'placeholder_api_key' &&
        secret !== 'placeholder_api_secret');
};
const configureCloudinary = () => {
    if (isCloudinaryConfigured()) {
        cloudinary_1.v2.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
    }
};
/**
 * @desc    Update user profile details
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateUserProfile = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const { name, city, latitude, longitude, 
        // Client specific
        companyName, bio, 
        // Freelancer specific
        skills, hourlyRate, portfolio, certifications, experience, } = req.body;
        // 1. General Profile Updates
        if (name)
            user.name = name;
        // 2. Location Updates (if provided)
        if (city && latitude !== undefined && longitude !== undefined) {
            user.location = {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)],
                city,
            };
        }
        // 3. Role-specific Updates
        if (user.role === 'client') {
            if (companyName !== undefined)
                user.companyName = companyName;
            if (bio !== undefined)
                user.bio = bio;
        }
        else if (user.role === 'freelancer') {
            if (skills !== undefined)
                user.skills = skills;
            if (hourlyRate !== undefined)
                user.hourlyRate = Number(hourlyRate);
            if (portfolio !== undefined)
                user.portfolio = portfolio;
            if (certifications !== undefined)
                user.certifications = certifications;
            if (experience !== undefined)
                user.experience = experience;
        }
        const updatedUser = await user.save();
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                location: updatedUser.location,
                companyName: updatedUser.companyName,
                bio: updatedUser.bio,
                skills: updatedUser.skills,
                portfolio: updatedUser.portfolio,
                hourlyRate: updatedUser.hourlyRate,
                resumeUrl: updatedUser.resumeUrl,
                certifications: updatedUser.certifications,
                experience: updatedUser.experience,
                rating: updatedUser.rating,
                reviewCount: updatedUser.reviewCount,
            },
        });
    }
    catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating profile. Make sure format is correct.',
            error: error.message,
        });
    }
};
exports.updateUserProfile = updateUserProfile;
/**
 * @desc    Upload user resume/portfolio document
 * @route   POST /api/users/upload-resume
 * @access  Private
 */
const uploadResume = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload a file' });
        }
        let fileUrl = '';
        if (isCloudinaryConfigured()) {
            // Upload to Cloudinary
            try {
                configureCloudinary();
                const result = await cloudinary_1.v2.uploader.upload(req.file.path, {
                    resource_type: 'auto',
                    folder: 'skillsphere_resumes',
                });
                fileUrl = result.secure_url;
                // Clean up the local temp file saved by multer
                fs_1.default.unlinkSync(req.file.path);
            }
            catch (cloudError) {
                console.error('Cloudinary upload failure, falling back to local storage:', cloudError);
                // Fallback to local file URL
                const serverUrl = `${req.protocol}://${req.get('host')}`;
                fileUrl = `${serverUrl}/uploads/${req.file.filename}`;
            }
        }
        else {
            // Cloudinary not configured, serve locally
            const serverUrl = `${req.protocol}://${req.get('host')}`;
            fileUrl = `${serverUrl}/uploads/${req.file.filename}`;
        }
        // Save url to User document
        const user = await User_1.default.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        user.resumeUrl = fileUrl;
        await user.save();
        res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            resumeUrl: fileUrl,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                location: user.location,
                companyName: user.companyName,
                bio: user.bio,
                skills: user.skills,
                portfolio: user.portfolio,
                hourlyRate: user.hourlyRate,
                resumeUrl: user.resumeUrl,
                certifications: user.certifications,
                rating: user.rating,
                reviewCount: user.reviewCount,
                avatar: user.avatar,
            },
        });
    }
    catch (error) {
        console.error('File Upload Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error uploading file.',
            error: error.message,
        });
    }
};
exports.uploadResume = uploadResume;
/**
 * @desc    Upload user profile avatar
 * @route   POST /api/users/avatar
 * @access  Private
 */
const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload an image' });
        }
        let fileUrl = '';
        if (isCloudinaryConfigured()) {
            try {
                configureCloudinary();
                const result = await cloudinary_1.v2.uploader.upload(req.file.path, {
                    folder: 'skillsphere_avatars',
                    transformation: [{ width: 400, height: 400, crop: 'limit' }],
                });
                fileUrl = result.secure_url;
                fs_1.default.unlinkSync(req.file.path);
            }
            catch (cloudError) {
                console.error('Cloudinary avatar upload failure, falling back to local:', cloudError);
                const serverUrl = `${req.protocol}://${req.get('host')}`;
                fileUrl = `${serverUrl}/uploads/${req.file.filename}`;
            }
        }
        else {
            const serverUrl = `${req.protocol}://${req.get('host')}`;
            fileUrl = `${serverUrl}/uploads/${req.file.filename}`;
        }
        const user = await User_1.default.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        user.avatar = fileUrl;
        await user.save();
        res.status(200).json({
            success: true,
            message: 'Avatar uploaded successfully',
            avatarUrl: fileUrl,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                location: user.location,
                companyName: user.companyName,
                bio: user.bio,
                skills: user.skills,
                portfolio: user.portfolio,
                hourlyRate: user.hourlyRate,
                resumeUrl: user.resumeUrl,
                certifications: user.certifications,
                rating: user.rating,
                reviewCount: user.reviewCount,
                avatar: user.avatar,
            },
        });
    }
    catch (error) {
        console.error('Avatar Upload Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error uploading avatar.',
            error: error.message,
        });
    }
};
exports.uploadAvatar = uploadAvatar;
/**
 * @desc    Get user profile by ID
 * @route   GET /api/users/:id
 * @access  Private
 */
const getUserById = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Increment profileViews count if user is a freelancer
        if (user.role === 'freelancer') {
            user.profileViews = (user.profileViews || 0) + 1;
            await user.save();
        }
        res.status(200).json({ success: true, user });
    }
    catch (error) {
        console.error('getUserById error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching user profile' });
    }
};
exports.getUserById = getUserById;
/**
 * @desc    Update freelancer availability weekly schedule
 * @route   PUT /api/users/profile/availability
 * @access  Private — Freelancers only
 */
const updateAvailability = async (req, res) => {
    try {
        const { availability } = req.body;
        if (!Array.isArray(availability)) {
            return res.status(400).json({ success: false, message: 'Availability must be an array' });
        }
        const user = await User_1.default.findById(req.user._id);
        if (!user || user.role !== 'freelancer') {
            return res.status(403).json({ success: false, message: 'Only freelancers can update availability' });
        }
        user.availability = availability;
        await user.save();
        return res.json({ success: true, message: 'Availability updated successfully', user });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.updateAvailability = updateAvailability;
/**
 * @desc    Get freelancer analytics totals and chart parameters
 * @route   GET /api/users/freelancer/analytics
 * @access  Private — Freelancers only
 */
const getFreelancerAnalytics = async (req, res) => {
    try {
        const user = req.user;
        if (!user || user.role !== 'freelancer') {
            return res.status(403).json({ success: false, message: 'Only freelancers can access analytics' });
        }
        const freelancerId = user._id;
        // 1. Applications Count
        const applicationCount = await Proposal_1.default.countDocuments({ freelancerId });
        // 2. Total Earnings
        const earningsAggregation = await Payment_1.default.aggregate([
            { $match: { freelancerId, status: 'released' } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        const totalEarnings = earningsAggregation[0]?.total || 0;
        // 3. Monthly Earnings
        const monthlyAggregation = await Payment_1.default.aggregate([
            { $match: { freelancerId, status: 'released' } },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    total: { $sum: '$amount' },
                },
            },
            { $sort: { '_id': 1 } },
        ]);
        const monthlyEarnings = Array(12).fill(0);
        monthlyAggregation.forEach((item) => {
            if (item._id >= 1 && item._id <= 12) {
                monthlyEarnings[item._id - 1] = item.total;
            }
        });
        return res.json({
            success: true,
            analytics: {
                profileViews: user.profileViews || 0,
                applicationCount,
                totalEarnings,
                monthlyEarnings,
                rating: user.rating,
                reviewCount: user.reviewCount,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getFreelancerAnalytics = getFreelancerAnalytics;
/**
 * Helper: delete a local /uploads file if the url points to this server
 */
const deleteLocalFile = (url, host) => {
    try {
        if (url.includes(host)) {
            const filename = url.split('/uploads/').pop();
            if (filename) {
                const filePath = `uploads/${filename}`;
                if (fs_1.default.existsSync(filePath))
                    fs_1.default.unlinkSync(filePath);
            }
        }
    }
    catch (e) {
        console.warn('Could not delete local file:', e);
    }
};
/**
 * @desc    Remove user profile avatar
 * @route   DELETE /api/users/avatar
 * @access  Private
 */
const deleteAvatar = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (user.avatar) {
            // Try to delete from Cloudinary if configured
            if (isCloudinaryConfigured() && user.avatar.includes('cloudinary')) {
                try {
                    configureCloudinary();
                    // Extract public_id from url
                    const parts = user.avatar.split('/');
                    const fileWithExt = parts[parts.length - 1];
                    const publicId = `skillsphere_avatars/${fileWithExt.split('.')[0]}`;
                    await cloudinary_1.v2.uploader.destroy(publicId);
                }
                catch (e) {
                    console.warn('Cloudinary avatar delete failed:', e);
                }
            }
            else {
                // Delete local file
                deleteLocalFile(user.avatar, req.get('host') || '');
            }
        }
        user.avatar = undefined;
        await user.save();
        const userObj = {
            _id: user._id, name: user.name, email: user.email, role: user.role,
            location: user.location, companyName: user.companyName, bio: user.bio,
            skills: user.skills, portfolio: user.portfolio, hourlyRate: user.hourlyRate,
            resumeUrl: user.resumeUrl, certifications: user.certifications,
            rating: user.rating, reviewCount: user.reviewCount, avatar: user.avatar,
        };
        res.status(200).json({ success: true, message: 'Avatar removed successfully', user: userObj });
    }
    catch (error) {
        console.error('Delete Avatar Error:', error);
        res.status(500).json({ success: false, message: 'Server error removing avatar.' });
    }
};
exports.deleteAvatar = deleteAvatar;
/**
 * @desc    Remove user resume
 * @route   DELETE /api/users/resume
 * @access  Private
 */
const deleteResume = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (user.resumeUrl) {
            if (isCloudinaryConfigured() && user.resumeUrl.includes('cloudinary')) {
                try {
                    configureCloudinary();
                    const parts = user.resumeUrl.split('/');
                    const fileWithExt = parts[parts.length - 1];
                    const publicId = `skillsphere_resumes/${fileWithExt.split('.')[0]}`;
                    try {
                        await cloudinary_1.v2.uploader.destroy(publicId);
                    }
                    catch (destroyErr) {
                        await cloudinary_1.v2.uploader.destroy(publicId, { resource_type: 'raw' });
                    }
                }
                catch (e) {
                    console.warn('Cloudinary resume delete failed:', e);
                }
            }
            else {
                deleteLocalFile(user.resumeUrl, req.get('host') || '');
            }
        }
        user.resumeUrl = undefined;
        await user.save();
        const userObj = {
            _id: user._id, name: user.name, email: user.email, role: user.role,
            location: user.location, companyName: user.companyName, bio: user.bio,
            skills: user.skills, portfolio: user.portfolio, hourlyRate: user.hourlyRate,
            resumeUrl: user.resumeUrl, certifications: user.certifications,
            rating: user.rating, reviewCount: user.reviewCount, avatar: user.avatar,
        };
        res.status(200).json({ success: true, message: 'Resume removed successfully', user: userObj });
    }
    catch (error) {
        console.error('Delete Resume Error:', error);
        res.status(500).json({ success: false, message: 'Server error removing resume.' });
    }
};
exports.deleteResume = deleteResume;
