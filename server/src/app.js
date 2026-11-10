import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';

import authRoutes from './routes/auth.js';
import dashboardRoutes, { revenueRouter } from './routes/dashboard.js';
import resourceRoutes from './routes/resources.js';
import notificationRoutes from './routes/notifications.js';
import searchRoutes from './routes/search.js';
import messageRoutes from './routes/messages.js';
import portalRoutes from './routes/portal.js';
import adminRoutes from './routes/admin.js';
import aiRoutes from './routes/ai.js';
import preferenceRoutes from './routes/preferences.js';
import uploadRoutes from './routes/uploads.js';
import billingRoutes from './routes/billing.js';
import publicRoutes from './routes/public.js';
import integrationRoutes from './routes/integrations.js';
import metaRoutes from './routes/meta.js';
import { notFound, errorHandler } from './middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const app = express();

app.set('trust proxy', 1);

const allowedOrigins = new Set([
  config.clientUrl,
  'https://client-management-system-lac.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
]);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin) || origin.endsWith('.vercel.app') || !config.isProduction) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed by CORS.'));
  },
  credentials: true,
}));

app.use(morgan(config.isProduction ? 'combined' : 'dev'));

app.use(express.json({
  limit: '8mb',
  verify: (req, _res, buffer) => {
    if (req.originalUrl.includes('razorpay/webhook')) req.rawBody = Buffer.from(buffer);
  },
}));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

fs.mkdirSync(config.uploadsDir, { recursive: true });
app.use('/uploads', express.static(config.uploadsDir, {
  maxAge: '7d',
  fallthrough: true,
  setHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.isProduction ? 40 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' },
});

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.isProduction ? 200 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again shortly.' },
});

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      environment: config.nodeEnv,
      time: new Date().toISOString(),
      integrations: {
        supabase: Boolean(config.supabase.url),
        razorpay: Boolean(config.razorpay.keyId),
        ai: Boolean(config.ai.apiKey),
        google: Boolean(config.google.clientId),
        email: Boolean(config.email.apiKey),
      },
    },
  });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/auth', authLimiter, authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/revenue', revenueRouter);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/preferences', preferenceRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/public', publicLimiter, publicRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/meta', metaRoutes);

// Generic resource routes are mounted last so specific routes always win.
app.use('/api', resourceRoutes);

// In production the API can serve the built client as a single deployment.
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

export default app;
