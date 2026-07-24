import mongoose from 'mongoose';
import { config } from './config.js';

// Connection retries and state management
export const connectDB = async (retries = 5, delay = 5000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      mongoose.connection.on('connected', () => {
        // Safe operational status logging
        process.stdout.write('MongoDB Connection Status: CONNECTED\n');
      });

      mongoose.connection.on('error', (err) => {
        process.stderr.write(`MongoDB Connection Error: ${err.message}\n`);
      });

      mongoose.connection.on('disconnected', () => {
        process.stdout.write('MongoDB Connection Status: DISCONNECTED\n');
      });

      await mongoose.connect(config.mongoUri);
      return;
    } catch (err) {
      process.stderr.write(`MongoDB initial connection attempt ${attempt}/${retries} failed: ${err.message}\n`);
      
      if (attempt < retries) {
        process.stdout.write(`Retrying database connection in ${delay / 1000} seconds...\n`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        process.stderr.write('Fatal: Max MongoDB connection retries exceeded. Exiting backend process.\n');
        process.exit(1);
      }
    }
  }
};
