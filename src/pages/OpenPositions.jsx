import React, { useState, useEffect } from "react";
import { isMarketHoursET } from "@/lib/market-hours";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, RefreshCw, AlertCircle, DollarSign, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SortableTableHead from "../components/positions/SortableTableHead";
import OpenPositionSummaryCard from "../components/positions/OpenPositionSummaryCard";
import FontSizeSlider from "../components/positions/FontSizeSlider";
import TimePeriodFilter from "../components/positions/TimePeriodFilter";
import StockChart from "../components/positions/StockChart";
import MiniChart from "../components/positions/MiniChart";
import SellPartialPositionDialog from "../components/positions/SellPartialPositionDialog";
import BuyMorePositionDialog from "../components/positions/BuyMorePositionDialog"; // New import
import WhatIfHeld from "../components/positions/WhatIfHeld";
import SnapshotTable from "../components/positions/SnapshotTable";
import CaptureSnapshotDialog from "../components/positions/CaptureSnapshotDialog";
import { Camera } from "lucide-react";

export default function OpenPositions() {
  const [positions, setPositions] = useState([]);
  const [currentPrices, setCurrentPrices] = useState({});
  const [dailyPrices, setDailyPrices] = useState({}); 
  const [miniChartData, setMiniChartData] = useState({});
  
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [isLoadingCharts, setIsLoadingCharts] = useState(false);
  
  const [sortConfig, setSortConfig] = useState({ key: 'symbol', direction: 'asc' });
  const [priceError, setPriceError] = useState(null);
  const [chartSymbol, setChartSymbol] = useState(null);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('openPositionsFontSize');
    return saved ? parseInt(saved) : 20;
  });
  const [selectedPeriod, setSelectedPeriod] = useState('1M');

  // New state for sell partial feature
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [selectedGroupForSell, setSelectedGroupForSell] = useState(null);

  // New states for buy more feature
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [selectedGroupForBuy, setSelectedGroupForBuy] = useState(null);

  // What If tab state
  const [activeTab, setActiveTab] = useState("positions");
  const [closedPositions, setClosedPositions] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false);

  useEffect(() => {
    if (activeTab === "whatif") {
      if (closedPositions.length === 0) {
        base44.entities.ClosedPosition.list("-sell_date").then(setClosedPositions);
      }
      loadSnapshots();
    }
  }, [activeTab]);

  const loadSnapshots = async () => {
    const data = await base44.entities.PortfolioSnapshot.list("-snapshot_date");
    setSnapshots(data.filter((s) => s.show_in_what_if));
  };

  const handleCaptureSnapshot = async ({ label, showInWhatIf }) => {
    const today = new Date().toISOString().split("T")[0];
    const snapshotPositions = groupedPositions.map((g) => ({
      symbol: g.symbol,
      quantity: g.quantity,
      avg_purchase_price: g.avgPurchasePrice,
      purchase_date: g.dates[0],
    }));
    await base44.entities.PortfolioSnapshot.create({
      snapshot_date: today,
      label,
      positions: snapshotPositions,
      show_in_what_if: showInWhatIf,
    });
    if (showInWhatIf) loadSnapshots();
  };

  const handleDeleteSnapshot = async (id) => {
    if (!confirm("Delete this snapshot?")) return;
    await base44.entities.PortfolioSnapshot.delete(id);
    loadSnapshots();
  };

  useEffect(() => {
    loadPositions();
  }, []);

  useEffect(() => {
    localStorage.setItem('openPositionsFontSize', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    if (positions.length > 0) {
      const symbols = [...new Set(positions.map((p) => p.symbol))];
      // Mini chart data is no longer displayed, so no need to fetch it here.
      // fetchMiniChartData(symbols); 
    }
  }, [positions.length, selectedPeriod]);

  // Auto-refresh prices every 1 minute during market hours
  useEffect(() => {
    if (positions.length === 0) return;

    // Checked on every tick, so a page opened before the bell still starts
    // refreshing at the open (previously it was only checked once on load).
    const isMarketHours = () => isMarketHoursET();

    let interval;
    if (positions.length > 0) {
      interval = setInterval(() => {
        if (!isMarketHours()) return;
        console.log("Auto-refreshing prices during market hours...");
        const symbols = [...new Set(positions.map((p) => p.symbol))];
        fetchCurrentPrices(symbols);
      }, 60000); // 60000ms = 1 minute
    } else {
      console.log("No positions, auto-refresh is off.");
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [positions]); // Dependency on positions to re-evaluate when positions data changes

  const loadPositions = async () => {
    try {
      const data = await base44.entities.OpenPosition.list("-purchase_date");
      setPositions(data);
      
      if (data.length > 0) {
        const symbols = [...new Set(data.map((p) => p.symbol))];
        // Only need to fetch current prices - it now includes prevclose
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
        setDailyPrices(data.prevCloses && Object.keys(data.prevCloses).length > 0 ? data.prevCloses : {});
        setPriceError(null);
      } else {
        setPriceError("Could not fetch valid current prices.");
        setCurrentPrices({});
        setDailyPrices({}); // Ensure dailyPrices are also cleared
      }
    } catch (error) {
      console.error("Error fetching current prices:", error);
      setPriceError("Failed to fetch current prices.");
      setCurrentPrices({});
      setDailyPrices({}); // Ensure dailyPrices are also cleared
    } finally {
      setIsLoadingPrices(false);
    }
  };

  const fetchMiniChartData = async (symbols) => {
    // This function is still present but not called, as mini-chart is removed.
    // However, it's good practice to keep it if there's a possibility it might be
    // re-introduced or used elsewhere.
    if (!symbols || symbols.length === 0) return;

    setIsLoadingCharts(true);

    try {
      const chartPromises = symbols.map(async (symbol) => {
        try {
          const { data } = await base44.functions.invoke('getChartData', {
            symbol,
            period: selectedPeriod
          });
          return { symbol, prices: data.prices || [], success: true };
        } catch (error) {
          console.error(`Error fetching chart data for ${symbol}:`, error);
          return { symbol, prices: [], success: false };
        }
      });

      const results = await Promise.all(chartPromises);

      const chartData = {};
      results.forEach(({ symbol, prices, success }) => {
        if (success && prices && prices.length > 0) {
          chartData[symbol] = prices;
        }
      });

      setMiniChartData(chartData);
    } catch (error) {
      console.error("Error fetching mini chart data:", error);
      setMiniChartData({});
    } finally {
      setIsLoadingCharts(false);
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

  const handleSellPartial = async ({ quantity, sellPrice, sellDate }) => {
    if (!selectedGroupForSell) return;

    try {
      // Get all positions for this symbol, sorted by purchase date (FIFO)
      const symbolPositions = positions
        .filter(p => p.symbol === selectedGroupForSell.symbol)
        .sort((a, b) => new Date(a.purchase_date) - new Date(b.purchase_date));

      let remainingToSell = quantity;
      const closedPositionsToCreate = [];
      const openPositionsToUpdate = [];
      const openPositionsToDelete = [];

      // FIFO: Sell from oldest purchases first
      for (const position of symbolPositions) {
        if (remainingToSell <= 0) break;

        const positionQuantity = Number(position.quantity);
        
        if (remainingToSell >= positionQuantity) {
          // Sell entire position
          closedPositionsToCreate.push({
            symbol: position.symbol,
            purchase_price: position.purchase_price,
            purchase_date: position.purchase_date,
            quantity: positionQuantity,
            sell_price: sellPrice,
            sell_date: sellDate
          });
          openPositionsToDelete.push(position.id);
          remainingToSell -= positionQuantity;
        } else {
          // Sell partial position
          closedPositionsToCreate.push({
            symbol: position.symbol,
            purchase_price: position.purchase_price,
            purchase_date: position.purchase_date,
            quantity: remainingToSell,
            sell_price: sellPrice,
            sell_date: sellDate
          });
          openPositionsToUpdate.push({
            id: position.id,
            quantity: positionQuantity - remainingToSell
          });
          remainingToSell = 0;
        }
      }

      // Execute all operations
      // 1. Create closed positions
      for (const closedPos of closedPositionsToCreate) {
        await base44.entities.ClosedPosition.create(closedPos);
      }

      // 2. Update open positions (partial sells)
      for (const update of openPositionsToUpdate) {
        await base44.entities.OpenPosition.update(update.id, { quantity: update.quantity });
      }

      // 3. Delete open positions (full sells)
      for (const id of openPositionsToDelete) {
        await base44.entities.OpenPosition.delete(id);
      }

      // Reload positions
      await loadPositions();
      
      // Close dialog
      setSellDialogOpen(false);
      setSelectedGroupForSell(null);
    } catch (error) {
      console.error("Error selling partial position:", error);
      alert("Failed to process sale. Please try again.");
    }
  };

  const handleBuyMore = async ({ quantity, buyPrice, buyDate }) => {
    const purchasePrice = buyPrice;
    const purchaseDate = buyDate;
    if (!selectedGroupForBuy) return;

    try {
      await base44.entities.OpenPosition.create({
        symbol: selectedGroupForBuy.symbol,
        quantity: quantity,
        purchase_price: purchasePrice,
        purchase_date: purchaseDate,
      });

      await loadPositions(); // Reload all positions to update the table
      setBuyDialogOpen(false);
      setSelectedGroupForBuy(null);
    } catch (error) {
      console.error("Error buying more position:", error);
      alert("Failed to process purchase. Please try again.");
    }
  };

  const handleRefresh = async () => {
    const symbols = [...new Set(positions.map((p) => p.symbol))];
    await Promise.all([
      fetchCurrentPrices(symbols), // This now also fetches daily prices
      // fetchMiniChartData(symbols) // No longer fetching mini chart data
    ]);
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
      const purchasePrice = group.avgPurchasePrice;
      const yesterdayPrice = dailyPrices[group.symbol];

      totalPurchase += purchasePrice * group.quantity;
      totalCurrent += currentPrice * group.quantity;
      
      // Use avg purchase price as baseline if bought today (no prev close available),
      // or if avg purchase price > prev close (bought mid-day, use purchase as baseline)
      if (yesterdayPrice && typeof yesterdayPrice === 'number' && yesterdayPrice > 0) {
        totalYesterday += yesterdayPrice * group.quantity;
      } else {
        totalYesterday += group.avgPurchasePrice * group.quantity;
      }
    });

    const totalPL = totalCurrent - totalPurchase;
    const percentPL = totalPurchase > 0 ? (totalPL / totalPurchase) * 100 : 0;
    
    const dailyPL = totalCurrent - totalYesterday;
    const dailyPercentPL = totalYesterday > 0 ? (dailyPL / totalYesterday) * 100 : 0;

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
        case 'daily_pl':
          const aCurrentDailyPL = getCurrentPrice(a.symbol);
          const bCurrentDailyPL = getCurrentPrice(b.symbol);
          const aYesterdayDailyPL = dailyPrices[a.symbol] || aCurrentDailyPL;
          const bYesterdayDailyPL = dailyPrices[b.symbol] || bCurrentDailyPL;
          aVal = aCurrentDailyPL * a.quantity - aYesterdayDailyPL * a.quantity;
          bVal = bCurrentDailyPL * b.quantity - bYesterdayDailyPL * b.quantity;
          comparison = aVal - bVal;
          break;
        case 'current_pl':
          const aCurrentPrice = getCurrentPrice(a.symbol);
          const bCurrentPrice = getCurrentPrice(b.symbol);
          aVal = aCurrentPrice * a.quantity - a.avgPurchasePrice * a.quantity;
          bVal = bCurrentPrice * b.quantity - b.avgPurchasePrice * b.quantity;
          comparison = aVal - bVal;
          break;
        case 'daily_percent':
          const aCurrentDailyPercent = getCurrentPrice(a.symbol);
          const bCurrentDailyPercent = getCurrentPrice(b.symbol);
          const aYesterdayDailyPercent = dailyPrices[a.symbol] || aCurrentDailyPercent;
          const bYesterdayDailyPercent = dailyPrices[b.symbol] || bCurrentDailyPercent;
          const aCurrentTotalDailyPercent = aCurrentDailyPercent * a.quantity;
          const bCurrentTotalDailyPercent = bCurrentDailyPercent * b.quantity;
          const aYesterdayTotalDailyPercent = aYesterdayDailyPercent * a.quantity;
          const bYesterdayTotalDailyPercent = bYesterdayDailyPercent * b.quantity;
          aVal = aYesterdayTotalDailyPercent !== 0 ? (aCurrentTotalDailyPercent - aYesterdayTotalDailyPercent) / aYesterdayTotalDailyPercent : 0;
          bVal = bYesterdayTotalDailyPercent !== 0 ? (bCurrentTotalDailyPercent - bYesterdayTotalDailyPercent) / bYesterdayTotalDailyPercent : 0;
          comparison = aVal - bVal;
          break;
        case 'percent_pl':
          const aCurrentPricePercent = getCurrentPrice(a.symbol);
          const bCurrentPricePercent = getCurrentPrice(b.symbol);
          const aTotal = a.avgPurchasePrice * a.quantity;
          const bTotal = b.avgPurchasePrice * b.quantity;
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

  const isLoading = isLoadingPrices; // isLoadingCharts is no longer relevant for the displayed table

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-6 md:space-y-10 bg-white">
      {/* Sub-tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'positions', label: 'OPEN POSITIONS' },
          { key: 'whatif', label: '🤔 WHAT IF?' },
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
      </div>

      {activeTab === 'whatif' ? (
        <div className="space-y-10">
          {snapshots.length > 0 && (
            <div className="space-y-10">
              <div className="text-3xl font-black text-gray-900 border-b-4 border-purple-700 pb-3">📸 PORTFOLIO SNAPSHOTS</div>
              {snapshots.map((snap) => (
                <SnapshotTable key={snap.id} snapshot={snap} fontSize={fontSize} onDelete={handleDeleteSnapshot} />
              ))}
            </div>
          )}
          <div className="text-3xl font-black text-gray-900 border-b-4 border-gray-900 pb-3 pt-6">🤔 SELL DECISION ANALYSIS</div>
          <WhatIfHeld positions={closedPositions} fontSize={fontSize} />
        </div>
      ) : (
      <div className="flex flex-col items-center">
        {/* Header - Mobile Responsive */}
        <div className="w-full mb-6 flex flex-col md:flex-row justify-center md:justify-between items-center gap-4 md:gap-6">
          <h1 className="text-gray-900 text-3xl md:text-5xl font-black text-center md:text-left">Open Positions</h1>
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <Button
              onClick={() => setCaptureDialogOpen(true)}
              disabled={positions.length === 0}
              className="w-full md:w-auto bg-purple-700 hover:bg-purple-800 text-white text-xl md:text-2xl h-16 md:h-20 px-6 md:px-8 border-4 border-purple-900 rounded-none shadow-xl font-black"
            >
              <Camera className="w-6 h-6 md:w-7 md:h-7 mr-2 md:mr-3" />
              SNAPSHOT
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-green-600 hover:bg-green-700 text-white text-xl md:text-3xl h-16 md:h-20 px-6 md:px-10 border-4 border-green-800 rounded-none shadow-xl font-black"
            >
              <RefreshCw className={`w-6 h-6 md:w-8 md:h-8 mr-3 md:mr-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? "FETCHING..." : "REFRESH"}
            </Button>
          </div>
        </div>

        {/* Controls - Mobile Responsive */}
        <div className="w-full flex flex-col md:flex-row items-center gap-4 md:gap-8 mb-6 md:mb-8">
          <div className="w-full md:w-auto overflow-x-auto">
            <TimePeriodFilter
              selectedPeriod={selectedPeriod}
              onPeriodChange={setSelectedPeriod}
              includeTotal={false}
            />
          </div>
          <div className="w-full md:w-auto">
            <FontSizeSlider value={fontSize} onChange={setFontSize} />
          </div>
        </div>

        {priceError && (
          <Alert variant="destructive" className="mb-10 bg-yellow-50 border-4 border-yellow-500 rounded-none">
            <AlertCircle className="h-6 w-6 text-yellow-700" />
            <AlertDescription className="text-xl font-semibold text-yellow-800">{priceError}</AlertDescription>
          </Alert>
        )}

        <OpenPositionSummaryCard {...summary} />

        {/* Table - Mobile: Horizontal Scroll, Desktop: Centered */}
        <div className="w-full md:w-auto">
          <Card className="bg-white border-4 md:border-8 border-gray-900 rounded-none shadow-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="w-full md:w-auto">
                  <TableHeader>
                    <TableRow className="border-b-4 border-gray-900 hover:bg-transparent">
                      <SortableTableHead
                        label="Symbol"
                        sortKey="symbol"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        fontSize={fontSize}
                      />
                      <TableHead className="bg-green-100 text-green-900 font-black border-r-2 border-gray-300 leading-tight whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, lineHeight: '1.3', width: '120px', paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                        <span className="leading-tight">Price Now</span>
                      </TableHead>
                      <SortableTableHead
                        label="Daily P&L"
                        sortKey="daily_pl"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        fontSize={fontSize}
                      />
                      <SortableTableHead
                        label="Total P&L"
                        sortKey="current_pl"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        fontSize={fontSize}
                      />
                      <SortableTableHead
                        label="Daily %"
                        sortKey="daily_percent"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        fontSize={fontSize}
                      />
                      <SortableTableHead
                        label="Total %"
                        sortKey="percent_pl"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        fontSize={fontSize}
                      />
                      <TableHead className="bg-green-100 text-green-900 font-black px-3" style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPositions.map((group) => {
                      const currentPrice = getCurrentPrice(group.symbol);
                      const currentTotal = currentPrice * group.quantity;
                      const purchaseTotal = group.avgPurchasePrice * group.quantity;
                      const totalPL = currentTotal - purchaseTotal;
                      const percentPL = purchaseTotal !== 0 ? (totalPL / purchaseTotal) * 100 : 0;
                      const isTotalProfit = totalPL >= 0;

                      const yesterdayPrice = dailyPrices[group.symbol];
                      const hasDailyData = yesterdayPrice && typeof yesterdayPrice === 'number' && yesterdayPrice > 0;

                      let dailyPL = 0;
                      let dailyPercent = 0;
                      let isDailyProfit = false;

                      if (hasDailyData) {
                        // Daily P&L = current vs previous close
                        const baselineTotal = yesterdayPrice * group.quantity;
                        dailyPL = currentTotal - baselineTotal;
                        dailyPercent = baselineTotal !== 0 ? (dailyPL / baselineTotal) * 100 : 0;
                        isDailyProfit = dailyPL >= 0;
                      } else {
                        // No prev close — show 0
                        dailyPL = 0;
                        dailyPercent = 0;
                        isDailyProfit = true;
                      }

                      return (
                        <TableRow key={group.symbol} className="border-b-2 border-gray-300 hover:bg-gray-50">
                          <TableCell className="font-black text-gray-900 border-r-2 border-gray-300 text-left whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                            <button
                              onClick={() => setChartSymbol(group.symbol)}
                              className="hover:text-blue-600 underline cursor-pointer"
                            >
                              {group.symbol}
                            </button>
                          </TableCell>
                          <TableCell className="text-gray-900 bg-gray-100 font-bold border-r-2 border-gray-300 text-center whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, width: '120px', paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                            {isLoadingPrices ? (
                              <span className="text-gray-500">...</span>
                            ) : (
                              `$${currentPrice.toFixed(2)}`
                            )}
                          </TableCell>
                          <TableCell className={`font-bold border-r-2 border-gray-300 text-center whitespace-nowrap px-3 ${isDailyProfit ? 'text-green-700' : 'text-red-700'}`} style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                            {isLoadingPrices ? (
                              <span className="text-gray-500">...</span>
                            ) : (
                              <>{isDailyProfit ? '+' : ''}${Math.round(dailyPL)}</>
                            )}
                          </TableCell>
                          <TableCell className={`font-black border-r-2 border-gray-300 text-center whitespace-nowrap px-3 ${isTotalProfit ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`} style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                            {isTotalProfit ? '+' : ''}${Math.round(totalPL)}
                          </TableCell>
                          <TableCell className={`font-bold border-r-2 border-gray-300 text-center whitespace-nowrap px-3 ${isDailyProfit ? 'text-green-700' : 'text-red-700'}`} style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                            {isLoadingPrices ? (
                              <span className="text-gray-500">...</span>
                            ) : (
                              <>{isDailyProfit ? '+' : ''}{dailyPercent.toFixed(2)}%</>
                            )}
                          </TableCell>
                          <TableCell className={`font-black border-r-2 border-gray-300 text-center whitespace-nowrap px-3 ${isTotalProfit ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`} style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                            {isTotalProfit ? '+' : ''}{percentPL.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-center px-2" style={{ paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="lg"
                                onClick={() => {
                                  setSelectedGroupForBuy(group);
                                  setBuyDialogOpen(true);
                                }}
                                className="hover:bg-blue-50 text-blue-600 hover:text-blue-800 border-2 border-blue-400 rounded-none h-10 w-10"
                              >
                                <ShoppingCart className="w-5 h-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="lg"
                                onClick={() => {
                                  setSelectedGroupForSell(group);
                                  setSellDialogOpen(true);
                                }}
                                className="hover:bg-green-50 text-green-600 hover:text-green-800 border-2 border-green-400 rounded-none h-10 w-10"
                              >
                                <DollarSign className="w-5 h-5" />
                              </Button>
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
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {positions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-700 font-bold py-16" style={{ fontSize: `${fontSize + 4}px` }}>
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
      </div>
      )}

      <StockChart
        symbol={chartSymbol}
        isOpen={!!chartSymbol}
        onClose={() => setChartSymbol(null)}
        period={selectedPeriod}
        currentPrice={chartSymbol ? currentPrices[chartSymbol] : null}
        dailyPrice={chartSymbol ? dailyPrices[chartSymbol] : null}
      />

      <SellPartialPositionDialog
        isOpen={sellDialogOpen}
        onClose={() => {
          setSellDialogOpen(false);
          setSelectedGroupForSell(null);
        }}
        groupedPosition={selectedGroupForSell}
        onSell={handleSellPartial}
        currentPrice={selectedGroupForSell ? getCurrentPrice(selectedGroupForSell.symbol) : null}
      />

      <BuyMorePositionDialog
        isOpen={buyDialogOpen}
        onClose={() => {
          setBuyDialogOpen(false);
          setSelectedGroupForBuy(null);
        }}
        groupedPosition={selectedGroupForBuy}
        onBuy={handleBuyMore}
      />

      <CaptureSnapshotDialog
        isOpen={captureDialogOpen}
        onClose={() => setCaptureDialogOpen(false)}
        onSave={handleCaptureSnapshot}
        defaultDate={new Date().toISOString().split("T")[0]}
      />


    </div>
  );
}