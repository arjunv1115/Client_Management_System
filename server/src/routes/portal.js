import express from 'express';
import { getPortalDashboard } from '../services/analytics.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler, ok, ApiError } from '../utils/http.js';

const router = express.Router();
router.use(authRequired);

router.get('/dashboard', asyncHandler((req, res) => {
  const clientId = req.user.role === 'client' ? req.user.client_id : req.query.client_id;
  if (!clientId) throw new ApiError(403, 'A client account is required to open the client portal.');
  ok(res, getPortalDashboard(req.user.org_id, clientId));
}));

router.get('/me', asyncHandler((req, res) => {
  ok(res, { clientId: req.user.client_id || null });
}));

export default router;
