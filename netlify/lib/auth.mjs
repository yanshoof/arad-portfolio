// Single-owner password login. The password lives in the APP_PASSWORD
// environment variable on Netlify; a signed, HttpOnly cookie keeps you
// logged in on each device.

import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

const COOKIE = 'ap_session';
const MAX_AGE_SEC = 180 * 24 * 60 * 60; // 180 days

export function env(name) {
  try {
    // eslint-disable-next-line no-undef
    if (typeof Netlify !== 'undefined' && Netlify?.env?.get) return Netlify.env.get(name);
  } catch {
    /* fall through */
  }
  return process.env[name];
}

// Users come from APP_USERS = "eran:password1,dad:password2" (name:password
// pairs, comma-separated). APP_PASSWORD alone still works as a single "owner".
export function users() {
  const out = [];
  const raw = env('APP_USERS') || '';
  for (const pair of raw.split(',')) {
    const i = pair.indexOf(':');
    if (i < 1) continue;
    const name = pair.slice(0, i).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const password = pair.slice(i + 1).trim();
    if (name && password) out.push({ name, password });
  }
  const single = env('APP_PASSWORD');
  if (single && !out.length) out.push({ name: 'owner', password: single });
  return out;
}

function secret() {
  const explicit = env('SESSION_SECRET');
  if (explicit) return explicit;
  const all = users().map((u) => `${u.name}:${u.password}`).join(',');
  // Derived secret: changing any password logs out every device.
  return createHash('sha256').update(`apex-session:${all}`).digest('hex');
}

function sign(payload) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function passwordConfigured() {
  return users().length > 0;
}

// Returns the matching user's name, or null.
export function checkPassword(candidate) {
  const h = (s) => createHash('sha256').update(String(s)).digest('hex');
  let match = null;
  for (const u of users()) {
    // Compare against every user (no early exit) to keep timing uniform.
    if (safeEqual(h(candidate), h(u.password)) && !match) match = u.name;
  }
  return match;
}

export function makeSessionCookie(name) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = `v2.${name}.${exp}`;
  const token = `${payload}.${sign(payload)}`;
  return `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE_SEC}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

function readCookie(req, name) {
  const header = req.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

// Returns the logged-in user's name, or null. A user removed from APP_USERS
// is logged out immediately.
export function sessionUser(req) {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [v, name, exp, sig] = parts;
  if (v !== 'v2') return null;
  if (!(Number(exp) > Math.floor(Date.now() / 1000))) return null;
  if (!safeEqual(sig, sign(`${v}.${name}.${exp}`))) return null;
  return users().some((u) => u.name === name) ? name : null;
}

export function isAuthenticated(req) {
  return Boolean(sessionUser(req));
}
