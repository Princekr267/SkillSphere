"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/skillsphere';
console.log(`Attempting to connect to MongoDB at: ${mongoUri}`);
mongoose_1.default
    .connect(mongoUri)
    .then((conn) => {
    console.log(`Success! Connected to MongoDB host: ${conn.connection.host}`);
    process.exit(0);
})
    .catch((err) => {
    console.error(`Failed to connect to MongoDB!`);
    console.error(err);
    process.exit(1);
});
