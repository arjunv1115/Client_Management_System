import express from 'express';
import { all, find, getById, insert, update, remove } from '../db/store.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler, ok, created, ApiError } from '../utils/http.js';
import { notify } from '../utils/audit.js';

const router = express.Router();
router.use(authRequired);

// In-memory ephemeral presence/typing state (safe to lose on restart).
const typingState = new Map();
const presence = new Map();

function isMember(conversationId, userId) {
  return Boolean(find('conversation_members', (m) => m.conversation_id === conversationId && m.profile_id === userId && !m.deleted_at));
}

function assertAccess(conversation, user) {
  if (!conversation || conversation.org_id !== user.org_id) throw new ApiError(404, 'Conversation not found.');
  if (user.role === 'super_admin') return;
  if (!isMember(conversation.id, user.id)) throw new ApiError(403, 'You are not a member of this conversation.');
}

function decorate(conversation, user) {
  const messages = all('messages', (m) => m.conversation_id === conversation.id && !m.deleted_at);
  const last = [...messages].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
  const members = all('conversation_members', (m) => m.conversation_id === conversation.id && !m.deleted_at)
    .map((m) => getById('profiles', m.profile_id))
    .filter(Boolean)
    .map(({ password_hash: _p, ...profile }) => ({
      id: profile.id,
      name: profile.name,
      avatar_url: profile.avatar_url,
      role: profile.role,
      online: (Date.now() - (presence.get(profile.id) || 0)) < 120000,
    }));
  const typing = [...typingState.entries()]
    .filter(([key, timestamp]) => key.startsWith(`${conversation.id}:`) && Date.now() - timestamp < 4500)
    .map(([key]) => members.find((m) => m.id === key.split(':')[1])?.name)
    .filter(Boolean);
  return {
    ...conversation,
    last_message: last ? { body: last.body, sender_name: last.sender_name, created_at: last.created_at } : null,
    unread: messages.filter((m) => m.sender_id !== user.id && !(m.read_by || []).includes(user.id)).length,
    members,
    typing,
  };
}

router.get('/conversations', asyncHandler((req, res) => {
  const memberRows = all('conversation_members', (m) => m.profile_id === req.user.id && !m.deleted_at);
  let conversations = all('conversations', (c) => c.org_id === req.user.org_id && !c.deleted_at
    && (req.user.role === 'super_admin' || memberRows.some((m) => m.conversation_id === c.id)));
  conversations = conversations.map((c) => decorate(c, req.user));

  const filter = req.query.filter || 'all';
  if (filter === 'unread') conversations = conversations.filter((c) => c.unread > 0);
  else if (filter === 'clients') conversations = conversations.filter((c) => c.type === 'client');
  else if (filter === 'team') conversations = conversations.filter((c) => c.type === 'team');
  else if (filter === 'groups') conversations = conversations.filter((c) => c.type === 'group');

  if (req.query.q) {
    const needle = String(req.query.q).toLowerCase();
    conversations = conversations.filter((c) => c.name.toLowerCase().includes(needle)
      || c.last_message?.body?.toLowerCase().includes(needle));
  }
  conversations.sort((a, b) => String(b.last_message_at || '').localeCompare(String(a.last_message_at || '')));
  const unread = all('conversations', (c) => c.org_id === req.user.org_id && !c.deleted_at)
    .reduce((total, c) => total + decorate(c, req.user).unread, 0);
  ok(res, conversations, { unread });
}));

router.post('/conversations', asyncHandler((req, res) => {
  const { name, type = 'group', client_id = null, member_ids = [] } = req.body || {};
  if (!name || !String(name).trim()) throw new ApiError(400, 'Conversation name is required.');
  if (!['group', 'team', 'client', 'direct'].includes(type)) throw new ApiError(400, 'Invalid conversation type.');

  const conversation = insert('conversations', {
    org_id: req.user.org_id,
    name: String(name).trim(),
    type,
    client_id: client_id || null,
    created_by: req.user.id,
    last_message_at: new Date().toISOString(),
  });
  const members = [...new Set([req.user.id, ...member_ids.filter(Boolean)])];
  members.forEach((profileId) => {
    if (!getById('profiles', profileId)) return;
    insert('conversation_members', { conversation_id: conversation.id, profile_id: profileId });
  });
  return created(res, decorate(conversation, req.user));
}));

router.put('/conversations/:id', asyncHandler((req, res) => {
  const conversation = getById('conversations', req.params.id);
  assertAccess(conversation, req.user);
  if (conversation.created_by !== req.user.id && !['super_admin', 'admin'].includes(req.user.role)) {
    throw new ApiError(403, 'Only the creator or an administrator can edit this conversation.');
  }
  const patch = {};
  if (req.body.name) patch.name = String(req.body.name).trim();
  if (Array.isArray(req.body.member_ids)) {
    const existing = all('conversation_members', (m) => m.conversation_id === conversation.id && !m.deleted_at);
    existing.forEach((m) => {
      if (!req.body.member_ids.includes(m.profile_id)) {
        remove('conversation_members', m.id, true);
      }
    });
    req.body.member_ids.filter(Boolean).forEach((profileId) => {
      if (!isMember(conversation.id, profileId) && getById('profiles', profileId)) {
        insert('conversation_members', { conversation_id: conversation.id, profile_id: profileId });
      }
    });
  }
  ok(res, decorate(update('conversations', conversation.id, patch), req.user));
}));

