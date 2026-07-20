"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const aiController_1 = require("../controllers/aiController");
const router = express_1.default.Router();
router.get('/recommend/:gigId', auth_1.protect, aiController_1.getRecommendedFreelancers);
router.get('/trending-skills', aiController_1.getTrendingSkills);
router.post('/draft-proposal', auth_1.protect, aiController_1.draftProposalCoverLetter);
exports.default = router;
