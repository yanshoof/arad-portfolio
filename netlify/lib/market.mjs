// Market data (Yahoo Finance, with optional Finnhub fallback).
// Ported from the Base44 server functions, plus fixes:
//  - chart data now uses Yahoo (the old Tradier key-based source was dead)
//  - option prices + earnings use Yahoo's cookie/crumb handshake (the old
//    endpoints started returning 401 "Invalid Crumb")
//  - news comes from real Yahoo Finance headlines (the old version asked an
//    AI to write "realistic" URLs, i.e. invented links)

import { env } from './auth.mjs';

const UA = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'application/json,text/plain,*/*',
};
const QUOTE_TTL_MS = 60 * 1000;
const HISTORY_TTL_MS = 4 * 60 * 60 * 1000;

const quoteCache = new Map();
const historyCache = new Map();

async function fetchWithRetry(url, init = {}) {
  let res = await fetch(url, { ...init, headers: { ...UA, ...(init.headers || {}) } });
  if (res.status === 429 || res.status >= 500) {
    await new Promise((r) => setTimeout(r, 1200));
    const alt = url.includes('query1.') ? url.replace('query1.', 'query2.') : url.replace('query2.', 'query1.');
    res = await fetch(alt, { ...init, headers: { ...UA, ...(init.headers || {}) } });
  }
  return res;
}

// ---------- Yahoo cookie + crumb (needed for options / quoteSummary) ----------

let crumbState = null; // { at, cookie, crumb }

function extractCookies(res) {
  const list = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const raw = list.length ? list : [res.headers.get('set-cookie')].filter(Boolean);
  return raw.map((c) => c.split(';')[0]).filter(Boolean).join('; ');
}

async function getCrumb(force = false) {
  if (!force && crumbState && Date.now() - crumbState.at < 30 * 60 * 1000) return crumbState;
  let cookie = '';
  for (const url of ['https://fc.yahoo.com/', 'https://finance.yahoo.com/']) {
    try {
      const r = await fetch(url, { headers: UA, redirect: 'manual' });
      cookie = extractCookies(r);
      if (cookie) break;
    } catch {
      /* try next */
    }
  }
  const r2 = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: { ...UA, cookie },
  });
  const crumb = (await r2.text()).trim();
  if (!r2.ok || !crumb || crumb.includes('<') || crumb.length > 40) {
    throw new Error(`Could not get Yahoo crumb (HTTP ${r2.status})`);
  }
  crumbState = { at: Date.now(), cookie, crumb };
  return crumbState;
}

async function fetchWithCrumb(buildUrl) {
  for (let i = 0; i < 2; i++) {
    const { cookie, crumb } = await getCrumb(i > 0);
    const res = await fetch(buildUrl(encodeURIComponent(crumb)), { headers: { ...UA, cookie } });
    if (res.status === 401 || res.status === 403) continue;
    return res;
  }
  throw new Error('Yahoo rejected crumb');
}

// ---------- Quotes ----------

function prevCloseFromCandles(result, todayStr) {
  const timestamps = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  for (let i = timestamps.length - 1; i >= 0; i--) {
    const ds = new Date(timestamps[i] * 1000).toISOString().slice(0, 10);
    if (ds === todayStr) continue;
    const c = Number(closes[i]);
    if (c > 0) return c;
  }
  return null;
}

async function fetchSparkBatch(symbols) {
  const url = `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${encodeURIComponent(symbols.join(','))}&range=5d&interval=1d`;
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`Yahoo spark HTTP ${res.status}`);
  const json = await res.json();
  const out = {};
  for (const r of json?.spark?.result || []) {
    const resp = r?.response?.[0];
    const meta = resp?.meta;
    const current = Number(meta?.regularMarketPrice);
    if (!(current > 0)) continue;
    const nowSec = Number(meta?.regularMarketTime) || Math.floor(Date.now() / 1000);
    const todayStr = new Date(nowSec * 1000).toISOString().slice(0, 10);
    let prevClose = Number(meta?.previousClose) || Number(meta?.regularMarketPreviousClose);
    if (!(prevClose > 0)) prevClose = prevCloseFromCandles(resp, todayStr);
    if (!(prevClose > 0)) prevClose = Number(meta?.chartPreviousClose);
    out[String(r.symbol).toUpperCase()] = { current, prevClose: prevClose > 0 ? prevClose : current };
  }
  return out;
}