router.delete('/conversations/:id', asyncHandler((req, res) => {
  const conversation = getById('conversations', req.params.id);
  assertAccess(conversation, req.user);
  if (conversation.created_by !== req.user.id && !['super_admin', 'admin'].includes(req.user.role)) {
    throw new ApiError(403, 'Only the creator or an administrator can delete this conversation.');
  }
  update('conversations', conversation.id, { deleted_at: new Date().toISOString() });
  ok(res, { id: conversation.id, deleted: true });
}));

router.get('/messages', asyncHandler((req, res) => {
  const { conversation_id: conversationId, q } = req.query;
  if (!conversationId) throw new ApiError(400, 'conversation_id is required.');
  const conversation = getById('conversations', conversationId);
  assertAccess(conversation, req.user);
  let messages = all('messages', (m) => m.conversation_id === conversationId && !m.deleted_at);
  if (q) {
    const needle = String(q).toLowerCase();
    messages = messages.filter((m) => String(m.body).toLowerCase().includes(needle));
  }
  messages.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  ok(res, messages);
}));

router.post('/messages', asyncHandler((req, res) => {
  const { conversation_id: conversationId, body, attachment_url: attachmentUrl = '' } = req.body || {};
  if (!conversationId) throw new ApiError(400, 'conversation_id is required.');
  if (!body && !attachmentUrl) throw new ApiError(400, 'Message cannot be empty.');
  const conversation = getById('conversations', conversationId);
  assertAccess(conversation, req.user);

  const message = insert('messages', {
    org_id: req.user.org_id,
    conversation_id: conversationId,
    sender_id: req.user.id,
    sender_name: req.user.name,
    body: String(body || '').trim(),
    attachment_url: attachmentUrl,
    read_by: [req.user.id],
  });
  update('conversations', conversationId, { last_message_at: message.created_at });
  typingState.delete(`${conversationId}:${req.user.id}`);

  const members = all('conversation_members', (m) => m.conversation_id === conversationId);
  members.filter((m) => m.profile_id !== req.user.id).forEach((member) => {
    notify({
      orgId: req.user.org_id,
      userId: member.profile_id,
      type: 'message',
      title: `New message in ${conversation.name}`,
      message: `${req.user.name}: ${String(body || 'Sent an attachment').slice(0, 90)}`,
      link: `/messages?conversation=${conversationId}`,
    });
  });
  return created(res, message);
}));

router.put('/messages/:id', asyncHandler((req, res) => {
  const message = getById('messages', req.params.id);
  if (!message || message.org_id !== req.user.org_id) throw new ApiError(404, 'Message not found.');
  assertAccess(getById('conversations', message.conversation_id), req.user);
  if (message.sender_id !== req.user.id && !['super_admin', 'admin'].includes(req.user.role)) {
    throw new ApiError(403, 'You can only edit your own messages.');
  }
  if (!req.body.body) throw new ApiError(400, 'Message body is required.');
  ok(res, update('messages', message.id, { body: String(req.body.body).trim(), edited_at: new Date().toISOString() }));
}));

router.delete('/messages/:id', asyncHandler((req, res) => {
  const message = getById('messages', req.params.id);
  if (!message || message.org_id !== req.user.org_id) throw new ApiError(404, 'Message not found.');
  assertAccess(getById('conversations', message.conversation_id), req.user);
  if (message.sender_id !== req.user.id && !['super_admin', 'admin'].includes(req.user.role)) {
    throw new ApiError(403, 'You can only delete your own messages.');
  }
  update('messages', message.id, { deleted_at: new Date().toISOString() });
  ok(res, { id: message.id, deleted: true });
}));

router.post('/conversations/:id/read', asyncHandler((req, res) => {
  const conversation = getById('conversations', req.params.id);
  assertAccess(conversation, req.user);
  const rows = all('messages', (m) => m.conversation_id === conversation.id && !m.deleted_at
    && !(m.read_by || []).includes(req.user.id));
  rows.forEach((message) => update('messages', message.id, { read_by: [...(message.read_by || []), req.user.id] }));
  ok(res, { updated: rows.length });
}));

router.post('/conversations/:id/typing', asyncHandler((req, res) => {
  const conversation = getById('conversations', req.params.id);
  assertAccess(conversation, req.user);
  typingState.set(`${conversation.id}:${req.user.id}`, Date.now());
  ok(res, { ok: true });
}));

router.post('/presence/ping', asyncHandler((req, res) => {
  presence.set(req.user.id, Date.now());
  ok(res, { online: true });
}));

router.get('/presence', asyncHandler((req, res) => {
  const members = all('profiles', (p) => p.org_id === req.user.org_id)
    .map((p) => ({ id: p.id, name: p.name, online: (Date.now() - (presence.get(p.id) || 0)) < 120000 }));
  ok(res, members);
}));

export default router;
