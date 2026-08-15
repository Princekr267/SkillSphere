"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const companyController_1 = require("../controllers/companyController");
const router = express_1.default.Router();
// All company routes require authentication
router.use(auth_1.protect);
// ─── Self-service routes ──────────────────────────────────────────────────────
router.post('/register', companyController_1.registerCompany);
router.get('/mine', companyController_1.getMyCompanies);
router.post('/join', companyController_1.joinCompanyByInviteKey);
router.get('/:id', companyController_1.getCompanyDetails);
router.get('/:id/members', companyController_1.getCompanyMembers);
router.get('/:id/gigs', companyController_1.getCompanyGigs);
router.post('/:id/regenerate-key', companyController_1.regenerateInviteKey);
router.put('/:id/resubmit', companyController_1.resubmitCompany);
exports.default = router;