async function fetchChartQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=10d`;
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status} for ${symbol}`);
  const result = (await res.json())?.chart?.result?.[0];
  const meta = result?.meta;
  const current = Number(meta?.regularMarketPrice);
  if (!(current > 0)) throw new Error(`No price for ${symbol}`);
  const nowSec = Number(meta?.regularMarketTime) || Math.floor(Date.now() / 1000);
  const todayStr = new Date(nowSec * 1000).toISOString().slice(0, 10);
  let prevClose = Number(meta?.regularMarketPreviousClose);
  if (!(prevClose > 0)) prevClose = prevCloseFromCandles(result, todayStr);
  if (!(prevClose > 0)) prevClose = Number(meta?.chartPreviousClose);
  return { current, prevClose: prevClose > 0 ? prevClose : current };
}

async function fetchFinnhubQuote(symbol) {
  const key = env('FINNHUB_API_KEY');
  if (!key) throw new Error('No FINNHUB_API_KEY');
  const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`);
  if (!res.ok) throw new Error(`Finnhub HTTP ${res.status} for ${symbol}`);
  const q = await res.json();
  const current = Number(q?.c);
  if (!(current > 0)) throw new Error(`Finnhub no price for ${symbol}`);
  const prevClose = Number(q?.pc);
  return { current, prevClose: prevClose > 0 ? prevClose : current };
}

export async function getQuotes(symbols) {
  const now = Date.now();
  const wanted = [...new Set(symbols.map((s) => String(s).toUpperCase().trim()).filter(Boolean))];
  const missing = wanted.filter((s) => !(quoteCache.has(s) && now - quoteCache.get(s).at < QUOTE_TTL_MS));

  if (missing.length) {
    const chunks = [];
    for (let i = 0; i < missing.length; i += 20) chunks.push(missing.slice(i, i + 20));
    const batches = await Promise.all(
      chunks.map((c) =>
        fetchSparkBatch(c).catch((e) => {
          console.error('spark batch failed:', e.message);
          return {};
        }),
      ),
    );
    for (const b of batches) for (const [sym, q] of Object.entries(b)) quoteCache.set(sym, { at: now, ...q });

    const stillMissing = missing.filter((s) => !quoteCache.has(s) || now - quoteCache.get(s).at >= QUOTE_TTL_MS);
    await Promise.all(
      stillMissing.map(async (s) => {
        try {
          quoteCache.set(s, { at: now, ...(await fetchChartQuote(s)) });
        } catch (e) {
          try {
            quoteCache.set(s, { at: now, ...(await fetchFinnhubQuote(s)) });
          } catch (e2) {
            console.error(`Quote failed ${s}: ${e.message}; ${e2.message}`);
          }
        }
      }),
    );
  }

  const prices = {};
  const prevCloses = {};
  for (const s of wanted) {
    const q = quoteCache.get(s);
    if (!q) continue;
    prices[s] = q.current;
    prevCloses[s] = q.prevClose;
  }
  return { prices, prevCloses };
}

// 1 year of daily closes, oldest → newest.
export async function getHistory(symbol) {
  const now = Date.now();
  const cached = historyCache.get(symbol);
  if (cached && now - cached.at < HISTORY_TTL_MS) return cached.history;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`;
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status} for ${symbol}`);
  const result = (await res.json())?.chart?.result?.[0];
  if (!result) throw new Error(`No result for ${symbol}`);
  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  const history = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] != null && closes[i] > 0) history.push({ date: new Date(timestamps[i] * 1000), close: closes[i] });
  }
  historyCache.set(symbol, { at: now, history });
  return history;
}

// ---------- Function handlers (same names + response shapes as Base44) ----------

export async function getCurrentPrices({ symbols } = {}) {
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return { status: 400, body: { error: 'Symbols array is required' } };
  }
  return { body: await getQuotes(symbols) };
}

export async function getIndexPrices() {
  return { body: await getQuotes(['DIA', 'SPY', 'QQQ', 'UUP', 'IWM']) };
}

function priceAtOrBefore(history, targetDate) {
  let best = null;
  for (const entry of history) {
    if (entry.date <= targetDate) best = entry.close;
    else break;
  }
  return best;
}

export async function getBulkHistoricalPrices({ symbols, periods } = {}) {
  if (!symbols?.length || !periods?.length) {
    return { status: 400, body: { error: 'symbols and periods are required' } };
  }
  const result = {};
  await Promise.all(
    symbols.map(async (symbol) => {
      result[symbol] = {};
      try {
        const history = await getHistory(symbol);
        for (const { key, daysAgo } of periods) {
          const target = new Date();
          target.setDate(target.getDate() - daysAgo);
          const price = priceAtOrBefore(history, target);
          if (price) result[symbol][key] = price;
        }
      } catch (e) {
        console.error(`Yahoo history error ${symbol}:`, e.message);
      }
    }),
  );
  return { body: { prices: result } };
}

export async function get52WeekRange({ symbols } = {}) {
  if (!Array.isArray(symbols) || symbols.length === 0) return { body: { ranges: {} } };
  const unique = [...new Set(symbols.map((s) => String(s).toUpperCase()))];
  const ranges = {};
  await Promise.all(
    unique.map(async (sym) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
        const res = await fetchWithRetry(url);
        if (!res.ok) return;
        const meta = (await res.json())?.chart?.result?.[0]?.meta;
        const high = Number(meta?.fiftyTwoWeekHigh);
        const low = Number(meta?.fiftyTwoWeekLow);
        if (high > 0 && low > 0) ranges[sym] = { high, low };
      } catch {
        /* skip */
      }
    }),
  );
  return { body: { ranges } };
}

export async function getBenchmarkData() {
  const res = await fetchWithRetry('https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1wk&range=1y');
  if (!res.ok) return { body: { candles: [] } };
  const result = (await res.json())?.chart?.result?.[0];
  const ts = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  const points = [];
  for (let i = 0; i < ts.length; i++) if (closes[i] != null && closes[i] > 0) points.push({ t: ts[i], close: closes[i] });
  if (!points.length) return { body: { candles: [] } };
  const start = points[0].close;
  return {
    body: {
      candles: points.map((p) => ({
        date: new Date(p.t * 1000).toISOString().split('T')[0],
        value: ((p.close - start) / start) * 100,
        close: p.close,
      })),
    },
  };
}

export async function getChartData({ symbol, period } = {}) {
  if (!symbol || !period) return { status: 400, body: { error: 'Symbol and period are required' } };
  const map = { '1D': ['1d', '5m'], '1W': ['5d', '30m'], '1M': ['1mo', '1d'], '3M': ['3mo', '1d'], '6M': ['6mo', '1d'], '1Y': ['1y', '1d'] };
  const [range, interval] = map[period] || ['1mo', '1d'];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) return { status: 502, body: { error: `Yahoo HTTP ${res.status}` } };
  const result = (await res.json())?.chart?.result?.[0];
  const ts = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  const intraday = interval !== '1d';
  const prices = [];
  for (let i = 0; i < ts.length; i++) {
    if (closes[i] == null) continue;
    const d = new Date(ts[i] * 1000).toISOString();
    prices.push({ date: intraday ? d : d.split('T')[0], price: closes[i] });
  }
  return { body: { prices } };
}

export async function getLastTradingDayPrice({ symbol } = {}) {
  if (!symbol) return { status: 400, body: { error: 'Symbol is required' } };
  const res = await fetchWithRetry(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`);
  if (!res.ok) return { status: 502, body: { error: `Yahoo HTTP ${res.status}` } };
  const result = (await res.json())?.chart?.result?.[0];
  const ts = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  const today = new Date().toISOString().slice(0, 10);
  for (let i = ts.length - 1; i >= 0; i--) {
    const ds = new Date(ts[i] * 1000).toISOString().slice(0, 10);
    if (ds === today) continue;
    const c = Number(closes[i]);
    if (c > 0) return { body: { symbol, price: c, date: ds } };
  }
  return { body: { symbol, price: null, date: null } };
}

