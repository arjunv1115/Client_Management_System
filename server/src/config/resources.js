import { ADMIN_ROLES, MANAGER_ROLES, STAFF_ROLES } from './roles.js';
import { enforcePlanLimit } from '../utils/plan.js';
import { find, getById } from '../db/store.js';
import { ApiError } from '../utils/http.js';
import { syncPaymentLedger, syncExpenseLedger, removePaymentLedger, removeExpenseLedger } from '../services/ledger.js';

const ALL_STAFF = STAFF_ROLES;
const MANAGERS = MANAGER_ROLES;
const ADMINS = ADMIN_ROLES;

/**
 * Central resource registry.
 * Every module exposes the same REST surface:
 *   GET /api/:resource, GET /:id, POST, PUT/PATCH /:id, DELETE /:id,
 *   POST /bulk-delete, POST /:id/restore, GET /export
 */
export const resources = {
  leads: {
    table: 'leads', singular: 'lead', searchFields: ['name', 'company', 'email', 'phone', 'service', 'source'],
    required: ['name'], defaultSort: '-created_at', softDelete: true,
    readRoles: ALL_STAFF, writeRoles: MANAGERS, deleteRoles: MANAGERS,
    limitOnCreate: 'leads', notifyType: 'lead', notifyLink: '/leads',
    label: (row) => row.name,
    beforeCreate: ({ data, user }) => {
      const stage = data.stage_id
        ? getById('lead_stages', data.stage_id)
        : find('lead_stages', (s) => s.org_id === user.org_id && s.name === 'New');
      data.stage_id = stage?.id || data.stage_id || null;
      data.stage = stage?.name || 'New';
      data.status = data.status || 'open';
      data.assigned_to = data.assigned_to || user.id;
      data.score = data.score ?? 40;
    },
    beforeUpdate: ({ data, existing }) => {
      if (data.stage_id && data.stage_id !== existing.stage_id) {
        const stage = getById('lead_stages', data.stage_id);
        data.stage = stage?.name || existing.stage || 'New';
        if (stage?.name === 'Won') data.status = 'won';
        else if (stage?.name === 'Lost') data.status = 'lost';
        else data.status = 'open';
      }
    },
    notifyTitle: (row) => `New lead: ${row.name}`,
    notifyMessage: (row) => `${row.name}${row.company ? ` from ${row.company}` : ''} was added to ${row.stage || 'New'}.`,
  },

  lead_stages: {
    table: 'lead_stages', singular: 'lead stage', searchFields: ['name'], required: ['name'],
    defaultSort: 'position', readRoles: ALL_STAFF, writeRoles: MANAGERS, deleteRoles: ADMINS,
  },

  lead_sources: {
    table: 'lead_sources', singular: 'lead source', searchFields: ['name'], required: ['name'],
    defaultSort: 'name', readRoles: ALL_STAFF, writeRoles: MANAGERS, deleteRoles: ADMINS,
  },

  clients: {
    table: 'clients', singular: 'client', searchFields: ['name', 'company', 'email', 'phone', 'industry', 'location'],
    required: ['name', 'email'], defaultSort: '-created_at', softDelete: true,
    readRoles: ALL_STAFF, writeRoles: MANAGERS, deleteRoles: MANAGERS,
    clientSelf: true, limitOnCreate: 'clients', notifyType: 'client', notifyLink: '/clients',
    label: (row) => row.name,
    beforeCreate: ({ data, user }) => {
      data.status = data.status || 'active';
      data.manager_id = data.manager_id || user.id;
    },
    notifyTitle: (row) => `New client: ${row.name}`,
    notifyMessage: (row) => `${row.company || row.name} has been added to your client list.`,
  },

  projects: {
    table: 'projects', singular: 'project', searchFields: ['name', 'description', 'category'],
    required: ['name', 'client_id'], defaultSort: '-created_at', softDelete: true,
    readRoles: ALL_STAFF, writeRoles: MANAGERS, deleteRoles: MANAGERS,
    clientScoped: 'client_id', limitOnCreate: 'projects', notifyType: 'project', notifyLink: '/projects',
    label: (row) => row.name,
    beforeCreate: ({ data }) => {
      data.status = data.status || 'ongoing';
      data.progress = Number(data.progress ?? 0);
      data.amount_paid = Number(data.amount_paid ?? 0);
      data.budget = Number(data.budget ?? 0);
    },
    notifyTitle: (row) => `New project: ${row.name}`,
    notifyMessage: (row) => `${row.name} is ready for the team.`,
  },

  project_stages: {
    table: 'project_stages', singular: 'project stage', searchFields: ['name'], required: ['name'],
    defaultSort: 'position', readRoles: ALL_STAFF, writeRoles: MANAGERS, deleteRoles: ADMINS,
  },

  project_members: {
    table: 'project_members', singular: 'project member', searchFields: ['role'],
    required: ['project_id', 'profile_id'], defaultSort: 'role',
    readRoles: ALL_STAFF, writeRoles: MANAGERS, deleteRoles: MANAGERS,
    notifyLink: '/projects',
  },

  retainers: {
    table: 'retainers', singular: 'retainer', searchFields: ['name', 'description'],
    required: ['name', 'client_id', 'monthly_amount'], defaultSort: '-created_at', softDelete: true,
    readRoles: MANAGERS, writeRoles: MANAGERS, deleteRoles: ADMINS,
    notifyType: 'retainer', notifyLink: '/retainers', label: (row) => row.name,
    beforeCreate: ({ data }) => {
      data.status = data.status || 'active';
      data.payment_status = data.payment_status || 'pending';
      data.billing_cycle = data.billing_cycle || 'monthly';
    },
  },

  payments: {
    table: 'payments', singular: 'payment', searchFields: ['invoice_number', 'description', 'transaction_id', 'method'],
    required: ['client_id', 'amount'], defaultSort: '-payment_date', softDelete: true,
    readRoles: MANAGERS, writeRoles: MANAGERS, deleteRoles: ADMINS,
    clientScoped: 'client_id', notifyType: 'payment', notifyLink: '/payments',
    label: (row) => row.invoice_number || 'Payment',
    beforeCreate: ({ data }) => {
      data.status = data.status || 'pending';
      data.payment_date = data.payment_date || new Date().toISOString().slice(0, 10);
      data.amount = Number(data.amount || 0);
    },
    afterCreate: ({ row }) => syncPaymentLedger(row),
    afterUpdate: ({ row }) => syncPaymentLedger(row),
    afterDelete: ({ row }) => removePaymentLedger(row.id),
    notifyTitle: (row) => row.status === 'completed' ? 'Payment received' : 'Payment recorded',
    notifyMessage: (row) => `A payment of ₹${Number(row.amount || 0).toLocaleString('en-IN')} was ${row.status}.`,
    notifyOnlyWhen: (row) => ['completed', 'failed'].includes(row.status),
  },

  transactions: {
    table: 'transactions', singular: 'transaction', searchFields: ['title', 'description'],
    required: ['title', 'amount', 'type'], defaultSort: '-transaction_date', softDelete: true,
    readRoles: MANAGERS, writeRoles: MANAGERS, deleteRoles: ADMINS,
    label: (row) => row.title,
    beforeCreate: ({ data }) => {
      data.status = data.status || 'completed';
      data.amount = Number(data.amount || 0);
      data.transaction_date = data.transaction_date || new Date().toISOString().slice(0, 10);
    },
  },

  expenses: {
    table: 'expenses', singular: 'expense', searchFields: ['category', 'description'],
    required: ['category', 'amount'], defaultSort: '-expense_date', softDelete: true,
    readRoles: MANAGERS, writeRoles: MANAGERS, deleteRoles: ADMINS,
    notifyType: 'expense', notifyLink: '/payments', label: (row) => row.description,
    beforeCreate: ({ data }) => {
      data.expense_date = data.expense_date || new Date().toISOString().slice(0, 10);
      data.amount = Number(data.amount || 0);
    },
    afterCreate: ({ row }) => syncExpenseLedger(row),
    afterUpdate: ({ row }) => syncExpenseLedger(row),
    afterDelete: ({ row }) => removeExpenseLedger(row.id),
  },

  expense_categories: {
    table: 'expense_categories', singular: 'expense category', searchFields: ['name'], required: ['name'],
    defaultSort: 'name', readRoles: MANAGERS, writeRoles: ADMINS, deleteRoles: ADMINS,
  },
  revenue_categories: {
    table: 'revenue_categories', singular: 'revenue category', searchFields: ['name'], required: ['name'],
    defaultSort: 'name', readRoles: MANAGERS, writeRoles: ADMINS, deleteRoles: ADMINS,
  },

  reminders: {
    table: 'reminders', singular: 'reminder', searchFields: ['title', 'description'],
    required: ['title', 'reminder_date'], defaultSort: 'reminder_date', softDelete: true,
    readRoles: ALL_STAFF, writeRoles: ALL_STAFF, deleteRoles: ALL_STAFF,
    notifyType: 'reminder', notifyLink: '/reminders', label: (row) => row.title,
    beforeCreate: ({ data, user }) => {
      data.status = data.status || 'pending';
      data.priority = data.priority || 'medium';
      data.created_by = user.id;
    },
  },

  meetings: {
    table: 'meetings', singular: 'meeting', searchFields: ['title', 'description', 'agenda', 'location'],
    required: ['title', 'meeting_date', 'start_time', 'end_time'], defaultSort: 'meeting_date', softDelete: true,
    readRoles: ALL_STAFF, writeRoles: ALL_STAFF, deleteRoles: MANAGERS,
    clientScoped: 'client_id', notifyType: 'meeting', notifyLink: '/meetings', label: (row) => row.title,
    beforeCreate: ({ data, user }) => {
      data.status = data.status || 'scheduled';
      data.priority = data.priority || 'medium';
      data.assigned_to = data.assigned_to || user.id;
    },
    notifyTitle: (row) => `Meeting scheduled: ${row.title}`,
    notifyMessage: (row) => `${row.title} is scheduled on ${row.meeting_date} at ${row.start_time}.`,
  },

  tasks: {
    table: 'tasks', singular: 'task', searchFields: ['title', 'description'],
    required: ['title'], defaultSort: '-created_at', softDelete: true,
    readRoles: ALL_STAFF, writeRoles: ALL_STAFF, deleteRoles: MANAGERS,
    notifyType: 'task', notifyLink: '/tasks', label: (row) => row.title,
    beforeCreate: ({ data, user }) => {
      data.status = data.status || 'To Do';
      data.priority = data.priority || 'medium';
      data.assigned_to = data.assigned_to || user.id;
      data.progress = Number(data.progress ?? (data.status === 'Completed' ? 100 : 0));
    },
    beforeUpdate: ({ data }) => {
      if (data.status === 'Completed' && data.progress === undefined) data.progress = 100;
    },
    notifyTitle: (row) => `Task: ${row.title}`,
    notifyMessage: (row) => `A task was assigned to you: ${row.title}.`,
    notifyTarget: (row) => row.assigned_to,
  },

  task_comments: {
    table: 'task_comments', singular: 'comment', searchFields: ['body'], required: ['task_id', 'body'],
    defaultSort: '-created_at', readRoles: ALL_STAFF, writeRoles: ALL_STAFF, deleteRoles: ALL_STAFF,
    beforeCreate: ({ data, user }) => {
      data.user_id = user.id;
      data.user_name = user.name;
    },
  },

  subtasks: {
    table: 'subtasks', singular: 'subtask', searchFields: ['title'], required: ['task_id', 'title'],
    defaultSort: 'created_at', readRoles: ALL_STAFF, writeRoles: ALL_STAFF, deleteRoles: ALL_STAFF,
  },

  documents: {
    table: 'documents', singular: 'document', searchFields: ['name', 'category'],
    required: ['name', 'category'], defaultSort: '-created_at', softDelete: true,
    readRoles: ALL_STAFF, writeRoles: ALL_STAFF, deleteRoles: MANAGERS,
    clientScoped: 'client_id', clientFilter: (row) => row.shared_with_client === true,
    notifyType: 'document', notifyLink: '/documents', label: (row) => row.name,
    beforeCreate: ({ data, user }) => {
      data.uploaded_by = user.id;
      data.shared_with_client = Boolean(data.shared_with_client);
    },
  },

  team_members: {
    table: 'team_members', singular: 'team member', searchFields: ['name', 'email', 'designation', 'department'],
    required: ['name', 'email', 'role'], defaultSort: 'name',
    readRoles: ALL_STAFF, writeRoles: ADMINS, deleteRoles: ADMINS,
    limitOnCreate: 'teammates', notifyType: 'team', notifyLink: '/team', label: (row) => row.name,
    beforeCreate: ({ data }) => {
      data.status = data.status || 'active';
      data.joining_date = data.joining_date || new Date().toISOString().slice(0, 10);
    },
    notifyTitle: (row) => `Team member added: ${row.name}`,
    notifyMessage: (row) => `${row.name} joined as ${row.designation || row.role}.`,
  },

  payroll: {
    table: 'payroll', singular: 'payroll record', searchFields: ['employee_name', 'designation', 'month'],
    required: ['employee_name', 'month', 'basic_salary'], defaultSort: '-created_at',
    readRoles: ADMINS, writeRoles: ADMINS, deleteRoles: ADMINS,
    notifyType: 'payroll', notifyLink: '/payroll', label: (row) => row.employee_name,
    beforeCreate: ({ data }) => {
      const basic = Number(data.basic_salary || 0);
      const allowances = Number(data.allowances || 0);
      const bonus = Number(data.bonus || 0);
      const deductions = Number(data.deductions || 0);
      const tax = Number(data.tax_deduction || 0);
      data.net_salary = basic + allowances + bonus - deductions - tax;
      data.status = data.status || 'pending';
    },
    beforeUpdate: ({ data, existing }) => {
      if (['basic_salary', 'allowances', 'bonus', 'deductions', 'tax_deduction'].some((k) => data[k] !== undefined)) {
        const merged = { ...existing, ...data };
        data.net_salary = Number(merged.basic_salary || 0) + Number(merged.allowances || 0)
          + Number(merged.bonus || 0) - Number(merged.deductions || 0) - Number(merged.tax_deduction || 0);
      }
    },
  },

  billing_records: {
    table: 'billing_records', singular: 'billing record', searchFields: ['invoice_number', 'plan', 'description'],
    required: ['invoice_number', 'amount'], defaultSort: '-created_at', softDelete: true,
    readRoles: ADMINS, writeRoles: ADMINS, deleteRoles: ADMINS,
    notifyType: 'billing', notifyLink: '/billing', label: (row) => row.invoice_number,
    beforeCreate: ({ data }) => {
      data.status = data.status || 'pending';
      data.billing_date = data.billing_date || new Date().toISOString().slice(0, 10);
    },
  },

  invoices: {
    table: 'invoices', singular: 'invoice', searchFields: ['invoice_number', 'notes'],
    required: ['client_id', 'total'], defaultSort: '-created_at', softDelete: true,
    readRoles: MANAGERS, writeRoles: MANAGERS, deleteRoles: ADMINS,
    clientScoped: 'client_id', notifyType: 'invoice', notifyLink: '/payments', label: (row) => row.invoice_number,
    beforeCreate: ({ data }) => {
      data.status = data.status || 'pending';
      data.total = Number(data.total || 0);
      data.issue_date = data.issue_date || new Date().toISOString().slice(0, 10);
    },
  },

  quotations: {
    table: 'quotations', singular: 'quotation', searchFields: ['number', 'title', 'content'],
    required: ['title', 'total'], defaultSort: '-created_at', softDelete: true,
    readRoles: MANAGERS, writeRoles: MANAGERS, deleteRoles: MANAGERS,
    clientScoped: 'client_id',
    notifyType: 'quotation', notifyLink: '/documents', label: (row) => row.title,
  },

  contracts: {
    table: 'contracts', singular: 'contract', searchFields: ['title'],
    required: ['title', 'client_id'], defaultSort: '-created_at', softDelete: true,
    readRoles: MANAGERS, writeRoles: MANAGERS, deleteRoles: ADMINS,
    clientScoped: 'client_id', notifyType: 'contract', notifyLink: '/documents', label: (row) => row.title,
  },

  announcements: {
    table: 'announcements', singular: 'announcement', searchFields: ['title', 'description', 'category'],
    required: ['title', 'description'], defaultSort: '-created_at',
    readRoles: [...ALL_STAFF, 'client'], writeRoles: MANAGERS, deleteRoles: MANAGERS,
    clientFilter: (row, user) => row.client_id === null || row.client_id === undefined || row.client_id === user.client_id,
    notifyType: 'announcement', notifyLink: '/client-portal/announcements', label: (row) => row.title,
  },

  client_activities: {
    table: 'client_activities', singular: 'client activity', searchFields: ['title', 'description', 'type'],
    required: ['client_id', 'title'], defaultSort: '-activity_date',
    readRoles: [...ALL_STAFF, 'client'], writeRoles: MANAGERS, deleteRoles: MANAGERS,
    clientScoped: 'client_id',
  },

  referrals: {
    table: 'referrals', singular: 'referral', searchFields: ['referred_company', 'referred_name', 'referred_email', 'status'],
    defaultSort: '-created_at', readRoles: MANAGERS, writeRoles: ADMINS, deleteRoles: ADMINS,
  },

  referral_codes: {
    table: 'referral_codes', singular: 'referral code', searchFields: ['code'],
    defaultSort: '-created_at', readRoles: MANAGERS, writeRoles: ADMINS, deleteRoles: ADMINS,
  },

  support_tickets: {
    table: 'support_tickets', singular: 'support ticket', searchFields: ['subject', 'message', 'status'],
    required: ['subject', 'message'], defaultSort: '-created_at',
    readRoles: [...ALL_STAFF, 'client'], writeRoles: [...ALL_STAFF, 'client'],
    ownerField: 'user_id', ownerRoles: ['client', 'team_member'],
    label: (row) => row.subject,
    beforeCreate: ({ data, user }) => {
      data.user_id = user.id;
      data.status = data.status || 'open';
    },
    notifyType: 'support', notifyLink: '/help',
  },

  support_messages: {
    table: 'support_messages', singular: 'support message', searchFields: ['body'],
    required: ['ticket_id', 'body'], defaultSort: '-created_at',
    readRoles: [...ALL_STAFF, 'client'], writeRoles: [...ALL_STAFF, 'client'],
    clientFilter: (row, user) => {
      const ticket = find('support_tickets', (ticketRow) => ticketRow.id === row.ticket_id);
      return Boolean(ticket && ticket.user_id === user.id);
    },
    beforeCreate: ({ data, user }) => {
      data.user_id = user.id;
      if (user.role === 'client') {
        const ticket = find('support_tickets', (row) => row.id === data.ticket_id && row.org_id === user.org_id);
        if (!ticket || ticket.user_id !== user.id) throw new ApiError(403, 'You can only reply to your own support tickets.');
      }
    },
  },

  public_pages: {
    table: 'public_pages', singular: 'public page', searchFields: ['business_name', 'slug'],
    required: ['business_name', 'slug'], defaultSort: '-created_at',
    readRoles: ADMINS, writeRoles: ADMINS, deleteRoles: ADMINS,
  },

  ai_feature_settings: {
    table: 'ai_feature_settings', singular: 'AI setting', searchFields: ['feature'],
    defaultSort: 'feature', readRoles: ADMINS, writeRoles: ADMINS, deleteRoles: ADMINS,
  },

  notifications: {
    table: 'notifications', singular: 'notification', searchFields: ['title', 'message', 'type'],
    defaultSort: '-created_at', readRoles: [...ALL_STAFF, 'client'], writeRoles: ALL_STAFF, deleteRoles: ALL_STAFF,
    ownerField: 'user_id', ownerRoles: ['client'],
  },
};

// Apply the plan check to every resource that is actively limited.
for (const resource of Object.values(resources)) {
  if (!resource.limitOnCreate) continue;
  const existingHook = resource.beforeCreate;
  resource.beforeCreate = (context) => {
    enforcePlanLimit(context.user.org_id, resource.limitOnCreate);
    if (existingHook) existingHook(context);
  };
}

export function getResource(name) {
  return resources[name] || null;
}
