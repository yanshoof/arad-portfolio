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

function secret() {
  const explicit = env('SESSION_SECRET');
  if (explicit) return explicit;
  const pw = env('APP_PASSWORD') || '';
  // Derived secret: changing the password logs out every device.
  return createHash('sha256').update(`apex-session:${pw}`).digest('hex');
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
  return Boolean(env('APP_PASSWORD'));
}

export function checkPassword(candidate) {
  const pw = env('APP_PASSWORD');
  if (!pw) return false;
  const h = (s) => createHash('sha256').update(String(s)).digest('hex');
  return safeEqual(h(candidate), h(pw));
}

export function makeSessionCookie() {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = `v1.${exp}`;
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

export function isAuthenticated(req) {
  const token = readCookie(req, COOKIE);
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [v, exp, sig] = parts;
  if (v !== 'v1') return false;
  if (!(Number(exp) > Math.floor(Date.now() / 1000))) return false;
  return safeEqual(sig, sign(`${v}.${exp}`));
}
