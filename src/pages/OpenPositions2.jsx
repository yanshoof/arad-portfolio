import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, RefreshCw, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SortableTableHead from "../components/positions/SortableTableHead";
import OpenPositionSummaryCard from "../components/positions/OpenPositionSummaryCard";
import FontSizeSlider from "../components/positions/FontSizeSlider";
import TimePeriodFilter from "../components/positions/TimePeriodFilter";
import StockChart from "../components/positions/StockChart";

const COLUMN_DEFINITIONS = [
  { id: 'symbol', label: 'Symbol' },
  { id: 'purchase_date', label: 'Purchase Date' },
  { id: 'quantity', label: 'Quantity' },
  { id: 'purchase_price', label: 'Purchase Price' },
  { id: 'current_price', label: 'Current Price' },
  { id: 'current_total', label: 'Current Total' },
  { id: 'current_pl', label: 'Current P&L' },
  { id: 'percent_pl', label: 'P&L %' }
];

export default function OpenPositions2() {
  const [positions, setPositions] = useState([]);
  const [currentPrices, setCurrentPrices] = useState({});
  const [historicalPrices, setHistoricalPrices] = useState({});
  const [dailyPrices, setDailyPrices] = useState({});
  
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(false);
  
  const [sortConfig, setSortConfig] = useState({ key: 'purchase_date', direction: 'desc' });
  const [priceError, setPriceError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('TOTAL');
  const [chartSymbol, setChartSymbol] = useState(null);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('openPositions2FontSize');
    return saved ? parseInt(saved) : 20;
  });
  const [visibleColumns, setVisibleColumns] = useState(
    COLUMN_DEFINITIONS.reduce((acc, col) => ({ ...acc, [col.id]: true }), {})
  );

  useEffect(() => {
    loadPositions();
  }, []);

  useEffect(() => {
    localStorage.setItem('openPositions2FontSize', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    if (positions.length > 0 && selectedPeriod !== 'TOTAL') {
      const symbols = [...new Set(positions.map((p) => p.symbol))];
      fetchHistoricalPrices(symbols, selectedPeriod);
    } else {
      setHistoricalPrices({});
    }
  }, [selectedPeriod, positions.length]);

  // Auto-refresh prices every 1 minute during market hours
  useEffect(() => {
    if (positions.length === 0) return;

    const isMarketHours = () => {
      const now = new Date();
      // Use "America/New_York" for EST/EDT
      const estTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const hours = estTime.getHours();
      const day = estTime.getDay(); // Sunday - 0, Monday - 1, ..., Saturday - 6
      
      // Market hours for NYSE/NASDAQ are typically 9:30 AM to 4:00 PM EST/EDT
      // Check for weekdays (Monday to Friday) and hours between 9 (inclusive) and 16 (exclusive, i.e., up to 3:59 PM)
      // For more precise timing, one might check minutes as well, e.g., 9:30-16:00
      // For simplicity here, 9:00 AM to 3:59 PM EST is used.
      return day >= 1 && day <= 5 && hours >= 9 && hours < 16;
    };

    let interval;
    if (positions.length > 0 && isMarketHours()) {
      interval = setInterval(() => {
        const symbols = [...new Set(positions.map((p) => p.symbol))];
        fetchCurrentPrices(symbols);
        // Only fetch historical prices if a specific period is selected (not 'TOTAL')
        if (selectedPeriod !== 'TOTAL') {
          fetchHistoricalPrices(symbols, selectedPeriod);
        }
      }, 60000); // 60000ms = 1 minute
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [positions, selectedPeriod]); // Dependencies: positions for symbols, selectedPeriod for historical fetch condition


  const loadPositions = async () => {
    try {
      const data = await base44.entities.OpenPosition.list("-purchase_date");
      setPositions(data);
      if (data.length > 0) {
        const symbols = [...new Set(data.map((p) => p.symbol))];
        await fetchCurrentPrices(symbols);
      }
    } catch (error) {
      console.error("Error loading positions:", error);
      setPriceError("Failed to load positions");
    }
  };

  const fetchCurrentPrices = async (symbols) => {
    if (!symbols || symbols.length === 0) return;

    setIsLoadingPrices(true);
    setPriceError(null);

    try {
      const { data } = await base44.functions.invoke('getCurrentPrices', { symbols });

      if (data && data.prices && Object.keys(data.prices).length > 0) {
        setCurrentPrices(data.prices);
        
        if (data.prevCloses && Object.keys(data.prevCloses).length > 0) {
          setDailyPrices(data.prevCloses);
        } else {
          setDailyPrices({}); // Ensure dailyPrices is cleared if no prevCloses
        }
        
        setPriceError(null);
      } else {
        setPriceError("Could not fetch valid current prices.");
        setCurrentPrices({});
        setDailyPrices({});
      }
    } catch (error) {
      console.error("Error fetching current prices:", error);
      setPriceError("Failed to fetch current prices.");
      setCurrentPrices({});
      setDailyPrices({});
    } finally {
      setIsLoadingPrices(false);
    }
  };

  const fetchHistoricalPrices = async (symbols, period) => {
    if (!period || period === 'TOTAL' || !symbols || symbols.length === 0) {
      setHistoricalPrices({});
      return;
    }

    setIsLoadingHistorical(true);

    try {
      const periodDays = { '1D': 1, '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365 };
      const daysAgo = periodDays[period];
      if (!daysAgo) { setHistoricalPrices({}); return; }

      const { data } = await base44.functions.invoke('getBulkHistoricalPrices', {
        symbols,
        periods: [{ key: period, daysAgo }],
      });

      const historicalData = {};
      if (data?.prices) {
        for (const symbol of symbols) {
          const price = data.prices[symbol]?.[period];
          if (price > 0) historicalData[symbol] = price;
        }
      }
      setHistoricalPrices(historicalData);
    } catch (error) {
      console.error("Error fetching historical prices:", error);
      setHistoricalPrices({});
    } finally {
      setIsLoadingHistorical(false);
    }
  };

  const handleDelete = async (id) => {
    const position = positions.find(p => p.id === id);
    if (position) {
      await base44.entities.PositionLog.create({
        action: "deleted",
        symbol: position.symbol,
        quantity: position.quantity,
        purchase_price: position.purchase_price,
        purchase_date: position.purchase_date,
        notes: "Position deleted without closing"
      });
    }
    await base44.entities.OpenPosition.delete(id);
    await loadPositions();
  };

  const handleRefresh = async () => {
    const symbols = [...new Set(positions.map((p) => p.symbol))];

    const promises = [
      fetchCurrentPrices(symbols)
    ];

    if (selectedPeriod !== 'TOTAL') {
      promises.push(fetchHistoricalPrices(symbols, selectedPeriod));
    }

    await Promise.all(promises);
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getCurrentPrice = (symbol) => {
    const price = currentPrices[symbol];
    if (price && typeof price === 'number' && price > 0) {
      return price;
    }
    const group = groupedPositions.find((g) => g.symbol === symbol);
    return group ? Number(group.avgPurchasePrice) : 0;
  };

  const getComparisonPrice = (symbol, avgPurchasePrice) => {
    if (selectedPeriod === 'TOTAL') {
      return avgPurchasePrice;
    }
    const historicalPrice = historicalPrices[symbol];
    return historicalPrice && typeof historicalPrice === 'number' && historicalPrice > 0 ?
      historicalPrice :
      avgPurchasePrice;
  };

  const groupedPositions = positions.reduce((acc, position) => {
    const existing = acc.find((g) => g.symbol === position.symbol);

    if (existing) {
      existing.quantity += Number(position.quantity);
      existing.totalCost += Number(position.purchase_price) * Number(position.quantity);
      existing.dates.push(position.purchase_date);
      existing.ids.push(position.id);
    } else {
      acc.push({
        symbol: position.symbol,
        quantity: Number(position.quantity),
        totalCost: Number(position.purchase_price) * Number(position.quantity),
        dates: [position.purchase_date],
        ids: [position.id],
        avgPurchasePrice: 0
      });
    }

    return acc;
  }, []);

  groupedPositions.forEach((group) => {
    group.avgPurchasePrice = group.totalCost / group.quantity;
  });

  const calculateSummary = () => {
    let totalPurchase = 0;
    let totalCurrent = 0;
    let totalYesterday = 0;

    groupedPositions.forEach((group) => {
      const currentPrice = getCurrentPrice(group.symbol);
      const comparisonPrice = getComparisonPrice(group.symbol, group.avgPurchasePrice);
      const yesterdayPrice = dailyPrices[group.symbol];

      if (selectedPeriod === 'TOTAL') {
        totalPurchase += group.avgPurchasePrice * group.quantity;
      } else {
        totalPurchase += comparisonPrice * group.quantity;
      }

      totalCurrent += currentPrice * group.quantity;

      if (yesterdayPrice && typeof yesterdayPrice === 'number' && yesterdayPrice > 0) {
        totalYesterday += yesterdayPrice * group.quantity;
      } else {
        // If yesterday's price is not available, use current price as a fallback for daily P&L calculation
        totalYesterday += currentPrice * group.quantity;
      }
    });

    const totalPL = totalCurrent - totalPurchase;
    const percentPL = totalPurchase > 0 ? (totalPL / totalPurchase) * 100 : 0;

    const dailyPL = totalCurrent - totalYesterday;
    const dailyPercentPL = totalYesterday > 0 && totalYesterday !== totalCurrent ? (dailyPL / totalYesterday) * 100 : 0;

    return { totalCurrent, totalPL, percentPL, dailyPL, dailyPercentPL };
  };

  const summary = calculateSummary();

  const getSortedPositions = () => {
    const sorted = [...groupedPositions];

    sorted.sort((a, b) => {
      let aVal, bVal;
      let comparison = 0;

      switch (sortConfig.key) {
        case 'symbol':
          aVal = a.symbol;
          bVal = b.symbol;
          comparison = aVal.localeCompare(bVal);
          break;
        case 'purchase_date':
          // For aggregated positions, consider the earliest purchase date for sorting
          aVal = new Date(Math.min(...a.dates.map((d) => new Date(d))));
          bVal = new Date(Math.min(...b.dates.map((d) => new Date(d))));
          comparison = aVal.getTime() - bVal.getTime();
          break;
        case 'current_pl':
          const aCurrentPrice = getCurrentPrice(a.symbol);
          const bCurrentPrice = getCurrentPrice(b.symbol);
          const aCompPrice = getComparisonPrice(a.symbol, a.avgPurchasePrice);
          const bCompPrice = getComparisonPrice(b.symbol, b.avgPurchasePrice);
          aVal = aCurrentPrice * a.quantity - aCompPrice * a.quantity;
          bVal = bCurrentPrice * b.quantity - bCompPrice * b.quantity;
          comparison = aVal - bVal;
          break;
        case 'percent_pl':
          const aCurrentPricePercent = getCurrentPrice(a.symbol);
          const bCurrentPricePercent = getCurrentPrice(b.symbol);
          const aCompPricePercent = getComparisonPrice(a.symbol, a.avgPurchasePrice);
          const bCompPricePercent = getComparisonPrice(b.symbol, b.avgPurchasePrice);
          const aTotal = aCompPricePercent * a.quantity;
          const bTotal = bCompPricePercent * b.quantity;
          const aCurrentTotal = aCurrentPricePercent * a.quantity;
          const bCurrentTotal = bCurrentPricePercent * b.quantity;
          aVal = aTotal !== 0 ? (aCurrentTotal - aTotal) / aTotal : 0;
          bVal = bTotal !== 0 ? (bCurrentTotal - bTotal) / bTotal : 0;
          comparison = aVal - bVal;
          break;
        default:
          comparison = 0;
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  };

  const sortedPositions = getSortedPositions();
  const isLoading = isLoadingPrices || isLoadingHistorical;

  return (
    <div className="p-8 md:p-12 space-y-10 bg-white">
      <div className="flex flex-col items-center">
        <div className="mr-64 mb-6 flex justify-center items-center gap-6">
          <h1 className="text-gray-900 mx-20 text-5xl font-black">Open Positions 2</h1>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-10 [&_svg]:shrink-0 py-2 bg-green-600 hover:bg-green-700 text-white text-3xl h-20 px-10 border-4 border-green-800 rounded-none shadow-xl font-black"
          >
            <RefreshCw className={`w-8 h-8 mr-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? "FETCHING..." : "REFRESH"}
          </Button>
        </div>

        <div className="flex items-center gap-8 mb-8">
          <TimePeriodFilter
            selectedPeriod={selectedPeriod}
            onPeriodChange={handlePeriodChange}
            includeTotal={true}
          />
          <FontSizeSlider value={fontSize} onChange={setFontSize} />
        </div>

        {priceError && (
          <Alert variant="destructive" className="mb-10 bg-yellow-50 border-4 border-yellow-500 rounded-none">
            <AlertCircle className="h-6 w-6 text-yellow-700" />
            <AlertDescription className="text-xl font-semibold text-yellow-800">{priceError}</AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <Alert className="mb-10 bg-yellow-50 border-4 border-yellow-500 rounded-none">
            <RefreshCw className="h-6 w-6 animate-spin text-yellow-700" />
            <AlertDescription className="text-xl font-semibold text-yellow-800">
              Fetching stock prices...
            </AlertDescription>
          </Alert>
        )}

        <OpenPositionSummaryCard {...summary} />

        <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl overflow-hidden w-fit">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="w-auto">
                <TableHeader>
                  <TableRow className="border-b-4 border-gray-900 hover:bg-transparent">
                    {visibleColumns.symbol && (
                      <SortableTableHead
                        label="Symbol"
                        sortKey="symbol"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        fontSize={fontSize}
                      />
                    )}
                    {visibleColumns.purchase_date && (
                      <SortableTableHead
                        label="Purchase Date"
                        sortKey="purchase_date"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        fontSize={fontSize}
                      />
                    )}
                    {visibleColumns.quantity && (
                      <TableHead className="bg-green-100 text-green-900 font-black border-r-2 border-gray-300 leading-tight whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, lineHeight: '1.3', paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                        <span className="leading-tight">Quantity</span>
                      </TableHead>
                    )}
                    {visibleColumns.purchase_price && (
                      <TableHead className="bg-green-100 text-green-900 font-black border-r-2 border-gray-300 leading-tight whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, lineHeight: '1.3', paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                        <span className="leading-tight">{selectedPeriod === 'TOTAL' ? 'Avg Purchase Price' : `Price ${selectedPeriod} Ago`}</span>
                      </TableHead>
                    )}
                    {visibleColumns.current_price && (
                      <TableHead className="bg-green-100 text-green-900 font-black border-r-2 border-gray-300 leading-tight whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, lineHeight: '1.3', paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                        <span className="leading-tight">Current Price</span>
                      </TableHead>
                    )}
                    {visibleColumns.current_total && (
                      <TableHead className="bg-green-100 text-green-900 font-black border-r-2 border-gray-300 leading-tight whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, lineHeight: '1.3', paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                        <span className="leading-tight">Current Total</span>
                      </TableHead>
                    )}
                    {visibleColumns.current_pl && (
                      <SortableTableHead
                        label={`${selectedPeriod} P&L`}
                        sortKey="current_pl"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        fontSize={fontSize}
                      />
                    )}
                    {visibleColumns.percent_pl && (
                      <SortableTableHead
                        label="P&L %"
                        sortKey="percent_pl"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        fontSize={fontSize}
                      />
                    )}
                    <TableHead className="bg-green-100 text-green-900 font-black px-3" style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPositions.map((group) => {
                    const currentPrice = getCurrentPrice(group.symbol);
                    const comparisonPrice = getComparisonPrice(group.symbol, group.avgPurchasePrice);
                    const currentTotal = currentPrice * group.quantity;
                    const comparisonTotal = comparisonPrice * group.quantity;
                    const currentPL = currentTotal - comparisonTotal;
                    const percentPL = comparisonTotal !== 0 ? (currentPL / comparisonTotal) * 100 : 0;
                    const isProfit = currentPL >= 0;

                    return (
                      <TableRow key={group.symbol} className="border-b-2 border-gray-300 hover:bg-gray-50">
                        {visibleColumns.symbol && (
                          <TableCell className="font-black text-gray-900 border-r-2 border-gray-300 text-left whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                            <button
                              onClick={() => setChartSymbol(group.symbol)}
                              className="hover:text-blue-600 underline cursor-pointer"
                            >
                              {group.symbol}
                            </button>
                          </TableCell>
                        )}
                        {visibleColumns.purchase_date && (
                          <TableCell className="text-gray-900 font-bold border-r-2 border-gray-300 text-center whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                            {group.dates.length > 1 ? (
                              <div className="flex flex-col gap-2">
                                {group.dates.slice(0, 3).map((date, i) => (
                                  <div key={i} className="leading-tight">{format(new Date(date), "dd/MM/yy")}</div>
                                ))}
                                {group.dates.length > 3 && <div className="text-xs text-gray-500 leading-tight">+{group.dates.length - 3} more</div>}
                              </div>
                            ) : (
                              format(new Date(group.dates[0]), "dd/MM/yy")
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.quantity && (
                          <TableCell className="text-gray-900 font-bold border-r-2 border-gray-300 text-center whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                            {Math.round(group.quantity)}
                          </TableCell>
                        )}
                        {visibleColumns.purchase_price && (
                          <TableCell className="text-gray-900 font-bold border-r-2 border-gray-300 text-center whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                            ${comparisonPrice.toFixed(2)}
                          </TableCell>
                        )}
                        {visibleColumns.current_price && (
                          <TableCell className="text-gray-900 bg-gray-100 font-bold border-r-2 border-gray-300 text-center whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                            {isLoadingPrices ? (
                              <span className="text-gray-500">Loading...</span>
                            ) : (
                              `$${currentPrice.toFixed(2)}`
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.current_total && (
                          <TableCell className="text-gray-900 font-bold border-r-2 border-gray-300 text-center whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                            ${Math.round(currentTotal)}
                          </TableCell>
                        )}
                        {visibleColumns.current_pl && (
                          <TableCell className={`font-black border-r-2 border-gray-300 text-center whitespace-nowrap px-3 ${isProfit ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`} style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                            {isProfit ? '+' : ''}${Math.round(currentPL)}
                          </TableCell>
                        )}
                        {visibleColumns.percent_pl && (
                          <TableCell className={`font-black border-r-2 border-gray-300 text-center whitespace-nowrap px-3 ${isProfit ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`} style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                            {isProfit ? '+' : ''}{percentPL.toFixed(2)}%
                          </TableCell>
                        )}
                        <TableCell className="text-center px-2" style={{ paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                          <Button
                            variant="ghost"
                            size="lg"
                            onClick={() => {
                              group.ids.forEach((id) => handleDelete(id));
                            }}
                            className="hover:bg-red-50 text-red-600 hover:text-red-800 border-2 border-red-400 rounded-none h-10 w-10"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {positions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-gray-700 font-bold py-16" style={{ fontSize: `${fontSize + 4}px` }}>
                        No open positions yet. Add your first position in the Add Position tab.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <StockChart
        symbol={chartSymbol}
        isOpen={!!chartSymbol}
        onClose={() => setChartSymbol(null)}
        period={selectedPeriod === 'TOTAL' ? '1M' : selectedPeriod}
      />
    </div>
  );
}