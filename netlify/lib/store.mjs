// Data storage on Netlify Blobs.
//
// Each table ("entity") is one JSON document holding an array of records.
// Writes use optimistic concurrency (compare-and-swap on the blob's ETag) so
// two simultaneous writes can never silently overwrite each other — the loser
// re-reads and retries.

import { getStore } from '@netlify/blobs';
import { randomBytes } from 'node:crypto';
import { ENTITY_NAMES } from '../../src/data/schemas.js';

const STORE_NAME = 'portfolio-data';
const USER_KEY = 'user/me';

function store() {
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}

const entityKey = (name) => `entity/${name}`;

export function isValidEntity(name) {
  return ENTITY_NAMES.includes(name);
}

export function newId() {
  // 24 hex chars, same shape as Base44/Mongo ids.
  return randomBytes(12).toString('hex');
}

async function readDoc(key) {
  const res = await store().getWithMetadata(key, { type: 'json' });
  if (!res) return { data: null, etag: null };
  return { data: res.data, etag: res.etag };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Read-modify-write with retry. `fn` receives the current value and returns
// { value, result }: `value` is written back, `result` is returned to caller.
async function mutateDoc(key, initial, fn) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const { data, etag } = await readDoc(key);
    const current = data ?? structuredClone(initial);
    const { value, result } = fn(current);
    const opts = etag ? { onlyIfMatch: etag } : { onlyIfNew: true };
    const res = await store().setJSON(key, value, opts);
    // Older @netlify/blobs versions return undefined; treat as success.
    if (!res || res.modified !== false) return result;
    await sleep(40 * 2 ** attempt + Math.random() * 40);
  }
  throw new Error('Write conflict: please retry');
}

// ---------- Entities ----------

export async function listRows(name) {
  const { data } = await readDoc(entityKey(name));
  return Array.isArray(data) ? data : [];
}

function compareValues(a, b) {
  const an = a === undefined || a === null || a === '';
  const bn = b === undefined || b === null || b === '';
  if (an && bn) return 0;
  if (an) return -1;
  if (bn) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

export function sortRows(rows, sort) {
  if (!sort || typeof sort !== 'string') {
    // Base44 default: newest first.
    return [...rows].sort((x, y) => -compareValues(x.created_date, y.created_date));
  }
  const desc = sort.startsWith('-');
  const field = sort.replace(/^[-+]/, '');
  return [...rows].sort((x, y) => {
    const c = compareValues(x[field], y[field]);
    return desc ? -c : c;
  });
}

export function matchesQuery(row, query) {
  if (!query || typeof query !== 'object') return true;
  return Object.entries(query).every(([k, v]) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if ('$in' in v) return v.$in.includes(row[k]);
      if ('$ne' in v) return row[k] !== v.$ne;
      if ('$gte' in v && !(compareValues(row[k], v.$gte) >= 0)) return false;
      if ('$lte' in v && !(compareValues(row[k], v.$lte) <= 0)) return false;
      if ('$gt' in v && !(compareValues(row[k], v.$gt) > 0)) return false;
      if ('$lt' in v && !(compareValues(row[k], v.$lt) < 0)) return false;
      return true;
    }
    return row[k] === v;
  });
}

export async function queryRows(name, { query, sort, limit, skip } = {}) {
  let rows = (await listRows(name)).filter((r) => matchesQuery(r, query));
  rows = sortRows(rows, sort);
  const s = Number(skip) > 0 ? Number(skip) : 0;
  const l = Number(limit) > 0 ? Number(limit) : undefined;
  return rows.slice(s, l ? s + l : undefined);
}

const SYSTEM_FIELDS = ['id', 'created_date', 'updated_date', 'created_by'];

function stripSystem(data) {
  const out = { ...data };
  for (const f of SYSTEM_FIELDS) delete out[f];
  return out;
}

export async function createRows(name, items, { preserveIds = false, by = '' } = {}) {
  const now = new Date().toISOString();
  return mutateDoc(entityKey(name), [], (rows) => {
    const existing = new Set(rows.map((r) => r.id));
    const created = items.map((item) => {
      const keepId = preserveIds && item.id && !existing.has(item.id);
      const rec = {
        ...stripSystem(item),
        id: keepId ? String(item.id) : newId(),
        created_date: (preserveIds && item.created_date) || now,
        updated_date: (preserveIds && item.updated_date) || now,
        created_by: (preserveIds && item.created_by) || by,
      };
      existing.add(rec.id);
      return rec;
    });
    return { value: [...rows, ...created], result: created };
  });
}

export async function updateRow(name, id, patch) {
  const now = new Date().toISOString();
  return mutateDoc(entityKey(name), [], (rows) => {
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) return { value: rows, result: null };
    const updated = { ...rows[idx], ...stripSystem(patch), updated_date: now };
    const next = [...rows];
    next[idx] = updated;
    return { value: next, result: updated };
  });
}

export async function deleteRows(name, ids) {
  const set = new Set(ids);
  return mutateDoc(entityKey(name), [], (rows) => {
    const next = rows.filter((r) => !set.has(r.id));
    return { value: next, result: rows.length - next.length };
  });
}

export async function replaceAllRows(name, rows) {
  await store().setJSON(entityKey(name), rows);
}

// Insert-or-update rows matched by a key function (used by daily snapshots).
export async function upsertRows(name, items, keyFn) {
  const now = new Date().toISOString();
  return mutateDoc(entityKey(name), [], (rows) => {
    const next = [...rows];
    const index = new Map(next.map((r, i) => [keyFn(r), i]));
    let count = 0;
    for (const item of items) {
      const k = keyFn(item);
      if (index.has(k)) {
        const i = index.get(k);
        next[i] = { ...next[i], ...item, updated_date: now };
      } else {
        next.push({ ...item, id: newId(), created_date: now, updated_date: now, created_by: 'system' });
        index.set(k, next.length - 1);
      }
      count++;
    }
    return { value: next, result: count };
  });
}

// ---------- User (single owner) ----------

export async function getUserDoc() {
  const { data } = await readDoc(USER_KEY);
  return data && typeof data === 'object' ? data : {};
}

export async function updateUserDoc(patch) {
  return mutateDoc(USER_KEY, {}, (doc) => {
    const next = { ...doc, ...stripSystem(patch) };
    return { value: next, result: next };
  });
}

export async function replaceUserDoc(doc) {
  await store().setJSON(USER_KEY, stripSystem(doc || {}));
}
