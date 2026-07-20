"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const bookingController_1 = require("../controllers/bookingController");
const router = express_1.default.Router();
router.use(auth_1.protect);
router.post('/', bookingController_1.createBooking);
router.get('/', bookingController_1.getBookings);
router.put('/:id/status', bookingController_1.updateBookingStatus);
exports.default = router;
