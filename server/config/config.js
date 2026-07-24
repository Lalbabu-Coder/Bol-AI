import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const requiredEnvs = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'CLIENT_URL', 'ENCRYPTION_KEY', 'META_APP_SECRET'];
const missingEnvs = requiredEnvs.filter((env) => !process.env[env]);

if (missingEnvs.length > 0) {
  throw new Error(`Fatal Configuration Error: Missing environment variables: ${missingEnvs.join(', ')}`);
}

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  clientUrl: process.env.CLIENT_URL,
  encryptionKey: process.env.ENCRYPTION_KEY,
  metaAppSecret: process.env.META_APP_SECRET,
  nodeEnv: process.env.NODE_ENV || 'development'
};
