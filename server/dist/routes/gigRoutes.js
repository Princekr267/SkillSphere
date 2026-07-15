"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const gigController_1 = require("../controllers/gigController");
const messageController_1 = require("../controllers/messageController");
const router = express_1.default.Router();
// ─── Public routes ────────────────────────────────────────────────────────────
router.get('/', gigController_1.getGigs);
router.get('/nearby', gigController_1.getNearbyGigs);
// ─── Protected — specific named paths BEFORE :id wildcard ────────────────────
router.get('/my', auth_1.protect, gigController_1.getMyGigs);
router.get('/applications', auth_1.protect, gigController_1.getMyApplications);
// ─── Protected — single gig by ID ────────────────────────────────────────────
router.get('/:id', gigController_1.getGigById);
router.put('/:id', auth_1.protect, gigController_1.updateGig);
router.delete('/:id', auth_1.protect, gigController_1.deleteGig);
router.post('/:id/apply', auth_1.protect, gigController_1.applyToGig);
router.put('/:id/applicants/:applicantId', auth_1.protect, gigController_1.updateApplicantStatus);
router.put('/:id/release', auth_1.protect, gigController_1.releaseEscrow);
// ─── Messages ─────────────────────────────────────────────────────────────────
router.get('/:id/messages', auth_1.protect, messageController_1.getMessages);
router.post('/:id/messages', auth_1.protect, messageController_1.postMessage);
// ─── Protected — create ───────────────────────────────────────────────────────
router.post('/', auth_1.protect, gigController_1.createGig);
exports.default = router;
