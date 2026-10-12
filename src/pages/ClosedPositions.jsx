import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, RefreshCw, Lock, Unlock, TrendingUp } from "lucide-react";
import { format, subMonths, startOfYear, parseISO } from "date-fns";
import SummaryCard from "../components/positions/SummaryCard";
import MonthlyStats from "../components/positions/MonthlyStats";
import SortableTableHead from "../components/positions/SortableTableHead";
import FontSizeSlider from "../components/positions/FontSizeSlider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
const COLORS = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];

const COLUMN_DEFINITIONS = [
  { id: 'symbol', label: 'Symbol' },
  { id: 'purchase_price', label: 'Purchase Price' },
  { id: 'purchase_date', label: 'Purchase Date' },
  { id: 'quantity', label: 'Quantity' },
  { id: 'sell_price', label: 'Sell Price' },
  { id: 'sell_date', label: 'Sell Date' },
  { id: 'total_pl', label: 'Total P&L' },
  { id: 'percent_pl', label: '% P&L' },
];

export default function ClosedPositions() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("trades");
  const [sortConfig, setSortConfig] = useState({ key: 'sell_date', direction: 'desc' });
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('closedPositionsFontSize');
    return saved ? parseInt(saved, 10) : 20;
  });
  const [visibleColumns] = useState(
    COLUMN_DEFINITIONS.reduce((acc, col) => ({ ...acc, [col.id]: true }), {})
  );
  const [dateRange, setDateRange] = useState('all');
  const [currentPrices, setCurrentPrices] = useState({});
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);

  const { data: positions = [], refetch } = useQuery({
    queryKey: ['closedPositions'],
    queryFn: () => base44.entities.ClosedPosition.list('-sell_date'),
  });

  const { data: openPositions = [] } = useQuery({
    queryKey: ['openPositions'],
    queryFn: () => base44.entities.OpenPosition.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClosedPosition.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['closedPositions'] }),
  });

  useEffect(() => {
    localStorage.setItem('closedPositionsFontSize', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    if (openPositions.length > 0) fetchCurrentPrices();
  }, [openPositions]);

  const fetchCurrentPrices = async () => {
    setIsFetchingPrices(true);
    const symbols = [...new Set(openPositions.map(p => p.symbol))];
    try {
      const { data } = await base44.functions.invoke('getCurrentPrices', { symbols });
      if (data?.prices) setCurrentPrices(data.prices);
    } catch (e) {
      console.error("Error fetching prices:", e);
    }
    setIsFetchingPrices(false);
  };

  const getCurrentPrice = (position) => {
    const price = currentPrices[position.symbol];
    return (price && price > 0) ? price : Number(position.purchase_price) || 0;
  };

  // --- Date filter for stats tab ---
  const getDateRangeFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case '1m': return subMonths(now, 1);
      case '3m': return subMonths(now, 3);
      case '6m': return subMonths(now, 6);
      case 'ytd': return startOfYear(now);
      default: return null;
    }
  };

  const filteredForStats = useMemo(() => {
    const filterDate = getDateRangeFilter();
    if (!filterDate) return positions;
    return positions.filter(pos => parseISO(pos.sell_date) >= filterDate);
  }, [positions, dateRange]);

  const metrics = useMemo(() => {
    if (filteredForStats.length === 0) return { totalTrades: 0, winningTrades: 0, losingTrades: 0, winRate: 0, totalPL: 0, averagePL: 0, largestWin: 0, largestLoss: 0, maxDrawdown: 0 };
    let totalPL = 0, winningTrades = 0, losingTrades = 0, largestWin = 0, largestLoss = 0;
    filteredForStats.forEach(pos => {
      const pl = (pos.sell_price - pos.purchase_price) * pos.quantity;
      totalPL += pl;
      if (pl > 0) { winningTrades++; largestWin = Math.max(largestWin, pl); }
      else if (pl < 0) { losingTrades++; largestLoss = Math.min(largestLoss, pl); }
    });
    const sorted = [...filteredForStats].sort((a, b) => new Date(a.sell_date) - new Date(b.sell_date));
    let running = 0, peak = 0, maxDrawdown = 0;
    sorted.forEach(pos => {
      running += (pos.sell_price - pos.purchase_price) * pos.quantity;
      peak = Math.max(peak, running);
      maxDrawdown = Math.max(maxDrawdown, peak - running);
    });
    return { totalTrades: filteredForStats.length, winningTrades, losingTrades, winRate: (winningTrades / filteredForStats.length) * 100, totalPL, averagePL: totalPL / filteredForStats.length, largestWin, largestLoss, maxDrawdown };
  }, [filteredForStats]);

  const chartData = useMemo(() => {
    if (filteredForStats.length === 0) return [];
    const sorted = [...filteredForStats].sort((a, b) => new Date(a.sell_date) - new Date(b.sell_date));
    const byDate = {};
    let cumulative = 0;
    sorted.forEach(pos => {
      const date = format(parseISO(pos.sell_date), 'yyyy-MM-dd');
      const pl = (pos.sell_price - pos.purchase_price) * pos.quantity;
      cumulative += pl;
      if (!byDate[date]) byDate[date] = { date, dailyPL: 0, cumulativePL: 0 };
      byDate[date].dailyPL += pl;
      byDate[date].cumulativePL = cumulative;
    });
    return Object.values(byDate).map(d => ({ ...d, displayDate: format(parseISO(d.date), 'MMM dd') }));
  }, [filteredForStats]);

  const calculateClosedSummary = () => {
    let totalPurchase = 0, totalSale = 0;
    filteredForStats.forEach(p => { totalPurchase += p.purchase_price * p.quantity; totalSale += p.sell_price * p.quantity; });
    const totalPL = totalSale - totalPurchase;
    return { totalPurchase, totalSale, totalPL, percentPL: totalPurchase > 0 ? totalPL / totalPurchase * 100 : 0 };
  };

  const calculateOpenSummary = () => {
    let totalPurchase = 0, totalCurrent = 0;
    openPositions.forEach(p => { totalPurchase += p.purchase_price * p.quantity; totalCurrent += getCurrentPrice(p) * p.quantity; });
    const totalPL = totalCurrent - totalPurchase;
    return { totalPurchase, totalSale: totalCurrent, totalPL, percentPL: totalPurchase > 0 ? totalPL / totalPurchase * 100 : 0 };
  };

  const getPortfolioComposition = () => {
    const comp = {};
    let totalValue = 0;
    openPositions.forEach(p => {
      const val = getCurrentPrice(p) * p.quantity;
      comp[p.symbol] = (comp[p.symbol] || 0) + val;
      totalValue += val;
    });
    return Object.entries(comp).map(([name, value]) => ({ name, value, percentage: totalValue > 0 ? value / totalValue * 100 : 0 })).sort((a, b) => b.value - a.value);
  };

  // --- Table sort ---
  const handleSort = (key) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const sortedPositions = useMemo(() => {
    const sorted = [...positions];
    sorted.sort((a, b) => {
      let aVal, bVal;
      switch (sortConfig.key) {
        case 'symbol': aVal = a.symbol; bVal = b.symbol; break;
        case 'purchase_date': aVal = new Date(a.purchase_date); bVal = new Date(b.purchase_date); break;
        case 'sell_date': aVal = new Date(a.sell_date); bVal = new Date(b.sell_date); break;
        case 'total_pl': aVal = (a.sell_price - a.purchase_price) * a.quantity; bVal = (b.sell_price - b.purchase_price) * b.quantity; break;
        case 'percent_pl': aVal = (a.sell_price - a.purchase_price) / a.purchase_price; bVal = (b.sell_price - b.purchase_price) / b.purchase_price; break;
        default: aVal = a[sortConfig.key]; bVal = b[sortConfig.key];
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [positions, sortConfig]);

  const closedSummary = calculateClosedSummary();
  const openSummary = calculateOpenSummary();
  const compositionData = getPortfolioComposition();

  const CustomBarLabel = ({ x, y, width, value, name }) => (
    <g>
      <text x={x + width / 2} y={y - 45} fill="#1f2937" textAnchor="middle" style={{ fontSize: `${fontSize}px` }} className="font-black">{name}</text>
      <text x={x + width / 2} y={y - 10} fill="#1f2937" textAnchor="middle" style={{ fontSize: `${fontSize}px` }} className="font-black">{value?.toFixed(1)}%</text>
    </g>
  );

  return (
    <div className="p-4 md:p-8 bg-white min-h-screen">
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {[
          { key: 'trades', label: 'CLOSED TRADES' },
          { key: 'stats', label: 'STATS & CHARTS' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-8 text-2xl font-black h-14 border-4 transition-all ${
              activeTab === tab.key
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="ml-auto">
          <FontSizeSlider value={fontSize} onChange={setFontSize} />
        </div>
      </div>

      {/* ===== TRADES TAB ===== */}
      {activeTab === 'trades' && (
        <div className="space-y-10">
          <SummaryCard {...{ totalPurchase: positions.reduce((s, p) => s + p.purchase_price * p.quantity, 0), totalSale: positions.reduce((s, p) => s + p.sell_price * p.quantity, 0), totalPL: positions.reduce((s, p) => s + (p.sell_price - p.purchase_price) * p.quantity, 0), percentPL: (() => { const tp = positions.reduce((s,p)=>s+p.purchase_price*p.quantity,0); const ts = positions.reduce((s,p)=>s+p.sell_price*p.quantity,0); return tp > 0 ? (ts-tp)/tp*100 : 0; })() }} />
          <MonthlyStats positions={positions} />
          <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl overflow-hidden w-fit">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="w-auto">
                  <TableHeader>
                    <TableRow className="border-b-4 border-gray-900 hover:bg-transparent bg-gray-100">
                      {visibleColumns.symbol && <SortableTableHead label="Symbol" sortKey="symbol" currentSort={sortConfig} onSort={handleSort} fontSize={fontSize} />}
                      {visibleColumns.purchase_price && (
                        <TableHead className="text-gray-900 font-black border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px`, padding: `${fontSize * 0.2}px ${fontSize * 0.3}px` }}>
                          <div className="flex flex-col gap-1"><span>Purchase</span><span>Price</span></div>
                        </TableHead>
                      )}
                      {visibleColumns.purchase_date && <SortableTableHead label="Purchase Date" sortKey="purchase_date" currentSort={sortConfig} onSort={handleSort} fontSize={fontSize} />}
                      {visibleColumns.quantity && <TableHead className="text-gray-900 font-black border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px`, padding: `${fontSize * 0.2}px ${fontSize * 0.3}px` }}>Quantity</TableHead>}
                      {visibleColumns.sell_price && (
                        <TableHead className="text-gray-900 font-black border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px`, padding: `${fontSize * 0.2}px ${fontSize * 0.3}px` }}>
                          <div className="flex flex-col gap-1"><span>Sell</span><span>Price</span></div>
                        </TableHead>
                      )}
                      {visibleColumns.sell_date && <SortableTableHead label="Sell Date" sortKey="sell_date" currentSort={sortConfig} onSort={handleSort} fontSize={fontSize} />}
                      {visibleColumns.total_pl && <SortableTableHead label="Total P&L" sortKey="total_pl" currentSort={sortConfig} onSort={handleSort} fontSize={fontSize} />}
                      {visibleColumns.percent_pl && <SortableTableHead label="% P&L" sortKey="percent_pl" currentSort={sortConfig} onSort={handleSort} fontSize={fontSize} />}
                      <TableHead className="text-gray-900 font-black" style={{ fontSize: `${fontSize}px`, padding: `${fontSize * 0.2}px ${fontSize * 0.3}px` }}></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPositions.map((position) => {
                      const purchaseSum = position.purchase_price * position.quantity;
                      const sellSum = position.sell_price * position.quantity;
                      const totalPL = sellSum - purchaseSum;
                      const percentPL = (totalPL / purchaseSum) * 100;
                      const isProfit = totalPL >= 0;
                      return (
                        <TableRow key={position.id} className="border-b-2 border-gray-300 hover:bg-gray-50">
                          {visibleColumns.symbol && <TableCell className="font-black text-gray-900 border-r-2 border-gray-300 text-left whitespace-nowrap" style={{ fontSize: `${fontSize}px`, padding: `${fontSize * 0.15}px ${fontSize * 0.3}px` }}>{position.symbol}</TableCell>}
                          {visibleColumns.purchase_price && <TableCell className="text-gray-900 font-bold border-r-2 border-gray-300 text-center whitespace-nowrap" style={{ fontSize: `${fontSize}px`, padding: `${fontSize * 0.15}px ${fontSize * 0.3}px` }}>${position.purchase_price.toFixed(2)}</TableCell>}
                          {visibleColumns.purchase_date && <TableCell className="text-gray-900 font-bold border-r-2 border-gray-300 text-center whitespace-nowrap" style={{ fontSize: `${fontSize}px`, padding: `${fontSize * 0.15}px ${fontSize * 0.3}px` }}>{format(new Date(position.purchase_date), "dd/MM/yy")}</TableCell>}
                          {visibleColumns.quantity && <TableCell className="text-gray-900 font-bold border-r-2 border-gray-300 text-center whitespace-nowrap" style={{ fontSize: `${fontSize}px`, padding: `${fontSize * 0.15}px ${fontSize * 0.3}px` }}>{Math.round(position.quantity)}</TableCell>}
                          {visibleColumns.sell_price && <TableCell className="text-gray-900 font-bold border-r-2 border-gray-300 text-center whitespace-nowrap" style={{ fontSize: `${fontSize}px`, padding: `${fontSize * 0.15}px ${fontSize * 0.3}px` }}>${position.sell_price.toFixed(2)}</TableCell>}
                          {visibleColumns.sell_date && <TableCell className="text-gray-900 font-bold border-r-2 border-gray-300 text-center whitespace-nowrap" style={{ fontSize: `${fontSize}px`, padding: `${fontSize * 0.15}px ${fontSize * 0.3}px` }}>{format(new Date(position.sell_date), "dd/MM/yy")}</TableCell>}
                          {visibleColumns.total_pl && <TableCell className={`font-black border-r-2 border-gray-300 text-center whitespace-nowrap ${isProfit ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`} style={{ fontSize: `${fontSize}px`, padding: `${fontSize * 0.15}px ${fontSize * 0.3}px` }}>{isProfit ? '+' : ''}${Math.round(totalPL)}</TableCell>}
                          {visibleColumns.percent_pl && <TableCell className={`font-black border-r-2 border-gray-300 text-center whitespace-nowrap ${isProfit ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`} style={{ fontSize: `${fontSize}px`, padding: `${fontSize * 0.15}px ${fontSize * 0.3}px` }}>{isProfit ? '+' : ''}{percentPL.toFixed(2)}%</TableCell>}
                          <TableCell className="text-center" style={{ padding: `${fontSize * 0.15}px ${fontSize * 0.3}px` }}>
                            <Button variant="ghost" size="lg" onClick={() => deleteMutation.mutate(position.id)} className="hover:bg-red-100 text-red-700 hover:text-red-900 border-4 border-red-700 rounded-none" style={{ height: `${fontSize * 2.4}px`, width: `${fontSize * 2.4}px` }}>
                              <Trash2 style={{ width: `${fontSize * 1.2}px`, height: `${fontSize * 1.2}px` }} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {positions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-gray-700 font-bold py-16" style={{ fontSize: `${fontSize + 4}px` }}>
                          No closed positions yet. Add your first trade in the Add Position tab.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== STATS TAB ===== */}
      {activeTab === 'stats' && (
        <div>
          {isFetchingPrices && (
            <Alert className="mb-6 bg-gray-100 border-4 border-gray-600 rounded-none">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-900" />
              <AlertDescription className="text-xl font-bold text-gray-900">Fetching current prices...</AlertDescription>
            </Alert>
          )}

          {/* Date filter */}
          <Card className="bg-gray-100 border-4 border-gray-900 rounded-none mb-6">
            <CardHeader><CardTitle className="text-3xl font-black text-gray-900">FILTER CLOSED POSITIONS</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {[{ label: 'All Time', value: 'all' }, { label: 'Last Month', value: '1m' }, { label: 'Last 3 Months', value: '3m' }, { label: 'Last 6 Months', value: '6m' }, { label: 'Year to Date', value: 'ytd' }].map(range => (
                  <Button key={range.value} onClick={() => setDateRange(range.value)}
                    className={`text-2xl font-black h-16 px-8 rounded-none border-4 ${dateRange === range.value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100'}`}>
                    {range.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Summaries */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl">
              <CardHeader className="bg-purple-50 border-b-4 border-gray-900 p-6">
                <CardTitle className="flex items-center gap-4 text-gray-900 text-3xl font-black"><Lock className="w-10 h-10 text-purple-600" />CLOSED POSITIONS SUMMARY</CardTitle>
              </CardHeader>
              <CardContent className="p-6"><SummaryCard {...closedSummary} compact={true} /></CardContent>
            </Card>
            <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl">
              <CardHeader className="bg-green-50 border-b-4 border-gray-900 p-6">
                <CardTitle className="flex items-center gap-4 text-gray-900 text-3xl font-black"><Unlock className="w-10 h-10 text-green-600" />OPEN POSITIONS SUMMARY</CardTitle>
              </CardHeader>
              <CardContent className="p-6"><SummaryCard {...openSummary} compact={true} /></CardContent>
            </Card>
          </div>

          {/* Portfolio composition */}
          <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl mb-6">
            <CardHeader className="bg-blue-50 border-b-4 border-gray-900 p-6">
              <CardTitle className="flex items-center gap-4 text-gray-900 text-3xl font-black"><TrendingUp className="w-10 h-10 text-blue-600" />PORTFOLIO COMPOSITION</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              {compositionData.length > 0 ? (
                <div className="h-[600px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={compositionData} margin={{ top: 80, right: 30, left: 30, bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ccc" strokeWidth={2} />
                      <XAxis dataKey="name" tick={{ fontSize, fontWeight: 'bold', fill: '#1f2937' }} stroke="#1f2937" strokeWidth={3} />
                      <YAxis tick={{ fontSize, fontWeight: 'bold', fill: '#1f2937' }} stroke="#1f2937" strokeWidth={3} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '4px solid #1f2937', borderRadius: '0', fontSize: `${fontSize}px`, fontWeight: 'bold', padding: '16px' }} formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Portfolio %']} />
                      <Bar dataKey="percentage" label={<CustomBarLabel />}>
                        {compositionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center"><div className="text-3xl font-black text-gray-500">NO OPEN POSITIONS</div></div>
              )}
            </CardContent>
          </Card>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            {[
              { label: 'TOTAL P&L', value: `${metrics.totalPL >= 0 ? '+' : ''}$${Math.round(metrics.totalPL).toLocaleString()}`, color: metrics.totalPL >= 0 ? 'text-green-700' : 'text-red-700' },
              { label: 'WIN RATE', value: `${metrics.winRate.toFixed(1)}%`, sub: `${metrics.winningTrades}W / ${metrics.losingTrades}L`, color: 'text-gray-900' },
              { label: 'AVG P&L', value: `${metrics.averagePL >= 0 ? '+' : ''}$${Math.round(metrics.averagePL).toLocaleString()}`, sub: 'per trade', color: metrics.averagePL >= 0 ? 'text-green-700' : 'text-red-700' },
              { label: 'TOTAL TRADES', value: metrics.totalTrades, color: 'text-gray-900' },
              { label: 'LARGEST WIN', value: `+$${Math.round(metrics.largestWin).toLocaleString()}`, color: 'text-green-700' },
              { label: 'LARGEST LOSS', value: `$${Math.round(metrics.largestLoss).toLocaleString()}`, color: 'text-red-700' },
              { label: 'MAX DRAWDOWN', value: `-$${Math.round(metrics.maxDrawdown).toLocaleString()}`, color: 'text-red-700' },
            ].map(m => (
              <Card key={m.label} className="bg-gradient-to-br from-gray-100 to-gray-200 border-4 border-gray-900 rounded-none shadow-xl">
                <CardHeader className="pb-3"><CardTitle className="text-xl font-black text-gray-900">{m.label}</CardTitle></CardHeader>
                <CardContent>
                  <div className={`text-4xl font-black ${m.color}`}>{m.value}</div>
                  {m.sub && <div className="text-lg font-bold text-gray-600 mt-1">{m.sub}</div>}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          {chartData.length > 0 ? (
            <>
              <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl mb-6">
                <CardHeader className="bg-green-50 border-b-4 border-gray-900 p-6"><CardTitle className="text-3xl font-black text-gray-900">CUMULATIVE P&L OVER TIME</CardTitle></CardHeader>
                <CardContent className="p-8">
                  <ResponsiveContainer width="100%" height={500}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ccc" strokeWidth={2} />
                      <XAxis dataKey="displayDate" stroke="#000" style={{ fontSize: `${fontSize}px`, fontWeight: 'bold' }} strokeWidth={3} />
                      <YAxis stroke="#000" style={{ fontSize: `${fontSize}px`, fontWeight: 'bold' }} strokeWidth={3} tickFormatter={v => `$${v.toLocaleString()}`} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '4px solid #000', borderRadius: 0, fontWeight: 'bold', fontSize: `${fontSize}px`, padding: '16px' }} formatter={v => [`$${Math.round(v).toLocaleString()}`, 'Cumulative P&L']} />
                      <Line type="monotone" dataKey="cumulativePL" stroke="#16a34a" strokeWidth={4} dot={{ fill: '#16a34a', r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl">
                <CardHeader className="bg-blue-50 border-b-4 border-gray-900 p-6"><CardTitle className="text-3xl font-black text-gray-900">DAILY P&L</CardTitle></CardHeader>
                <CardContent className="p-8">
                  <ResponsiveContainer width="100%" height={500}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ccc" strokeWidth={2} />
                      <XAxis dataKey="displayDate" stroke="#000" style={{ fontSize: `${fontSize}px`, fontWeight: 'bold' }} strokeWidth={3} />
                      <YAxis stroke="#000" style={{ fontSize: `${fontSize}px`, fontWeight: 'bold' }} strokeWidth={3} tickFormatter={v => `$${v.toLocaleString()}`} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '4px solid #000', borderRadius: 0, fontWeight: 'bold', fontSize: `${fontSize}px`, padding: '16px' }} formatter={v => [`$${Math.round(v).toLocaleString()}`, 'Daily P&L']} />
                      <Bar dataKey="dailyPL">
                        {chartData.map((entry, i) => <Cell key={i} fill={entry.dailyPL >= 0 ? '#16a34a' : '#dc2626'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="bg-gray-100 border-8 border-gray-900 rounded-none shadow-2xl">
              <CardContent className="py-16">
                <div className="text-center text-3xl font-black text-gray-500">NO CLOSED POSITIONS IN THIS DATE RANGE</div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}