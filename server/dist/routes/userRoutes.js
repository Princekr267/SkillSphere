"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = express_1.default.Router();
// Profile updates & queries
router.put('/profile', auth_1.protect, userController_1.updateUserProfile);
router.get('/:id', auth_1.protect, userController_1.getUserById);
// File uploads
router.post('/upload-resume', auth_1.protect, upload_1.upload.single('resume'), userController_1.uploadResume);
router.post('/avatar', auth_1.protect, upload_1.upload.single('avatar'), userController_1.uploadAvatar);
// File removals
router.delete('/avatar', auth_1.protect, userController_1.deleteAvatar);
router.delete('/resume', auth_1.protect, userController_1.deleteResume);
exports.default = router;
