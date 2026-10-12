import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import OpenPositionSummaryCard from "./OpenPositionSummaryCard";

export default function SnapshotTable({ snapshot, fontSize = 20, onDelete }) {
  const [currentPrices, setCurrentPrices] = useState({});
  const [dailyPrices, setDailyPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState("symbol");
  const [sortDir, setSortDir] = useState("asc");

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const symbols = [...new Set(snapshot.positions.map((p) => p.symbol))];

  const fetchPrices = async () => {
    if (symbols.length === 0) return;
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke("getCurrentPrices", { symbols });
      if (data?.prices) setCurrentPrices(data.prices);
      if (data?.prevCloses) setDailyPrices(data.prevCloses);
    } catch (e) {
      console.error("Error fetching snapshot prices:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPrices();
  }, [snapshot.id]);

  const getCurrentPrice = (symbol) => {
    const p = currentPrices[symbol];
    if (p && typeof p === "number" && p > 0) return p;
    const pos = snapshot.positions.find((x) => x.symbol === symbol);
    return pos ? Number(pos.avg_purchase_price) : 0;
  };

  // Summary
  let totalPurchase = 0, totalCurrent = 0, totalYesterday = 0;
  snapshot.positions.forEach((g) => {
    const cur = getCurrentPrice(g.symbol);
    const yest = dailyPrices[g.symbol];
    totalPurchase += g.avg_purchase_price * g.quantity;
    totalCurrent += cur * g.quantity;
    totalYesterday += (yest && yest > 0 ? yest : g.avg_purchase_price) * g.quantity;
  });
  const totalPL = totalCurrent - totalPurchase;
  const percentPL = totalPurchase > 0 ? (totalPL / totalPurchase) * 100 : 0;
  const dailyPL = totalCurrent - totalYesterday;
  const dailyPercentPL = totalYesterday > 0 ? (dailyPL / totalYesterday) * 100 : 0;

  const dateLabel = snapshot.label || new Date(snapshot.snapshot_date).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3 border-l-8 border-purple-700 pl-4">
        <div className="text-2xl md:text-3xl font-black text-gray-900">
          📸 SNAPSHOT — {dateLabel}
          <span className="text-base font-bold text-gray-500 ml-3">(captured {new Date(snapshot.snapshot_date).toLocaleDateString()})</span>
        </div>
        <div className="flex gap-10">
          <Button onClick={fetchPrices} disabled={loading} className="bg-green-600 text-white hover:bg-green-700 text-3xl font-black h-24 px-12 rounded-none border-4 border-green-800 shadow-2xl">
            <RefreshCw className={`w-10 h-10 mr-3 ${loading ? "animate-spin" : ""}`} />
            REFRESH
          </Button>
          <Button onClick={() => onDelete(snapshot.id)} className="bg-red-600 hover:bg-red-700 text-white text-3xl font-black h-24 px-12 rounded-none border-4 border-red-800 shadow-2xl">
            <Trash2 className="w-10 h-10 mr-3" />
            DELETE
          </Button>
        </div>
      </div>

      <OpenPositionSummaryCard
        totalCurrent={totalCurrent}
        totalPL={totalPL}
        percentPL={percentPL}
        dailyPL={dailyPL}
        dailyPercentPL={dailyPercentPL}
      />

      <Card className="bg-white border-4 border-gray-900 rounded-none shadow-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-4 border-gray-900 hover:bg-transparent bg-gray-100">
                  {[
                    { label: "Symbol", key: "symbol" },
                    { label: "Price Now", key: "currentPrice" },
                    { label: "Daily P&L", key: "dailyPL" },
                    { label: "Total P&L", key: "totalPL" },
                    { label: "Daily %", key: "dailyPct" },
                    { label: "Total %", key: "totalPct" },
                  ].map((h) => {
                    const active = sortKey === h.key;
                    const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                    return (
                      <TableHead key={h.key} onClick={() => handleSort(h.key)} className="text-gray-900 font-black border-r-2 border-gray-300 whitespace-nowrap px-3 cursor-pointer hover:bg-gray-200" style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                        <div className="flex items-center justify-center gap-2">
                          {h.label}
                          <Icon className={active ? "text-gray-900" : "text-gray-400"} style={{ width: `${fontSize * 0.8}px`, height: `${fontSize * 0.8}px` }} />
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...snapshot.positions].map((g) => {
                  const cur = getCurrentPrice(g.symbol);
                  const cTotal = cur * g.quantity;
                  const pTotal = g.avg_purchase_price * g.quantity;
                  const tPL_ = cTotal - pTotal;
                  const tPct_ = pTotal !== 0 ? (tPL_ / pTotal) * 100 : 0;
                  const yest_ = dailyPrices[g.symbol];
                  let dPL_ = 0, dPct_ = 0;
                  if (yest_ && yest_ > 0) {
                    const baseT = yest_ * g.quantity;
                    dPL_ = cTotal - baseT;
                    dPct_ = baseT !== 0 ? (dPL_ / baseT) * 100 : 0;
                  }
                  return { g, sortVals: { symbol: g.symbol, currentPrice: cur, dailyPL: dPL_, totalPL: tPL_, dailyPct: dPct_, totalPct: tPct_ } };
                }).sort((a, b) => {
                  const av = a.sortVals[sortKey];
                  const bv = b.sortVals[sortKey];
                  let cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
                  return sortDir === "asc" ? cmp : -cmp;
                }).map(({ g }) => {
                  const currentPrice = getCurrentPrice(g.symbol);
                  const currentTotal = currentPrice * g.quantity;
                  const purchaseTotal = g.avg_purchase_price * g.quantity;
                  const tPL = currentTotal - purchaseTotal;
                  const pPL = purchaseTotal !== 0 ? (tPL / purchaseTotal) * 100 : 0;
                  const isTotalProfit = tPL >= 0;

                  const yest = dailyPrices[g.symbol];
                  const hasDaily = yest && typeof yest === "number" && yest > 0;
                  let dPL = 0, dPct = 0, isDailyProfit = true;
                  if (hasDaily) {
                    const baseTotal = yest * g.quantity;
                    dPL = currentTotal - baseTotal;
                    dPct = baseTotal !== 0 ? (dPL / baseTotal) * 100 : 0;
                    isDailyProfit = dPL >= 0;
                  }

                  return (
                    <TableRow key={g.symbol} className="border-b-2 border-gray-300 hover:bg-gray-50">
                      <TableCell className="font-black text-gray-900 border-r-2 border-gray-300 px-3" style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>{g.symbol}</TableCell>
                      <TableCell className="text-gray-900 bg-gray-100 font-bold border-r-2 border-gray-300 text-center px-3" style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                        {loading ? <span className="text-gray-500">...</span> : `$${currentPrice.toFixed(2)}`}
                      </TableCell>
                      <TableCell className={`font-bold border-r-2 border-gray-300 text-center px-3 ${isDailyProfit ? "text-green-700" : "text-red-700"}`} style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                        {isDailyProfit ? "+" : ""}${Math.round(dPL)}
                      </TableCell>
                      <TableCell className={`font-black border-r-2 border-gray-300 text-center px-3 ${isTotalProfit ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"}`} style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                        {isTotalProfit ? "+" : ""}${Math.round(tPL)}
                      </TableCell>
                      <TableCell className={`font-bold border-r-2 border-gray-300 text-center px-3 ${isDailyProfit ? "text-green-700" : "text-red-700"}`} style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                        {isDailyProfit ? "+" : ""}{dPct.toFixed(2)}%
                      </TableCell>
                      <TableCell className={`font-black text-center px-3 ${isTotalProfit ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"}`} style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                        {isTotalProfit ? "+" : ""}{pPL.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}