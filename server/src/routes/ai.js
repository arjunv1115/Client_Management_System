import express from 'express';
import { insert, all } from '../db/store.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler, ok, created, ApiError } from '../utils/http.js';
import { recordAudit } from '../utils/audit.js';
import {
  chat, listAiConversations, getAiConversation, deleteAiConversation,
  scoreLead, leadFollowUp, clientSummary, projectInsights, taskSuggestions,
  meetingAgenda, summarizeMeeting, documentSummary, financialInsights,
  naturalSearch, generateReport, dataQuality, pipelineInsights, getAiUsageView,
  quotationDraft, buildBusinessContext,
} from '../services/ai.js';

const router = express.Router();
router.use(authRequired);

/* ---------- Business assistant ---------- */
router.post('/chat', asyncHandler(async (req, res) => {
  const result = await chat({
    user: req.user,
    message: req.body?.message,
    conversationId: req.body?.conversationId || req.body?.conversation_id,
  });
  ok(res, result);
}));

router.get('/conversations', asyncHandler((req, res) => {
  ok(res, listAiConversations(req.user));
}));

router.get('/conversations/:id', asyncHandler((req, res) => {
  ok(res, getAiConversation(req.user, req.params.id));
}));

router.delete('/conversations/:id', asyncHandler((req, res) => {
  ok(res, deleteAiConversation(req.user, req.params.id));
}));

/* ---------- Module assistants ---------- */
router.post('/leads/:id/score', asyncHandler(async (req, res) => {
  ok(res, await scoreLead(req.user, req.params.id));
}));

router.post('/leads/:id/follow-up', asyncHandler(async (req, res) => {
  ok(res, await leadFollowUp(req.user, req.params.id, req.body?.tone || 'friendly'));
}));

router.post('/clients/:id/summary', asyncHandler(async (req, res) => {
  ok(res, await clientSummary(req.user, req.params.id));
}));

router.post('/projects/:id/insights', asyncHandler(async (req, res) => {
  ok(res, await projectInsights(req.user, req.params.id));
}));

router.post('/tasks/suggestions', asyncHandler(async (req, res) => {
  ok(res, await taskSuggestions(req.user, req.body || {}));
}));

router.post('/meetings/:id/agenda', asyncHandler(async (req, res) => {
  ok(res, await meetingAgenda(req.user, req.params.id));
}));

router.post('/meetings/:id/summarize', asyncHandler(async (req, res) => {
  ok(res, await summarizeMeeting(req.user, req.params.id, req.body?.notes));
}));

router.post('/documents/:id/summary', asyncHandler(async (req, res) => {
  ok(res, await documentSummary(req.user, req.params.id));
}));

router.get('/financial-insights', asyncHandler(async (req, res) => {
  ok(res, await financialInsights(req.user, req.query));
}));

router.get('/natural-search', asyncHandler(async (req, res) => {
  ok(res, naturalSearch(req.user, req.query.q));
}));

router.post('/report', asyncHandler(async (req, res) => {
  ok(res, await generateReport(req.user, req.body || {}));
}));

router.get('/reports', asyncHandler((req, res) => {
  ok(res, all('ai_generated_reports', (r) => r.org_id === req.user.org_id && r.user_id === req.user.id)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))));
}));

router.get('/data-quality', asyncHandler(async (req, res) => {
  ok(res, await dataQuality(req.user));
}));

router.get('/pipeline-insights', asyncHandler(async (req, res) => {
  ok(res, await pipelineInsights(req.user));
}));

router.get('/context', asyncHandler((req, res) => {
  ok(res, buildBusinessContext(req.user));
}));

router.get('/usage', asyncHandler((req, res) => {
  ok(res, getAiUsageView(req.user));
}));

/* ---------- Quotations (human-in-the-loop) ---------- */
router.post('/quotation', asyncHandler(async (req, res) => {
  ok(res, await quotationDraft(req.user, req.body || {}));
}));

router.post('/quotation/save', asyncHandler((req, res) => {
  if (req.body?.approved !== true) {
    throw new ApiError(400, 'Human approval is required before a quotation draft can be saved.');
  }
  const draft = req.body?.draft || {};
  if (!draft.title || !Array.isArray(draft.items) || !draft.items.length) {
    throw new ApiError(400, 'A quotation title and at least one line item are required.');
  }
  const count = all('quotations', (q) => q.org_id === req.user.org_id).length;
  const quotation = insert('quotations', {
    org_id: req.user.org_id,
    client_id: draft.client_id || null,
    lead_id: draft.lead_id || null,
    project_id: draft.project_id || null,
    number: draft.number || `QT-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`,
    title: draft.title,
    status: draft.status || 'draft',
    subtotal: Number(draft.subtotal || 0),
    tax: Number(draft.tax || 0),
    discount: Number(draft.discount || 0),
    total: Number(draft.total || 0),
    valid_until: draft.valid_until || null,
    notes: draft.notes || '',
    terms: draft.terms || '',
    content: draft.content || '',
    version: 1,
    ai_draft: true,
    approved_by: req.user.id,
  });
  draft.items.forEach((item) => {
    insert('quotation_items', {
      quotation_id: quotation.id,
      description: item.description || 'Service',
      quantity: Number(item.quantity || 1),
      rate: Number(item.rate || 0),
      amount: Number(item.amount || 0),
    });
  });
  recordAudit({
    orgId: req.user.org_id, user: req.user, action: 'ai.quotation_approved', entity: 'quotations',
    entityId: quotation.id, changes: { total: quotation.total }, ip: req.ip,
  });
  return created(res, quotation);
}));

/* ---------- Approvals log ---------- */
router.post('/suggestions/accept', asyncHandler((req, res) => {
  const suggestion = insert('ai_suggestions', {
    org_id: req.user.org_id,
    user_id: req.user.id,
    feature: req.body?.feature || 'business_assistant',
    entity: req.body?.entity || null,
    entity_id: req.body?.entity_id || null,
    content: req.body?.content || '',
    status: 'accepted',
  });
  recordAudit({
    orgId: req.user.org_id, user: req.user, action: 'ai.suggestion_accepted', entity: suggestion.entity,
    entityId: suggestion.entity_id, changes: { feature: suggestion.feature }, ip: req.ip,
  });
  return created(res, suggestion);
}));

router.get('/suggestions', asyncHandler((req, res) => {
  ok(res, all('ai_suggestions', (s) => s.org_id === req.user.org_id)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 50));
}));

export default router;
