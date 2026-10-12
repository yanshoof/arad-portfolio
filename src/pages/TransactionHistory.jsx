import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import PortfolioAnalyticsPanel from "../components/analytics/PortfolioAnalyticsPanel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import SortableTableHead from "../components/positions/SortableTableHead";
import FontSizeSlider from "../components/positions/FontSizeSlider";
import { format, parseISO, isValid } from "date-fns";

export default function TransactionHistory() {
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('transactionHistoryFontSize');
    return saved ? parseInt(saved) : 28;
  });
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [filterSymbol, setFilterSymbol] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    localStorage.setItem('transactionHistoryFontSize', fontSize.toString());
  }, [fontSize]);

  const { data: openPositions = [], isLoading: loadingOpen, refetch: refetchOpen } = useQuery({
    queryKey: ['openPositions_history'],
    queryFn: () => base44.entities.OpenPosition.list('-purchase_date'),
  });

  const { data: closedPositions = [], isLoading: loadingClosed, refetch: refetchClosed } = useQuery({
    queryKey: ['closedPositions_history'],
    queryFn: () => base44.entities.ClosedPosition.list('-sell_date'),
  });

  const isLoading = loadingOpen || loadingClosed;

  const refetch = () => { refetchOpen(); refetchClosed(); };

  // Build unified transaction list
  const allTransactions = [
    ...openPositions.map(p => ({
      id: 'buy_' + p.id,
      type: 'BUY',
      symbol: p.symbol,
      quantity: p.quantity,
      price: p.purchase_price,
      date: p.purchase_date,
      total: p.quantity * p.purchase_price,
    })),
    ...closedPositions.map(p => ({
      id: 'sell_' + p.id,
      type: 'SELL',
      symbol: p.symbol,
      quantity: p.quantity,
      price: p.sell_price,
      date: p.sell_date,
      total: p.quantity * p.sell_price,
      buyPrice: p.purchase_price,
      buyDate: p.purchase_date,
      pnl: (p.sell_price - p.purchase_price) * p.quantity,
    })),
  ];

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const d = parseISO(dateStr);
    return isValid(d) ? d : null;
  };

  // Filter
  const filtered = allTransactions.filter(tx => {
    const symbolMatch = !filterSymbol || tx.symbol.toLowerCase().includes(filterSymbol.toLowerCase());
    const typeMatch = filterType === 'all' || tx.type === filterType;
    const txDate = parseDate(tx.date);
    const dateFromMatch = !filterDateFrom || (txDate && txDate >= new Date(filterDateFrom));
    const dateToMatch = !filterDateTo || (txDate && txDate <= new Date(filterDateTo + 'T23:59:59'));
    return symbolMatch && typeMatch && dateFromMatch && dateToMatch;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let aVal, bVal;
    switch (sortConfig.key) {
      case 'symbol': aVal = a.symbol; bVal = b.symbol; break;
      case 'type': aVal = a.type; bVal = b.type; break;
      case 'quantity': aVal = a.quantity; bVal = b.quantity; break;
      case 'price': aVal = a.price; bVal = b.price; break;
      case 'total': aVal = a.total; bVal = b.total; break;
      case 'date':
      default:
        aVal = parseDate(a.date)?.getTime() ?? 0;
        bVal = parseDate(b.date)?.getTime() ?? 0;
        break;
    }
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const hasFilters = filterSymbol || filterType !== 'all' || filterDateFrom || filterDateTo;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white">
        <div className="text-2xl font-black text-gray-500">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900">TRANSACTION HISTORY</h1>
        <div className="flex gap-4 items-center">
          <FontSizeSlider value={fontSize} onChange={setFontSize} />
          <Button
            onClick={refetch}
            className="bg-gray-900 text-white hover:bg-gray-700 text-2xl font-black h-14 px-6 rounded-none border-4 border-gray-900"
          >
            <RefreshCw className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-100 p-4 mb-6 rounded-none border-4 border-gray-300 flex flex-col md:flex-row gap-4 flex-wrap">
        <div className="flex-1 min-w-[140px]">
          <label className="text-xl font-black text-gray-900 mb-2 block">SYMBOL</label>
          <Input
            value={filterSymbol}
            onChange={(e) => setFilterSymbol(e.target.value)}
            placeholder="e.g. CCJ"
            className="text-xl font-bold rounded-none border-2 border-gray-300"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-xl font-black text-gray-900 mb-2 block">TYPE</label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="text-xl font-bold rounded-none border-2 border-gray-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="BUY">BUY</SelectItem>
              <SelectItem value="SELL">SELL</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-xl font-black text-gray-900 mb-2 block">DATE FROM</label>
          <Input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="text-xl font-bold rounded-none border-2 border-gray-300"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-xl font-black text-gray-900 mb-2 block">DATE TO</label>
          <Input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="text-xl font-bold rounded-none border-2 border-gray-300"
          />
        </div>
        {hasFilters && (
          <div className="flex items-end">
            <Button
              onClick={() => { setFilterSymbol(''); setFilterType('all'); setFilterDateFrom(''); setFilterDateTo(''); }}
              className="bg-red-600 hover:bg-red-700 text-white text-xl font-black h-14 px-6 rounded-none border-4 border-red-800"
            >
              CLEAR
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border-4 border-gray-900 rounded-none overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b-4 border-gray-900 hover:bg-transparent">
                <SortableTableHead label="Date" sortKey="date" currentSort={sortConfig} onSort={handleSort} fontSize={fontSize} />
                <SortableTableHead label="Symbol" sortKey="symbol" currentSort={sortConfig} onSort={handleSort} fontSize={fontSize} />
                <SortableTableHead label="Type" sortKey="type" currentSort={sortConfig} onSort={handleSort} fontSize={fontSize} />
                <SortableTableHead label="Quantity" sortKey="quantity" currentSort={sortConfig} onSort={handleSort} fontSize={fontSize} />
                <SortableTableHead label="Price" sortKey="price" currentSort={sortConfig} onSort={handleSort} fontSize={fontSize} />
                <SortableTableHead label="Total" sortKey="total" currentSort={sortConfig} onSort={handleSort} fontSize={fontSize} />
                <TableHead className="bg-green-100 text-green-900 font-black border-r-2 border-gray-300 whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                  P&L
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <span className="text-2xl font-black text-gray-500">NO TRANSACTIONS FOUND</span>
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((tx) => {
                  const txDate = parseDate(tx.date);
                  const isBuy = tx.type === 'BUY';
                  const isPnlPositive = tx.pnl >= 0;

                  return (
                    <TableRow key={tx.id} className="border-b-2 border-gray-300 hover:bg-gray-50">
                      <TableCell className="text-gray-900 font-bold border-r-2 border-gray-300 text-center whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                        {txDate ? format(txDate, "dd/MM/yy") : tx.date}
                      </TableCell>
                      <TableCell className="font-black text-gray-900 border-r-2 border-gray-300 text-left whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                        {tx.symbol}
                      </TableCell>
                      <TableCell className={`font-black border-r-2 border-gray-300 text-center whitespace-nowrap px-3 ${isBuy ? 'text-blue-700 bg-blue-50' : 'text-green-700 bg-green-50'}`} style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                        {tx.type}
                      </TableCell>
                      <TableCell className="text-gray-900 font-bold border-r-2 border-gray-300 text-center whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                        {Number.isInteger(tx.quantity) ? tx.quantity : tx.quantity.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-gray-900 font-bold border-r-2 border-gray-300 text-center whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                        ${tx.price?.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-gray-900 font-bold border-r-2 border-gray-300 text-center whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                        ${Math.round(tx.total).toLocaleString()}
                      </TableCell>
                      <TableCell className={`font-black border-r-2 border-gray-300 text-center whitespace-nowrap px-3 ${isBuy ? 'text-gray-400' : isPnlPositive ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`} style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                        {isBuy ? '—' : `${isPnlPositive ? '+' : ''}$${Math.round(tx.pnl).toLocaleString()}`}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mt-6 bg-gray-100 p-4 rounded-none border-4 border-gray-300">
        <div className="text-2xl font-black text-gray-900">
          SHOWING {sorted.length} OF {allTransactions.length} TRANSACTIONS
        </div>
      </div>

      <PortfolioAnalyticsPanel
        openPositions={openPositions}
        closedPositions={closedPositions}
      />
    </div>
  );
}