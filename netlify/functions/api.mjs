// Single backend endpoint for the app: login, data tables, user settings,
// market-data functions, and backup import/export. Served at /api/*.

import {
  isValidEntity,
  queryRows,
  listRows,
  createRows,
  updateRow,
  deleteRows,
  replaceAllRows,
  getUserDoc,
  updateUserDoc,
  replaceUserDoc,
} from '../lib/store.mjs';
import {
  sessionUser,
  checkPassword,
  passwordConfigured,
  makeSessionCookie,
  clearSessionCookie,
  env,
} from '../lib/auth.mjs';
import * as market from '../lib/market.mjs';
import { ENTITY_NAMES } from '../../src/data/schemas.js';

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
  });

async function readBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return {};
  const text = await req.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), { status: 400 });
  }
}

// Both logins share one portfolio; the profile just says who is signed in.
function ownerProfile(doc, userName) {
  return {
    ...doc,
    id: userName,
    email: `${userName}@arad-portfolio`,
    full_name: userName.charAt(0).toUpperCase() + userName.slice(1),
    role: 'admin',
  };
}

async function symbolsForUser() {
  const [open, watch, ee] = await Promise.all([
    listRows('OpenPosition'),
    listRows('WatchListItem'),
    listRows('EEOpenPosition'),
  ]);
  return [...new Set([...open, ...watch, ...ee].map((r) => r.symbol).filter(Boolean))];
}

const FUNCTIONS = {
  getCurrentPrices: (p) => market.getCurrentPrices(p),
  getIndexPrices: (p) => market.getIndexPrices(p),
  getBulkHistoricalPrices: (p) => market.getBulkHistoricalPrices(p),
  get52WeekRange: (p) => market.get52WeekRange(p),
  getBenchmarkData: (p) => market.getBenchmarkData(p),
  getChartData: (p) => market.getChartData(p),
  getLastTradingDayPrice: (p) => market.getLastTradingDayPrice(p),
  getHistoricalPrice: (p) => market.getHistoricalPrice(p, { listRows }),
  getOptionPrices: (p) => market.getOptionPrices(p),
  getEarningsCalendar: async (p) => market.getEarningsCalendar(p, { symbols: await symbolsForUser() }),
  getNews: (p) => market.getNews(p),
};

async function handle(req) {
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [section, a, b] = parts;
  const method = req.method;

  // ----- Public routes -----
  if (section === 'login' && method === 'POST') {
    if (!passwordConfigured()) {
      return json({ error: 'No logins are set up yet (APP_USERS on Netlify).' }, 503);
    }
    const { password } = await readBody(req);
    const name = checkPassword(password || '');
    if (!name) {
      await new Promise((r) => setTimeout(r, 700)); // slow down guessing
      return json({ error: 'Wrong password' }, 401);
    }
    return json({ ok: true }, 200, { 'set-cookie': makeSessionCookie(name) });
  }
  if (section === 'logout') {
    return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie() });
  }
  if (section === 'health') {
    return json({ ok: true, passwordConfigured: passwordConfigured() });
  }

  // ----- Everything below requires login -----
  const userName = sessionUser(req);
  if (!userName) return json({ error: 'Authentication required' }, 401);

  if (section === 'me') {
    if (method === 'GET') return json(ownerProfile(await getUserDoc(), userName));
    if (method === 'PUT' || method === 'PATCH' || method === 'POST') {
      return json(ownerProfile(await updateUserDoc(await readBody(req)), userName));
    }
  }

  if (section === 'entities') {
    const name = a;
    if (!isValidEntity(name)) return json({ error: `Unknown table: ${name}` }, 404);

    if (!b) {
      if (method === 'GET') {
        let query;
        const q = url.searchParams.get('q');
        if (q) {
          try {
            query = JSON.parse(q);
          } catch {
            return json({ error: 'Invalid q parameter' }, 400);
          }
        }
        const rows = await queryRows(name, {
          query,
          sort: url.searchParams.get('sort') || undefined,
          limit: url.searchParams.get('limit') || undefined,
          skip: url.searchParams.get('skip') || undefined,
        });
        return json(rows);
      }
      if (method === 'POST') {
        const body = await readBody(req);
        const items = Array.isArray(body) ? body : [body];
        const created = await createRows(name, items, { by: userName });
        return json(Array.isArray(body) ? created : created[0], 201);
      }
      if (method === 'DELETE') {
        // Bulk delete by query: DELETE /api/entities/X?q={...}
        const q = url.searchParams.get('q');
        const query = q ? JSON.parse(q) : null;
        if (!query) return json({ error: 'Refusing to delete everything without a query' }, 400);
        const ids = (await queryRows(name, { query })).map((r) => r.id);
        return json({ deleted: await deleteRows(name, ids) });
      }
    } else {
      if (method === 'GET') {
        const row = (await listRows(name)).find((r) => r.id === b);
        return row ? json(row) : json({ error: 'Not found' }, 404);
      }
      if (method === 'PUT' || method === 'PATCH') {
        const row = await updateRow(name, b, await readBody(req));
        return row ? json(row) : json({ error: 'Not found' }, 404);
      }
      if (method === 'DELETE') {
        const n = await deleteRows(name, [b]);
        return n ? json({ deleted: n }) : json({ error: 'Not found' }, 404);
      }
    }
  }

  if (section === 'functions' && method === 'POST') {
    const fn = FUNCTIONS[a];
    if (!fn) return json({ error: `Unknown function: ${a}` }, 404);
    const result = await fn(await readBody(req));
    return json(result.body, result.status || 200);
  }

  // Full backup download.
  if (section === 'export' && method === 'GET') {
    const entities = {};
    for (const name of ENTITY_NAMES) entities[name] = await listRows(name);
    return json(
      { app: 'arad-portfolio', version: 1, exported_at: new Date().toISOString(), user: await getUserDoc(), entities },
      200,
      { 'content-disposition': `attachment; filename="portfolio-backup-${new Date().toISOString().slice(0, 10)}.json"` },
    );
  }

  // Import rows into one table: { entity, rows, mode: 'append' | 'replace' }
  // or a full backup: { entities: {...}, user: {...}, mode }
  if (section === 'import' && method === 'POST') {
    const body = await readBody(req);
    const mode = body.mode === 'replace' ? 'replace' : 'append';
    const batches = body.entities ? Object.entries(body.entities) : body.entity ? [[body.entity, body.rows]] : [];
    const summary = {};
    for (const [name, rows] of batches) {
      if (!isValidEntity(name)) {
        summary[name] = 'skipped (unknown table)';
        continue;
      }
      if (!Array.isArray(rows)) continue;
      if (mode === 'replace') await replaceAllRows(name, []);
      const created = await createRows(name, rows, { preserveIds: true, by: userName });
      summary[name] = created.length;
    }
    if (body.user && typeof body.user === 'object') {
      if (mode === 'replace') await replaceUserDoc(body.user);
      else await updateUserDoc(body.user);
      summary.user = 'updated';
    }
    return json({ ok: true, mode, imported: summary });
  }

  return json({ error: 'Not found' }, 404);
}

export default async (req) => {
  try {
    return await handle(req);
  } catch (err) {
    console.error(err);
    return json({ error: err.message || 'Server error' }, err.status || 500);
  }
};

export const config = { path: '/api/*' };
