import mongoose from 'mongoose';
import { config } from './config.js';

// Connection retries and state management
export const connectDB = async (retries = 3, delay = 2000) => {
  let targetUri = config.mongoUri;

  // Register event listeners once
  mongoose.connection.on('connected', () => {
    process.stdout.write('MongoDB Connection Status: CONNECTED\n');
  });

  mongoose.connection.on('error', (err) => {
    process.stderr.write(`MongoDB Connection Error: ${err.message}\n`);
  });

  mongoose.connection.on('disconnected', () => {
    process.stdout.write('MongoDB Connection Status: DISCONNECTED\n');
  });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(targetUri);
      return;
    } catch (err) {
      process.stderr.write(`MongoDB connection attempt ${attempt}/${retries} failed (${targetUri}): ${err.message}\n`);
      
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else if (targetUri !== 'mongodb://127.0.0.1:27017/bolo-ai-platform') {
        process.stdout.write('Primary MONGO_URI failed. Attempting fallback to local MongoDB (mongodb://127.0.0.1:27017/bolo-ai-platform)...\n');
        try {
          await mongoose.connect('mongodb://127.0.0.1:27017/bolo-ai-platform');
          return;
        } catch (localErr) {
          process.stderr.write(`Local MongoDB fallback failed: ${localErr.message}\n`);
        }
      }
    }
  }

  if (config.nodeEnv === 'development') {
    process.stderr.write('⚠️ Warning: Could not connect to MongoDB. Backend is running in offline mode. Please update MONGO_URI in .env with your valid MongoDB cluster hostname (replace "xxxxx" with your real Atlas cluster ID).\n');
  } else {
    process.stderr.write('Fatal: Max MongoDB connection retries exceeded. Exiting backend process.\n');
    process.exit(1);
  }
};
