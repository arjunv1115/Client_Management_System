import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { seedData } from './seed.js';

const DB_FILE = path.join(config.dataDir, 'db.json');
const TMP_FILE = `${DB_FILE}.tmp`;

let state = { tables: {}, meta: {} };

function persist() {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.writeFileSync(TMP_FILE, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(TMP_FILE, DB_FILE);
}

export function initStore({ force = false } = {}) {
  fs.mkdirSync(config.dataDir, { recursive: true });
  if (!force && fs.existsSync(DB_FILE)) {
    try {
      state = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (!state.tables) throw new Error('Invalid database file');
    } catch (error) {
      console.warn('[db] Could not read db.json, reseeding:', error.message);
      state = seedData();
      persist();
    }
  } else {
    state = seedData();
    persist();
    console.log('[db] Seeded local demo database at', DB_FILE);
  }
  return state;
}

export function resetStore() {
  state = seedData();
  persist();
  return state;
}

export function table(name) {
  if (!state.tables[name]) state.tables[name] = [];
  return state.tables[name];
}

export function all(name, predicate = () => true) {
  return table(name).filter(predicate);
}

export function find(name, predicate) {
  return table(name).find(predicate) || null;
}

export function getById(name, id) {
  return find(name, (row) => row.id === id) || null;
}

export function insert(name, row) {
  const now = new Date().toISOString();
  const record = {
    id: row.id || crypto.randomUUID(),
    created_at: row.created_at || now,
    updated_at: now,
    ...row,
  };
  table(name).push(record);
  persist();
  return record;
}

export function insertMany(name, rows) {
  const now = new Date().toISOString();
  const records = rows.map((row) => ({
    id: row.id || crypto.randomUUID(),
    created_at: row.created_at || now,
    updated_at: now,
    ...row,
  }));
  table(name).push(...records);
  persist();
  return records;
}

export function update(name, id, patch) {
  const rows = table(name);
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) return null;
  const { id: _ignored, ...safePatch } = patch;
  rows[index] = { ...rows[index], ...safePatch, updated_at: new Date().toISOString() };
  persist();
  return rows[index];
}

export function remove(name, id, hard = false) {
  const rows = table(name);
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) return false;
  if (hard) {
    rows.splice(index, 1);
  } else {
    rows[index] = { ...rows[index], deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  }
  persist();
  return true;
}

export function count(name, predicate = () => true) {
  return table(name).filter(predicate).length;
}

export function setTable(name, rows) {
  state.tables[name] = rows;
  persist();
}

export function save() {
  persist();
}

export function getState() {
  return state;
}

export function snapshot() {
  return JSON.parse(JSON.stringify(state));
}
