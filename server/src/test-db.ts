import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/skillsphere';

console.log(`Attempting to connect to MongoDB at: ${mongoUri}`);

mongoose
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
