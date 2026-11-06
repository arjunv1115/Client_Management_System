import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import express from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { all, insert, find, update } from '../db/store.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler, ok, created, ApiError } from '../utils/http.js';
import { recordAudit } from '../utils/audit.js';

const router = express.Router();
router.use(authRequired);

fs.mkdirSync(config.uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    fs.mkdirSync(config.uploadsDir, { recursive: true });
    callback(null, config.uploadsDir);
  },
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname || '').slice(0, 12).replace(/[^.a-zA-Z0-9]/g, '');
    const base = path.basename(file.originalname || 'file', path.extname(file.originalname || ''))
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .slice(0, 50) || 'file';
    callback(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${base}${ext}`);
  },
});

const BLOCKED = /\.(exe|dll|bat|cmd|com|msi|scr|ps1|sh|js|mjs|cjs)$/i;

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (BLOCKED.test(file.originalname || '')) {
      return callback(new ApiError(400, 'This file type is not allowed.'));
    }
    return callback(null, true);
  },
});

function publicUrl(filename) {
  return `/uploads/${filename}`;
}

router.post('/', upload.single('file'), asyncHandler((req, res) => {
  if (!req.file) throw new ApiError(400, 'Choose a file to upload.');
  const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  const url = publicUrl(req.file.filename);
  const asset = insert('uploads', {
    org_id: req.user.org_id,
    uploaded_by: req.user.id,
    filename: req.file.filename,
    original_name: originalName,
    mime_type: req.file.mimetype,
    size: req.file.size,
    url,
  });

  let document = null;
  if (req.body?.attach_to_documents === 'true' || req.body?.attach_document === 'true') {
    if (req.user.role === 'client') throw new ApiError(403, 'Clients cannot add documents to the workspace library.');
    document = insert('documents', {
      org_id: req.user.org_id,
      name: req.body?.name || originalName,
      category: req.body?.category || 'Project Documents',
      client_id: req.body?.client_id || null,
      project_id: req.body?.project_id || null,
      file_url: url,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      uploaded_by: req.user.id,
      shared_with_client: req.body?.shared_with_client === 'true',
    });
    recordAudit({
      orgId: req.user.org_id, user: req.user, action: 'documents.uploaded',
      entity: 'documents', entityId: document.id, changes: { name: document.name, size: req.file.size }, ip: req.ip,
    });
  }

  return created(res, {
    ...asset,
    document,
    url,
    absolute_url: `${req.protocol}://${req.get('host')}${url}`,
  });
}));

router.get('/', asyncHandler((req, res) => {
  const uploads = all('uploads', (u) => u.org_id === req.user.org_id && !u.deleted_at)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  ok(res, uploads);
}));

router.delete('/:filename', asyncHandler((req, res) => {
  const filename = path.basename(String(req.params.filename));
  const asset = find('uploads', (u) => u.filename === filename && u.org_id === req.user.org_id);
  if (!asset) throw new ApiError(404, 'Upload not found.');
  if (asset.uploaded_by !== req.user.id && !['super_admin', 'admin', 'manager'].includes(req.user.role)) {
    throw new ApiError(403, 'You cannot delete this file.');
  }
  const filePath = path.join(config.uploadsDir, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  update('uploads', asset.id, { deleted_at: new Date().toISOString() });
  recordAudit({ orgId: req.user.org_id, user: req.user, action: 'uploads.deleted', entity: 'uploads', entityId: asset.id, changes: {}, ip: req.ip });
  ok(res, { id: asset.id, deleted: true });
}));

export default router;
