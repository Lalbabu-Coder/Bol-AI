import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const aiProvider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/bolo-ai-platform',
  jwtSecret: process.env.JWT_SECRET || 'super-secret-jwt-access-key-change-me-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'super-secret-jwt-refresh-key-change-me-in-production',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  encryptionKey: process.env.ENCRYPTION_KEY || '12345678901234567890123456789012',
  metaAppSecret: process.env.META_APP_SECRET || 'placeholder_will_replace_when_testing_whatsapp',
  nodeEnv: process.env.NODE_ENV || 'development',
  aiProvider,
  geminiApiKey: process.env.GEMINI_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY
};

// Validate required env vars depending on active AI Provider
if (aiProvider === 'gemini' && !process.env.GEMINI_API_KEY) {
  process.stderr.write('Warning: GEMINI_API_KEY is not defined in environment variables.\n');
} else if (aiProvider === 'openai' && !process.env.OPENAI_API_KEY) {
  process.stderr.write('Warning: OPENAI_API_KEY is not defined in environment variables.\n');
}
