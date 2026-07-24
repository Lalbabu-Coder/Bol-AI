import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const createSuperadmin = async () => {
  const mongoUri = process.env.MONGO_URI;
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!mongoUri) {
    process.stderr.write('Error: MONGO_URI is missing in environment.\n');
    process.exit(1);
  }

  if (!email || !password) {
    process.stderr.write('Error: SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD are required in environment.\n');
    process.exit(1);
  }

  try {
    process.stdout.write('Connecting to MongoDB...\n');
    await mongoose.connect(mongoUri);

    process.stdout.write('Checking if superadmin already exists...\n');
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (existing.role === 'superadmin') {
        process.stdout.write(`Superadmin with email ${email} already exists.\n`);
        await mongoose.disconnect();
        process.exit(0);
      } else {
        process.stderr.write(`Error: A user with email ${email} exists but is not a superadmin.\n`);
        await mongoose.disconnect();
        process.exit(1);
      }
    }

    process.stdout.write('Creating new superadmin account...\n');
    const superadmin = await User.create({
      name: 'Super Admin',
      email: email.toLowerCase(),
      passwordHash: password, // hashed automatically by userSchema pre-save hook
      role: 'superadmin',
      companyId: undefined // Superadmins have no parent tenant scoping
    });

    process.stdout.write(`Superadmin successfully created! ID: ${superadmin._id}\n`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    process.stderr.write(`Fatal seeding error: ${err.message}\n`);
    await mongoose.disconnect();
    process.exit(1);
  }
};

createSuperadmin();
