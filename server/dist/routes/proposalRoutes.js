"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const proposalController_1 = require("../controllers/proposalController");
const router = express_1.default.Router();
router.post('/gig/:id', auth_1.protect, proposalController_1.createProposal);
router.get('/gig/:id', auth_1.protect, proposalController_1.getProposalsForGig);
router.put('/:proposalId/respond', auth_1.protect, proposalController_1.respondToProposal);
exports.default = router;
