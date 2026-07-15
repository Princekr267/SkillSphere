"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const disputeController_1 = require("../controllers/disputeController");
const router = express_1.default.Router();
router.post('/', auth_1.protect, upload_1.upload.single('evidence'), disputeController_1.raiseDispute);
router.get('/', auth_1.protect, disputeController_1.getDisputes);
router.put('/:id/resolve', auth_1.protect, disputeController_1.resolveDispute);
exports.default = router;
