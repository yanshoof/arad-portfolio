import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingDown, TrendingUp, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, subMonths, startOfYear } from "date-fns";

const DATE_FILTERS = [
  { label: "All Time", value: "all" },
  { label: "Last Month", value: "1m" },
  { label: "Last 3 Months", value: "3m" },
  { label: "Last 6 Months", value: "6m" },
  { label: "Year to Date", value: "ytd" },
];

export default function WhatIfHeld({ positions, fontSize = 20 }) {
  const [currentPrices, setCurrentPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState("1m");
  const [sortKey, setSortKey] = useState("sellDate");
  const [sortDir, setSortDir] = useState("desc");

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const fetchPrices = async (symbols) => {
    if (!symbols.length) return;
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke("getCurrentPrices", { symbols });
      if (data?.prices) setCurrentPrices(data.prices);
    } catch (e) {
      console.error("Error fetching prices:", e);
    }
    setLoading(false);
  };

  const getDateCutoff = () => {
    const now = new Date();
    switch (dateRange) {
      case "1m": return subMonths(now, 1);
      case "3m": return subMonths(now, 3);
      case "6m": return subMonths(now, 6);
      case "ytd": return startOfYear(now);
      default: return null;
    }
  };

  const filteredPositions = useMemo(() => {
    const cutoff = getDateCutoff();
    if (!cutoff) return positions;
    return positions.filter(p => parseISO(p.sell_date) >= cutoff);
  }, [positions, dateRange]);

  useEffect(() => {
    const symbols = [...new Set(filteredPositions.map(p => p.symbol))];
    fetchPrices(symbols);
  }, [filteredPositions]);

  const rows = useMemo(() => {
    const bySymbol = {};
    filteredPositions.forEach(p => {
      if (!bySymbol[p.symbol]) {
        bySymbol[p.symbol] = { symbol: p.symbol, totalQty: 0, totalCost: 0, totalSaleValue: 0, latestSellDate: p.sell_date };
      }
      bySymbol[p.symbol].totalQty += p.quantity;
      bySymbol[p.symbol].totalCost += p.purchase_price * p.quantity;
      bySymbol[p.symbol].totalSaleValue += p.sell_price * p.quantity;
      if (p.sell_date > bySymbol[p.symbol].latestSellDate) bySymbol[p.symbol].latestSellDate = p.sell_date;
    });

    return Object.values(bySymbol).map(row => {
      const avgSellPrice = row.totalSaleValue / row.totalQty;
      const currentPrice = currentPrices[row.symbol];
      const currentValue = currentPrice ? currentPrice * row.totalQty : null;
      const actualPL = row.totalSaleValue - row.totalCost;
      const ifHeldPL = currentValue !== null ? currentValue - row.totalCost : null;
      const difference = ifHeldPL !== null ? ifHeldPL - actualPL : null;
      const smartSell = difference !== null ? difference <= 0 : null;

      return {
        symbol: row.symbol,
        totalQty: row.totalQty,
        avgSellPrice,
        sellDate: row.latestSellDate,
        currentPrice,
        actualPL,
        ifHeldPL,
        difference,
        smartSell,
      };
    });
  }, [filteredPositions, currentPrices]);

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      // nulls last
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "string") return av.localeCompare(bv);
      return av - bv;
    });
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [rows, sortKey, sortDir]);

  const totals = useMemo(() => {
    const totalActualPL = rows.reduce((s, r) => s + r.actualPL, 0);
    const totalIfHeldPL = rows.filter(r => r.ifHeldPL !== null).reduce((s, r) => s + r.ifHeldPL, 0);
    const totalDiff = totalIfHeldPL - totalActualPL;
    return { totalActualPL, totalIfHeldPL, totalDiff };
  }, [rows]);

  const fs = Math.max(fontSize, 22);
  const btnFs = Math.max(fontSize, 22);

  return (
    <div className="space-y-6">
      {/* Date filter */}
      <div className="flex flex-wrap gap-3 items-center">
        {DATE_FILTERS.map(f => (
          <Button key={f.value} onClick={() => setDateRange(f.value)}
            className={`font-black rounded-none border-4 ${dateRange === f.value ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-900 border-gray-300 hover:bg-gray-100"}`}
            style={{ fontSize: `${btnFs}px`, height: `${btnFs * 2.6}px`, paddingLeft: `${btnFs * 0.9}px`, paddingRight: `${btnFs * 0.9}px` }}>
            {f.label}
          </Button>
        ))}
        <Button onClick={() => { const symbols = [...new Set(filteredPositions.map(p => p.symbol))]; fetchPrices(symbols); }}
          className="bg-gray-900 text-white hover:bg-gray-700 font-black rounded-none border-4 border-gray-900 ml-auto"
          style={{ fontSize: `${btnFs}px`, height: `${btnFs * 2.6}px`, paddingLeft: `${btnFs * 0.9}px`, paddingRight: `${btnFs * 0.9}px` }}>
          <RefreshCw className={`w-6 h-6 mr-2 ${loading ? "animate-spin" : ""}`} />
          REFRESH
        </Button>
      </div>

      {/* Big verdict banner — the single source of truth */}
      {rows.length > 0 && (
        <div className={`border-8 p-6 flex items-center gap-6 ${totals.totalDiff <= 0 ? "border-green-700 bg-green-50" : "border-red-700 bg-red-50"}`}>
          {totals.totalDiff <= 0
            ? <TrendingDown className="w-20 h-20 text-green-700 flex-shrink-0" />
            : <TrendingUp className="w-20 h-20 text-red-700 flex-shrink-0" />}
          <div className="flex-1">
            <div className={`font-black ${totals.totalDiff <= 0 ? "text-green-700" : "text-red-700"}`} style={{ fontSize: `${fs * 1.6}px`, lineHeight: 1.1 }}>
              {totals.totalDiff <= 0
                ? `✅ SMART — Saved $${Math.round(-totals.totalDiff).toLocaleString()}`
                : `😬 Left $${Math.round(totals.totalDiff).toLocaleString()} on the table`}
            </div>
            <div className="font-bold text-gray-700 mt-2" style={{ fontSize: `${fs * 0.95}px` }}>
              Actual: <span className={totals.totalActualPL >= 0 ? "text-green-700" : "text-red-700"}>${Math.round(totals.totalActualPL).toLocaleString()}</span>
              {" → "}If Held: <span className={totals.totalIfHeldPL >= 0 ? "text-green-700" : "text-red-700"}>${Math.round(totals.totalIfHeldPL).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE consolidated table */}
      <div className="border-4 border-gray-900 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100 border-b-4 border-gray-900 hover:bg-gray-100">
              {[
                { label: "SYMBOL", key: "symbol" },
                { label: "LAST SOLD", key: "sellDate" },
                { label: "AVG SOLD @", key: "avgSellPrice" },
                { label: "NOW @", key: "currentPrice" },
                { label: "ACTUAL P&L", key: "actualPL" },
                { label: "IF HELD P&L", key: "ifHeldPL" },
                { label: "DIFFERENCE", key: "difference" },
              ].map(h => {
                const active = sortKey === h.key;
                const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <TableHead key={h.key} className="font-black text-gray-900 border-r-2 border-gray-300 whitespace-nowrap text-center cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort(h.key)}
                    style={{ fontSize: `${fs}px`, padding: `${fs * 0.4}px ${fs * 0.5}px` }}>
                    <div className="flex items-center justify-center gap-2">
                      {h.label}
                      <Icon className={`${active ? "text-gray-900" : "text-gray-400"}`} style={{ width: `${fs * 0.8}px`, height: `${fs * 0.8}px` }} />
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center font-black text-gray-500" style={{ fontSize: `${fs}px`, padding: `${fs * 2}px` }}>NO CLOSED POSITIONS IN THIS DATE RANGE</TableCell></TableRow>
            ) : sortedRows.map(row => (
              <TableRow key={row.symbol} className="border-b-2 border-gray-300 hover:bg-gray-50">
                <TableCell className="font-black text-gray-900 border-r-2 border-gray-300" style={{ fontSize: `${fs}px`, padding: `${fs * 0.35}px ${fs * 0.5}px` }}>{row.symbol}</TableCell>
                <TableCell className="font-bold text-gray-900 border-r-2 border-gray-300 text-center" style={{ fontSize: `${fs}px`, padding: `${fs * 0.35}px ${fs * 0.5}px` }}>{format(parseISO(row.sellDate), "dd/MM/yy")}</TableCell>
                <TableCell className="font-bold text-gray-900 border-r-2 border-gray-300 text-center" style={{ fontSize: `${fs}px`, padding: `${fs * 0.35}px ${fs * 0.5}px` }}>${row.avgSellPrice.toFixed(2)}</TableCell>
                <TableCell className="font-bold text-gray-900 border-r-2 border-gray-300 text-center bg-gray-50" style={{ fontSize: `${fs}px`, padding: `${fs * 0.35}px ${fs * 0.5}px` }}>
                  {row.currentPrice ? `$${row.currentPrice.toFixed(2)}` : <span className="text-gray-400">—</span>}
                </TableCell>
                <TableCell className={`font-black border-r-2 border-gray-300 text-center ${row.actualPL >= 0 ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"}`} style={{ fontSize: `${fs}px`, padding: `${fs * 0.35}px ${fs * 0.5}px` }}>
                  {row.actualPL >= 0 ? "+" : ""}${Math.round(row.actualPL).toLocaleString()}
                </TableCell>
                <TableCell className={`font-black border-r-2 border-gray-300 text-center ${row.ifHeldPL === null ? "text-gray-400" : row.ifHeldPL >= 0 ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"}`} style={{ fontSize: `${fs}px`, padding: `${fs * 0.35}px ${fs * 0.5}px` }}>
                  {row.ifHeldPL === null ? "—" : `${row.ifHeldPL >= 0 ? "+" : ""}$${Math.round(row.ifHeldPL).toLocaleString()}`}
                </TableCell>
                <TableCell className={`font-black text-center ${row.difference === null ? "text-gray-400" : row.difference <= 0 ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100"}`} style={{ fontSize: `${fs}px`, padding: `${fs * 0.35}px ${fs * 0.5}px` }}>
                  {row.difference === null ? "—" : row.difference <= 0
                    ? `✅ +$${Math.round(-row.difference).toLocaleString()}`
                    : `😬 -$${Math.round(row.difference).toLocaleString()}`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}