// Uses stored daily snapshots first, then Yahoo history.
export async function getHistoricalPrice({ symbol, daysAgo } = {}, { listRows } = {}) {
  if (!symbol || !daysAgo) return { status: 400, body: { error: 'Symbol and daysAgo are required' } };
  const target = new Date();
  target.setDate(target.getDate() - daysAgo);
  const targetStr = target.toISOString().split('T')[0];
  if (listRows) {
    try {
      const snaps = (await listRows('DailyStockSnapshot'))
        .filter((s) => s.symbol === symbol && s.snapshot_date <= targetStr)
        .sort((a, b) => (a.snapshot_date < b.snapshot_date ? 1 : -1));
      if (snaps.length) {
        return { body: { symbol, price: snaps[0].close_price, date: snaps[0].snapshot_date, source: 'database' } };
      }
    } catch (e) {
      console.error('snapshot lookup failed', e.message);
    }
  }
  const history = await getHistory(symbol);
  let hit = null;
  for (const h of history) if (h.date <= target) hit = h;
  if (!hit && history.length) hit = history[0];
  return {
    body: {
      symbol,
      price: hit ? hit.close : null,
      date: hit ? hit.date.toISOString().split('T')[0] : targetStr,
      source: 'yahoo',
    },
  };
}

// ---------- Options ----------

