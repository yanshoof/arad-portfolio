import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, BarChart, Bar
} from "recharts";
import { TrendingUp, TrendingDown, Target, Award, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseISO, isValid, format, differenceInDays } from "date-fns";

function MetricCard({ label, value, sub, positive }) {
  return (
    <div className="bg-white border-4 border-gray-900 p-4 flex flex-col gap-1 min-w-[160px]">
      <div className="text-sm font-black text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-3xl font-black ${positive === true ? 'text-green-700' : positive === false ? 'text-red-700' : 'text-gray-900'}`}>{value}</div>
      {sub && <div className="text-sm font-bold text-gray-500">{sub}</div>}
    </div>
  );
}

function parseDateSafe(str) {
  if (!str) return null;
  const d = parseISO(str);
  return isValid(d) ? d : null;
}

export default function PortfolioAnalyticsPanel({ openPositions = [], closedPositions = [], currentPrices = {} }) {
  const [benchmarkData, setBenchmarkData] = useState([]);
  const [loadingBenchmark, setLoadingBenchmark] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchBenchmark = async () => {
    setLoadingBenchmark(true);
    try {
      const apiKey = null; // We'll use Finnhub via backend
      const { data } = await base44.functions.invoke('getBenchmarkData', {});
      if (data && data.candles) setBenchmarkData(data.candles);
    } catch (e) {
      // silently fail – benchmark is optional
    }
    setLoadingBenchmark(false);
    setFetched(true);
  };

  useEffect(() => {
    if (!fetched) fetchBenchmark();
  }, []);

  // ─── Derived Metrics ─────────────────────────────────────────────────────

  // Total invested (open)
  const totalInvested = openPositions.reduce((s, p) => s + p.purchase_price * p.quantity, 0);

  // Current value (open)
  const currentValue = openPositions.reduce((s, p) => {
    const price = currentPrices[p.symbol] || p.purchase_price;
    return s + price * p.quantity;
  }, 0);

  const openPnl = currentValue - totalInvested;
  const openRoi = totalInvested > 0 ? (openPnl / totalInvested) * 100 : 0;

  // Closed trades
  const closedTrades = closedPositions.map(p => ({
    symbol: p.symbol,
    pnl: (p.sell_price - p.purchase_price) * p.quantity,
    pct: p.purchase_price > 0 ? ((p.sell_price - p.purchase_price) / p.purchase_price) * 100 : 0,
    date: parseDateSafe(p.sell_date),
    cost: p.purchase_price * p.quantity,
  }));

  const wins = closedTrades.filter(t => t.pnl > 0).length;
  const losses = closedTrades.filter(t => t.pnl <= 0).length;
  const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;
  const realizedPnl = closedTrades.reduce((s, t) => s + t.pnl, 0);
  const totalRealizedCost = closedTrades.reduce((s, t) => s + t.cost, 0);
  const realizedRoi = totalRealizedCost > 0 ? (realizedPnl / totalRealizedCost) * 100 : 0;

  // ─── Cumulative P&L over time (closed trades) ─────────────────────────────
  const sortedClosed = [...closedTrades]
    .filter(t => t.date)
    .sort((a, b) => a.date - b.date);

  let cumPnl = 0;
  const pnlTimeline = sortedClosed.map(t => {
    cumPnl += t.pnl;
    return { date: format(t.date, "MM/dd/yy"), cumPnl: Math.round(cumPnl), pnl: Math.round(t.pnl) };
  });

  // ─── Monthly P&L bar chart ────────────────────────────────────────────────
  const monthlyMap = {};
  sortedClosed.forEach(t => {
    const key = format(t.date, "MMM yy");
    if (!monthlyMap[key]) monthlyMap[key] = 0;
    monthlyMap[key] += t.pnl;
  });
  const monthlyPnl = Object.entries(monthlyMap).map(([month, pnl]) => ({ month, pnl: Math.round(pnl) }));

  // ─── Win/Loss donut data ──────────────────────────────────────────────────
  const winLossData = [
    { name: "Wins", value: wins },
    { name: "Losses", value: losses },
  ];

  // ─── Benchmark overlay ───────────────────────────────────────────────────
  // Normalize benchmark to same start as our portfolio pnl timeline
  const combinedTimeline = pnlTimeline.map((pt, i) => {
    const bm = benchmarkData[i] || null;
    return { ...pt, benchmark: bm ? Math.round(bm.value) : undefined };
  });

  const hasClosedData = sortedClosed.length > 0;

  return (
    <div className="mt-10 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl md:text-4xl font-black text-gray-900 border-b-4 border-gray-900 pb-2">
          PORTFOLIO ANALYTICS
        </h2>
        <Button
          onClick={fetchBenchmark}
          disabled={loadingBenchmark}
          className="bg-gray-900 text-white font-black text-lg px-4 h-10 rounded-none border-2 border-gray-900"
        >
          <RefreshCw className={`w-5 h-5 ${loadingBenchmark ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="flex flex-wrap gap-4">
        <MetricCard
          label="Open Portfolio Value"
          value={`$${Math.round(currentValue).toLocaleString()}`}
          sub={`Invested: $${Math.round(totalInvested).toLocaleString()}`}
        />
        <MetricCard
          label="Open Unrealized P&L"
          value={`${openPnl >= 0 ? '+' : ''}$${Math.round(openPnl).toLocaleString()}`}
          sub={`ROI: ${openRoi.toFixed(2)}%`}
          positive={openPnl >= 0}
        />
        <MetricCard
          label="Realized P&L (Closed)"
          value={`${realizedPnl >= 0 ? '+' : ''}$${Math.round(realizedPnl).toLocaleString()}`}
          sub={`ROI: ${realizedRoi.toFixed(2)}%`}
          positive={realizedPnl >= 0}
        />
        <MetricCard
          label="Win Rate"
          value={`${winRate.toFixed(0)}%`}
          sub={`${wins}W / ${losses}L (${closedTrades.length} trades)`}
          positive={winRate >= 50 ? true : winRate > 0 ? false : undefined}
        />
      </div>

      {hasClosedData ? (
        <>
          {/* Cumulative P&L Chart */}
          <div className="bg-white border-4 border-gray-900 p-4">
            <h3 className="text-2xl font-black text-gray-900 mb-4">CUMULATIVE REALIZED P&L</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={combinedTimeline} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fontWeight: 700 }} />
                <YAxis tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`} tick={{ fontSize: 12, fontWeight: 700 }} />
                <Tooltip formatter={(v, name) => [`$${v?.toLocaleString()}`, name === 'cumPnl' ? 'Portfolio P&L' : 'S&P 500 (indexed)']} />
                <Legend formatter={v => v === 'cumPnl' ? 'Portfolio P&L' : 'S&P 500 (indexed)'} />
                <ReferenceLine y={0} stroke="#6b7280" strokeWidth={2} />
                <Line type="monotone" dataKey="cumPnl" stroke="#1d4ed8" strokeWidth={3} dot={false} name="cumPnl" />
                {combinedTimeline.some(d => d.benchmark !== undefined) && (
                  <Line type="monotone" dataKey="benchmark" stroke="#d97706" strokeWidth={2} dot={false} strokeDasharray="5 5" name="benchmark" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly P&L Bar Chart */}
          <div className="bg-white border-4 border-gray-900 p-4">
            <h3 className="text-2xl font-black text-gray-900 mb-4">MONTHLY REALIZED P&L</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyPnl} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fontWeight: 700 }} />
                <YAxis tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`} tick={{ fontSize: 12, fontWeight: 700 }} />
                <Tooltip formatter={(v) => [`$${v?.toLocaleString()}`, 'P&L']} />
                <ReferenceLine y={0} stroke="#6b7280" strokeWidth={2} />
                <Bar dataKey="pnl" fill="#1d4ed8"
                  label={false}
                  radius={[2, 2, 0, 0]}
                  // color by value
                  isAnimationActive={true}
                  // per-bar color
                  // Recharts doesn't support per-bar color directly in <Bar> without Cell
                  // Using a custom fill function:
                  // We'll use a single color and rely on the positive/negative axis
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div className="bg-gray-100 border-4 border-gray-300 p-8 text-center">
          <div className="text-2xl font-black text-gray-500">NO CLOSED TRADES YET — CHARTS WILL APPEAR AFTER FIRST SALE</div>
        </div>
      )}
    </div>
  );
}