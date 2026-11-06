import express from 'express';
import { all, find, insert } from '../db/store.js';
import { asyncHandler, ok, created, ApiError } from '../utils/http.js';
import { notify } from '../utils/audit.js';

const router = express.Router();

router.get('/plans', asyncHandler(async (_req, res) => {
  ok(res, all('plans').sort((a, b) => a.position - b.position));
}));

router.get('/pages/:slug', asyncHandler((req, res) => {
  const page = find('public_pages', (p) => p.slug === req.params.slug && p.published);
  if (!page) throw new ApiError(404, 'This public page is not available.');
  const org = find('organizations', (o) => o.id === page.org_id);
  ok(res, {
    page,
    organization: org ? { id: org.id, name: org.name, currency: org.currency, logo_url: org.logo_url } : null,
  });
}));

const collectLead = asyncHandler((req, res) => {
  const page = find('public_pages', (p) => p.slug === req.params.slug && p.published);
  if (!page) throw new ApiError(404, 'This public page is not available.');
  const { name, email, phone = '', company = '', service = '', message = '', source = 'Public Page' } = req.body || {};
  if (!name || !String(name).trim()) throw new ApiError(400, 'Your name is required.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) throw new ApiError(400, 'Enter a valid email address.');
  if (String(message).length > 3000) throw new ApiError(400, 'Message is too long.');

  const stage = find('lead_stages', (s) => s.org_id === page.org_id && s.name === 'New')
    || find('lead_stages', (s) => s.org_id === page.org_id);
  const lead = insert('leads', {
    org_id: page.org_id,
    name: String(name).trim().slice(0, 120),
    company: String(company).trim().slice(0, 120),
    email: String(email).trim().toLowerCase(),
    phone: String(phone).trim().slice(0, 40),
    website: '',
    location: '',
    source: source || 'Public Page',
    service: String(service).trim().slice(0, 160),
    estimated_budget: 0,
    expected_close_date: null,
    assigned_to: null,
    priority: 'medium',
    stage_id: stage?.id || null,
    stage: stage?.name || 'New',
    status: 'open',
    score: 40,
    notes: String(message).trim(),
  });

  const submission = insert('public_lead_submissions', {
    org_id: page.org_id,
    page_id: page.id,
    lead_id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    service: lead.service,
    message: String(message).trim(),
    source: source || 'Public Page',
  });

  notify({
    orgId: page.org_id,
    userId: null,
    type: 'lead',
    title: `New enquiry from ${page.business_name}`,
    message: `${lead.name}${lead.company ? ` (${lead.company})` : ''} sent an enquiry about ${lead.service || 'your services'}.`,
    link: `/leads/${lead.id}`,
  });

  return created(res, {
    id: submission.id,
    lead_id: lead.id,
    message: 'Thanks — your enquiry has been received. We will get back to you shortly.',
  });
});

router.post('/pages/:slug/leads', collectLead);
router.post('/pages/:slug/contact', collectLead);

export default router;
