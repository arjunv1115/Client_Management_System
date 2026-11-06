import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'cms-local-development-secret-change-in-production',
  jwtExpires: process.env.JWT_EXPIRES || '7d',

  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },

  ai: {
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: (process.env.AI_API_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: process.env.AI_MODEL || 'gpt-4o-mini',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/integrations/google/callback',
  },

  email: {
    apiKey: process.env.EMAIL_SERVICE_API_KEY || '',
    from: process.env.EMAIL_FROM || 'no-reply@cms.local',
  },

  uploadsDir: path.resolve(__dirname, '../uploads'),
  dataDir: path.resolve(__dirname, '../data'),
  isProduction: (process.env.NODE_ENV || 'development') === 'production',
};

export const isConfigured = {
  supabase: Boolean(config.supabase.url && config.supabase.serviceRoleKey),
  razorpay: Boolean(config.razorpay.keyId && config.razorpay.keySecret),
  ai: Boolean(config.ai.apiKey),
  google: Boolean(config.google.clientId && config.google.clientSecret),
  email: Boolean(config.email.apiKey),
};
