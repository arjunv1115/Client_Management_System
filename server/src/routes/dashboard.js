import express from 'express';
import { asyncHandler, ok } from '../utils/http.js';
import { authRequired } from '../middleware/auth.js';
import {
  getSummary, getDashboardWidgets, getModuleStats, getSalesPipeline, getRecentClients,
  getReminders, getActiveRetainers, resolveRange, getFinancials, getRevenueByType,
  getRevenueTrend, getRevenueOverview,
} from '../services/analytics.js';

const router = express.Router();
router.use(authRequired);

router.get('/summary', asyncHandler((req, res) => {
  const range = resolveRange(req.query);
  ok(res, getSummary(req.user.org_id, range));
}));

router.get('/widgets', asyncHandler((req, res) => {
  const range = resolveRange(req.query);
  ok(res, getDashboardWidgets(req.user.org_id, range, req.user));
}));

router.get('/module-stats', asyncHandler((req, res) => {
  ok(res, getModuleStats(req.user.org_id, req.user));
}));

router.get('/sales-pipeline', asyncHandler((req, res) => {
  ok(res, getSalesPipeline(req.user.org_id));
}));

router.get('/transactions', asyncHandler((req, res) => {
  const range = resolveRange(req.query);
  ok(res, getFinancials(req.user.org_id, range));
}));

router.get('/recent-clients', asyncHandler((req, res) => {
  ok(res, getRecentClients(req.user.org_id, Number(req.query.limit) || 5));
}));

router.get('/upcoming-reminders', asyncHandler((req, res) => {
  ok(res, getReminders(req.user.org_id));
}));

router.get('/active-retainers', asyncHandler((req, res) => {
  ok(res, getActiveRetainers(req.user.org_id));
}));

export const revenueRouter = express.Router();
revenueRouter.use(authRequired);

revenueRouter.get('/summary', asyncHandler((req, res) => {
  const range = resolveRange(req.query);
  ok(res, getFinancials(req.user.org_id, range));
}));

revenueRouter.get('/by-type', asyncHandler((req, res) => {
  const range = resolveRange(req.query);
  ok(res, getRevenueByType(req.user.org_id, range));
}));

revenueRouter.get('/trend', asyncHandler((req, res) => {
  ok(res, getRevenueTrend(req.user.org_id, Number(req.query.months) || 6));
}));

revenueRouter.get('/overview', asyncHandler((req, res) => {
  const range = resolveRange(req.query);
  ok(res, getRevenueOverview(req.user.org_id, range));
}));

export default router;