function optionPrice(opt) {
  if (Number(opt.lastPrice) > 0) return Number(opt.lastPrice);
  const bid = Number(opt.bid);
  const ask = Number(opt.ask);
  if (bid > 0 && ask > 0) return (bid + ask) / 2;
  if (bid > 0) return bid;
  return null;
}

async function fetchChain(symbol, expiration) {
  const epoch = Math.floor(Date.parse(`${expiration}T00:00:00Z`) / 1000);
  const res = await fetchWithCrumb(
    (crumb) => `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}?date=${epoch}&crumb=${crumb}`,
  );
  if (!res.ok) return null;
  const chain = (await res.json())?.optionChain?.result?.[0]?.options?.[0];
  if (!chain) return null;
  return { calls: chain.calls || [], puts: chain.puts || [] };
}

export async function getOptionPrices({ positions } = {}) {
  if (!Array.isArray(positions) || positions.length === 0) {
    return { status: 400, body: { error: 'Positions array is required' } };
  }
  const groups = {};
  for (const pos of positions) {
    const key = `${pos.symbol}_${pos.expiration_date}`;
    if (!groups[key]) groups[key] = { symbol: pos.symbol, expiration: pos.expiration_date, positions: [] };
    groups[key].positions.push(pos);
  }
  const optionPrices = {};
  const prevClosePrices = {};
  await Promise.all(
    Object.values(groups).map(async (g) => {
      try {
        const chain = await fetchChain(g.symbol, g.expiration);
        if (!chain) return;
        for (const pos of g.positions) {
          const list = pos.option_type?.toUpperCase() === 'PUT' ? chain.puts : chain.calls;
          const match = list.find((o) => Math.abs(Number(o.strike) - Number(pos.strike)) < 0.01);
          if (!match) continue;
          const key = `${pos.symbol}_${pos.option_type}_${pos.strike}_${pos.expiration_date}`;
          const current = optionPrice(match);
          if (current == null) continue;
          optionPrices[key] = current;
          const change = Number(match.change);
          const prev = Number.isFinite(change) ? Number(match.lastPrice) - change : null;
          if (prev != null && prev > 0) prevClosePrices[key] = prev;
        }
      } catch (e) {
        console.error(`Option chain error ${g.symbol} ${g.expiration}:`, e.message);
      }
    }),
  );
  return { body: { optionPrices, prevClosePrices } };
}

// ---------- Earnings calendar ----------

function etHourMinute(epochSec) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(new Date(epochSec * 1000));
  const h = Number(parts.find((p) => p.type === 'hour')?.value) % 24;
  const m = Number(parts.find((p) => p.type === 'minute')?.value);
  return h * 60 + m;
}

function etDate(epochSec) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(epochSec * 1000));
}

