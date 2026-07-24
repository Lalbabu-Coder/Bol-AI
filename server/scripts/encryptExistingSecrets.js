import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Company } from '../models/Company.js';
import { encrypt } from '../utils/encryption.js';

// Resolve directory paths since we are running in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environments
dotenv.config({ path: path.join(__dirname, '../.env') });

const runMigration = async () => {
  const mongoUri = process.env.MONGO_URI;
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!mongoUri) {
    process.stderr.write('Migration failed: MONGO_URI is not set in environment variables.\n');
    process.exit(1);
  }

  if (!encryptionKey) {
    process.stderr.write('Migration failed: ENCRYPTION_KEY is not set in environment variables.\n');
    process.exit(1);
  }

  try {
    process.stdout.write('Connecting to database for secret encryption migration...\n');
    await mongoose.connect(mongoUri);
    process.stdout.write('Connected to Database. Querying companies...\n');

    const companies = await Company.find();
    let migrateCount = 0;

    for (const company of companies) {
      let isUpdated = false;

      // 1. WhatsApp Access Token Checks
      if (company.whatsappConfig?.accessToken) {
        const token = company.whatsappConfig.accessToken;
        // Plaintext tokens won't split into 3 parts (iv:tag:cipher)
        if (token.split(':').length !== 3) {
          process.stdout.write(`Encrypting WhatsApp Token for Company: ${company.name} (${company.slug})\n`);
          company.whatsappConfig.accessToken = token; // Hooks will automatically encrypt it on pre-save
          isUpdated = true;
        }
      }

      // 2. Twilio Voice Auth Token Checks
      if (company.voiceConfig?.twilioAuthToken) {
        const token = company.voiceConfig.twilioAuthToken;
        if (token.split(':').length !== 3) {
          process.stdout.write(`Encrypting Twilio Auth Token for Company: ${company.name} (${company.slug})\n`);
          company.voiceConfig.twilioAuthToken = token; // Hooks will automatically encrypt it on pre-save
          isUpdated = true;
        }
      }

      if (isUpdated) {
        // Mark config structures as modified to ensure mongoose validates and runs pre-save hooks
        company.markModified('whatsappConfig');
        company.markModified('voiceConfig');
        await company.save();
        migrateCount++;
      }
    }

    process.stdout.write(`Migration finished successfully. Updated secret credentials for ${migrateCount} companies.\n`);
    process.exit(0);
  } catch (err) {
    process.stderr.write(`Migration error: ${err.message}\n`);
    process.exit(1);
  }
};

runMigration();
