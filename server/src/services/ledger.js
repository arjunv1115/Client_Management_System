import { find, insert, update } from '../db/store.js';

function paymentStatus(status) {
  if (status === 'completed') return 'completed';
  if (status === 'failed') return 'failed';
  if (status === 'refunded' || status === 'cancelled') return 'cancelled';
  return 'pending';
}

function clientName(clientId) {
  const client = find('clients', (c) => c.id === clientId);
  return client?.name || 'Client';
}

/**
 * Keeps the financial ledger in sync with payment records.
 * Only completed transactions are used by dashboard totals, so a payment and its
 * linked ledger row can never be double-counted (the transaction carries payment_id).
 */
export function syncPaymentLedger(payment) {
  if (!payment) return null;
  const existing = find('transactions', (t) => t.payment_id === payment.id);
  const payload = {
    org_id: payment.org_id,
    client_id: payment.client_id,
    payment_id: payment.id,
    expense_id: null,
    title: `${clientName(payment.client_id)} — ${payment.description || payment.invoice_number || 'Payment'}`,
    type: 'income',
    revenue_category: payment.revenue_category || existing?.revenue_category || 'Project Revenue',
    amount: Number(payment.amount || 0),
    transaction_date: payment.payment_date || new Date().toISOString().slice(0, 10),
    method: payment.method || 'Manual',
    status: paymentStatus(payment.status),
    description: payment.description || '',
    deleted_at: null,
  };
  if (existing) return update('transactions', existing.id, payload);
  return insert('transactions', payload);
}

export function removePaymentLedger(paymentId) {
  const existing = find('transactions', (t) => t.payment_id === paymentId);
  if (existing) update('transactions', existing.id, { status: 'cancelled', deleted_at: new Date().toISOString() });
}

export function syncExpenseLedger(expense) {
  if (!expense) return null;
  const existing = find('transactions', (t) => t.expense_id === expense.id);
  const payload = {
    org_id: expense.org_id,
    client_id: null,
    payment_id: null,
    expense_id: expense.id,
    title: `${expense.category} — ${expense.description || 'Expense'}`,
    type: 'expense',
    revenue_category: null,
    amount: Number(expense.amount || 0),
    transaction_date: expense.expense_date || new Date().toISOString().slice(0, 10),
    method: expense.method || 'Manual',
    status: 'completed',
    description: expense.description || '',
    deleted_at: null,
  };
  if (existing) return update('transactions', existing.id, payload);
  return insert('transactions', payload);
}

export function removeExpenseLedger(expenseId) {
  const existing = find('transactions', (t) => t.expense_id === expenseId);
  if (existing) update('transactions', existing.id, { status: 'cancelled', deleted_at: new Date().toISOString() });
}
