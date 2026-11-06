import crypto from 'node:crypto';
import { insertMany, insert, all } from '../db/store.js';

const STAGE_COLORS = ['#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b', '#f97316', '#10b981', '#f43f5e'];

export function bootstrapOrganization({ orgId, slug, name }) {
  const leadStages = ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
  insertMany('lead_stages', leadStages.map((stage, index) => ({
    org_id: orgId,
    name: stage,
    color: STAGE_COLORS[index],
    position: index + 1,
  })));

  insertMany('project_stages', ['New', 'Ongoing', 'Completed'].map((stage, index) => ({
    org_id: orgId,
    name: stage,
    color: STAGE_COLORS[index * 3],
    position: index + 1,
  })));

  insertMany('lead_sources', ['Website', 'Referral', 'LinkedIn', 'Google Ads', 'Cold Call', 'Event', 'Public Page', 'Import'].map((source) => ({
    org_id: orgId,
    name: source,
    active: true,
  })));

  insertMany('revenue_categories', ['Project Revenue', 'Monthly Retainer Revenue', 'Consultation Revenue', 'Service Revenue', 'Maintenance Revenue', 'Other Revenue'].map((category) => ({
    org_id: orgId,
    name: category,
  })));

  insertMany('expense_categories', ['Software Subscriptions', 'Marketing', 'Office Rent', 'Equipments', 'Utilities', 'Contractors', 'Travel', 'Salaries', 'Other'].map((category) => ({
    org_id: orgId,
    name: category,
  })));

  insert('task_boards', { org_id: orgId, name: 'Team Board' });
  insertMany('ai_feature_settings', [
    'business_assistant', 'lead_scoring', 'follow_up', 'pipeline_insights', 'client_insights',
    'project_insights', 'task_suggestions', 'meeting_assistant', 'document_assistant',
    'financial_insights', 'natural_search', 'report_generator', 'data_quality', 'quotation_builder',
  ].map((feature) => ({ org_id: orgId, feature, enabled: true })));

  insert('public_pages', {
    org_id: orgId,
    slug,
    business_name: name,
    tagline: 'Let’s build something remarkable together.',
    description: 'Tell visitors what your business does and why it matters. Customise this page from Public Page settings.',
    email: '',
    phone: '',
    website: '',
    address: '',
    logo_url: '',
    services: [],
    portfolio: [],
    socials: {},
    published: false,
  });
}

export function uniqueSlug(base, tableName = 'organizations') {
  const normalized = String(base || 'workspace')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'workspace';
  const existing = new Set(all(tableName).map((row) => row.slug));
  let slug = normalized;
  let counter = 1;
  while (existing.has(slug)) {
    slug = `${normalized}-${counter++}`;
  }
  return slug;
}

export function referralCode(name) {
  const stem = String(name || 'REF').replace(/[^a-zA-Z]/g, '').slice(0, 6).toUpperCase() || 'REF';
  return `${stem}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}