export async function getEarningsCalendar(_payload, { symbols = [] } = {}) {
  const unique = [...new Set(symbols.map((s) => String(s).toUpperCase().trim()).filter(Boolean))];
  if (!unique.length) return { body: { earnings: [] } };

  const nowSec = Math.floor(Date.now() / 1000);
  const horizon = nowSec + 90 * 86400;
  const startOfToday = nowSec - 86400;

  // Batch quote call gives the precise earnings timestamp for each symbol.
  const quoteInfo = {};
  for (let i = 0; i < unique.length; i += 40) {
    const chunk = unique.slice(i, i + 40);
    try {
      const res = await fetchWithCrumb(
        (crumb) =>
          `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(chunk.join(','))}&crumb=${crumb}`,
      );
      if (res.ok) {
        for (const q of (await res.json())?.quoteResponse?.result || []) quoteInfo[q.symbol] = q;
      }
    } catch (e) {
      console.error('earnings quote batch failed', e.message);
    }
  }

  const earnings = [];
  await Promise.all(
    unique.map(async (sym) => {
      const q = quoteInfo[sym] || {};
      if (q.quoteType && q.quoteType !== 'EQUITY') return; // ETFs have no earnings
      let ts = Number(q.earningsTimestamp) || Number(q.earningsTimestampStart) || null;
      let epsEstimate = null;
      try {
        const res = await fetchWithCrumb(
          (crumb) =>
            `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=calendarEvents&crumb=${crumb}`,
        );
        if (res.ok) {
          const ev = (await res.json())?.quoteSummary?.result?.[0]?.calendarEvents?.earnings;
          const raw = Number(ev?.earningsDate?.[0]?.raw);
          if (raw && (!ts || ts < startOfToday)) ts = raw;
          const est = Number(ev?.earningsAverage?.raw);
          if (Number.isFinite(est) && ev?.earningsAverage) epsEstimate = Math.round(est * 100) / 100;
        }
      } catch {
        /* quote data alone is fine */
      }
      if (!ts || ts < startOfToday || ts > horizon) return;
      const mins = etHourMinute(ts);
      let hour;
      if (mins === 0) hour = undefined; // time not announced
      else if (mins < 9 * 60 + 30) hour = 'bmo';
      else if (mins >= 16 * 60) hour = 'amc';
      else hour = 'dmh';
      earnings.push({ symbol: sym, date: etDate(ts), hour, epsEstimate });
    }),
  );
  earnings.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.symbol.localeCompare(b.symbol)));
  return { body: { earnings } };
}

// ---------- News (real headlines with real links) ----------

function decodeEntities(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decodeEntities(m[1]) : '';
}

async function rssNews(symbol) {
  const res = await fetch(
    `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`,
    { headers: { ...UA, Accept: 'application/rss+xml,application/xml,text/xml' } },
  );
  if (!res.ok) return [];
  const xml = await res.text();
  const items = xml.split('<item>').slice(1).map((chunk) => chunk.split('</item>')[0]);
  return items.map((it) => ({
    title: tag(it, 'title'),
    summary: tag(it, 'description'),
    url: tag(it, 'link'),
    source: tag(it, 'source') || 'Yahoo Finance',
    time: Date.parse(tag(it, 'pubDate')) || null,
  }));
}

async function searchNews(symbol) {
  const res = await fetchWithRetry(
    `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=0&newsCount=10`,
  );
  if (!res.ok) return [];
  const news = (await res.json())?.news || [];
  return news
    .filter((n) => !n.relatedTickers || n.relatedTickers.map((t) => t.toUpperCase()).includes(symbol))
    .map((n) => ({
      title: n.title,
      summary: '',
      url: n.link,
      source: n.publisher || 'Yahoo Finance',
      time: n.providerPublishTime ? n.providerPublishTime * 1000 : null,
    }));
}

function fmtTime(ms) {
  if (!ms) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(ms));
}

export async function getNews({ symbols, perSymbol = 5 } = {}) {
  const list = [...new Set((symbols || []).map((s) => String(s).toUpperCase().trim()).filter(Boolean))].slice(0, 25);
  const results = await Promise.all(
    list.map(async (symbol) => {
      const [a, b] = await Promise.all([
        searchNews(symbol).catch(() => []),
        rssNews(symbol).catch(() => []),
      ]);
      const byTitle = new Map();
      for (const item of [...a, ...b]) {
        if (!item.title || !item.url || !/^https?:\/\//.test(item.url)) continue;
        const k = item.title.toLowerCase();
        const prev = byTitle.get(k);
        if (!prev) byTitle.set(k, item);
        else {
          if (!prev.summary && item.summary) prev.summary = item.summary;
          if (prev.source === 'Yahoo Finance' && item.source !== 'Yahoo Finance') prev.source = item.source;
        }
      }
      const articles = [...byTitle.values()]
        .sort((x, y) => (y.time || 0) - (x.time || 0))
        .slice(0, perSymbol)
        .map((n) => ({
          title: n.title,
          summary: n.summary.length > 320 ? `${n.summary.slice(0, 317)}...` : n.summary,
          source: n.source,
          url: n.url,
          timestamp: fmtTime(n.time),
        }));
      return { symbol, articles };
    }),
  );
  return { body: { news: results } };
}

// ---------- Daily snapshot ----------

export async function snapshotPrices(symbols) {
  const { prices } = await getQuotes(symbols);
  return prices;
}
