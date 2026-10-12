// Saves each tracked symbol's closing price once per trading day.
// Runs Mon–Fri at 21:15 UTC = 5:15 PM EDT / 4:15 PM EST (after the close).

import { listRows, upsertRows } from '../lib/store.mjs';
import { snapshotPrices } from '../lib/market.mjs';

export default async () => {
  const [open, watch] = await Promise.all([listRows('OpenPosition'), listRows('WatchListItem')]);
  const symbols = [...new Set([...open, ...watch].map((r) => r.symbol).filter(Boolean))];
  if (!symbols.length) {
    console.log('Daily snapshot: no symbols');
    return;
  }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
  const prices = await snapshotPrices(symbols);
  const rows = Object.entries(prices).map(([symbol, close_price]) => ({ symbol, close_price, snapshot_date: today }));
  const saved = await upsertRows('DailyStockSnapshot', rows, (r) => `${r.symbol}|${r.snapshot_date}`);
  console.log(`Daily snapshot ${today}: ${saved}/${symbols.length} saved`);
};

export const config = { schedule: '15 21 * * 1-5' };
