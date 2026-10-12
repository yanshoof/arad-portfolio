
import { isMarketHoursET } from "@/lib/market-hours";
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, RefreshCw, DollarSign, TrendingUp, TrendingDown, ShoppingCart } from "lucide-react"; // Added TrendingUp, TrendingDown, ShoppingCart
import { format } from "date-fns";
import FontSizeSlider from "../components/positions/FontSizeSlider";
import EESellPartialDialog from "../components/ee/EESellPartialDialog";
import EEBuyMorePositionDialog from "../components/ee/EEBuyMorePositionDialog"; // Added EEBuyMorePositionDialog import

export default function EEOpenPositions() {
  const [positions, setPositions] = useState([]);
  const [currentPrices, setCurrentPrices] = useState({});
  const [dailyPrices, setDailyPrices] = useState({});
  const [optionPrices, setOptionPrices] = useState({});
  const [optionPrevPrices, setOptionPrevPrices] = useState({});
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('eeOpenPositionsFontSize');
    return saved ? parseInt(saved) : 20;
  });
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [selectedGroupForSell, setSelectedGroupForSell] = useState(null);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false); // New state for buy dialog
  const [selectedGroupForBuy, setSelectedGroupForBuy] = useState(null); // New state for selected group to buy
  const [currentAccountValue, setCurrentAccountValue] = useState(() => {
    const saved = localStorage.getItem('eeCurrentAccountValue');
    return saved ? parseFloat(saved) : 0;
  });
  const [isEditingAccountValue, setIsEditingAccountValue] = useState(false);
  const [editingValue, setEditingValue] = useState('');

  useEffect(() => {
    loadPositions();
  }, []);

  useEffect(() => {
    localStorage.setItem('eeOpenPositionsFontSize', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('eeCurrentAccountValue', currentAccountValue.toString());
  }, [currentAccountValue]);

  useEffect(() => {
    if (positions.length > 0) {
      fetchAllPrices();
    }
  }, [positions]);

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
        fetchAllPrices();
      }, 60000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [positions]);

  const loadPositions = async () => {
    const data = await base44.entities.EEOpenPosition.list("-purchase_date");
    setPositions(data);
  };

  const fetchAllPrices = async () => {
    setIsLoadingPrices(true);

    try {
      // Fetch stock prices
      const stockSymbols = [...new Set(
        positions
          .filter(p => p.position_type === "STOCK")
          .map(p => p.symbol)
      )];
      
      if (stockSymbols.length > 0) {
        const { data: stockData } = await base44.functions.invoke('getCurrentPrices', { symbols: stockSymbols });
        if (stockData && stockData.prices) {
          setCurrentPrices(stockData.prices);
        }
        if (stockData && stockData.prevCloses) {
          setDailyPrices(stockData.prevCloses);
        }
      }

      // Fetch option prices
      const optionPositions = positions.filter(p => p.position_type === "OPTION");
      
      if (optionPositions.length > 0) {
        const { data: optionData } = await base44.functions.invoke('getOptionPrices', { 
          positions: optionPositions.map(p => ({
            symbol: p.symbol,
            option_type: p.option_type,
            strike: p.strike,
            expiration_date: p.expiration_date
          }))
        });
        
        if (optionData && optionData.optionPrices) {
          setOptionPrices(optionData.optionPrices);
        }
        if (optionData && optionData.prevClosePrices) {
          setOptionPrevPrices(optionData.prevClosePrices);
        }
      }
    } catch (error) {
      console.error("Error fetching prices:", error);
    } finally {
      setIsLoadingPrices(false);
    }
  };

  const handleDelete = async (id) => {
    await base44.entities.EEOpenPosition.delete(id);
    await loadPositions();
  };

  const handleSellPartial = async ({ quantity, sellPrice, sellDate }) => {
    if (!selectedGroupForSell) return;

    try {
      // Get all positions for this group, sorted by purchase date (FIFO)
      const groupPositions = positions
        .filter(p => {
          if (p.position_type === "STOCK") {
            return p.symbol === selectedGroupForSell.symbol && p.position_type === "STOCK";
          } else {
            return p.symbol === selectedGroupForSell.symbol && 
                   p.position_type === selectedGroupForSell.position_type &&
                   p.option_type === selectedGroupForSell.option_type &&
                   p.strike === selectedGroupForSell.strike &&
                   p.expiration_date === selectedGroupForSell.expiration_date;
          }
        })
        .sort((a, b) => new Date(a.purchase_date) - new Date(b.purchase_date));

      let remainingToSell = quantity;
      const closedPositionsToCreate = [];
      const openPositionsToUpdate = [];
      const openPositionsToDelete = [];

      // FIFO: Sell from oldest purchases first
      for (const position of groupPositions) {
        if (remainingToSell <= 0) break;

        const positionQuantity = Number(position.quantity);
        
        if (remainingToSell >= positionQuantity) {
          // Sell entire position
          closedPositionsToCreate.push({
            symbol: position.symbol,
            position_type: position.position_type,
            option_type: position.option_type,
            strike: position.strike,
            expiration_date: position.expiration_date,
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
            position_type: position.position_type,
            option_type: position.option_type,
            strike: position.strike,
            expiration_date: position.expiration_date,
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
      for (const closedPos of closedPositionsToCreate) {
        await base44.entities.EEClosedPosition.create(closedPos);
      }

      for (const update of openPositionsToUpdate) {
        await base44.entities.EEOpenPosition.update(update.id, { quantity: update.quantity });
      }

      for (const id of openPositionsToDelete) {
        await base44.entities.EEOpenPosition.delete(id);
      }

      await loadPositions();
      setSellDialogOpen(false);
      setSelectedGroupForSell(null);
    } catch (error) {
      console.error("Error selling partial position:", error);
      alert("Failed to process sale. Please try again.");
    }
  };

  // New function to handle buying more of an existing position
  const handleBuyMore = async ({ quantity, buyPrice, buyDate }) => {
    if (!selectedGroupForBuy) return;

    try {
      // Create a new open position record
      const newPosition = {
        symbol: selectedGroupForBuy.symbol,
        position_type: selectedGroupForBuy.position_type,
        purchase_price: buyPrice,
        purchase_date: buyDate,
        quantity: quantity
      };

      // Add option-specific fields if this is an option
      if (selectedGroupForBuy.position_type === "OPTION") {
        newPosition.option_type = selectedGroupForBuy.option_type;
        newPosition.strike = selectedGroupForBuy.strike;
        newPosition.expiration_date = selectedGroupForBuy.expiration_date;
      }

      await base44.entities.EEOpenPosition.create(newPosition);

      // Reload positions
      await loadPositions();
      
      // Close dialog
      setBuyDialogOpen(false);
      setSelectedGroupForBuy(null);
    } catch (error) {
      console.error("Error buying more:", error);
      alert("Failed to process purchase. Please try again.");
    }
  };

  const handleRefresh = async () => {
    await fetchAllPrices();
  };

  const handleStartEditingAccountValue = () => {
    setEditingValue(currentAccountValue.toString());
    setIsEditingAccountValue(true);
  };

  const handleSaveAccountValue = () => {
    const value = parseFloat(editingValue);
    if (!isNaN(value) && value >= 0) {
      setCurrentAccountValue(value);
    }
    setIsEditingAccountValue(false);
  };

  const handleCancelEditingAccountValue = () => {
    setIsEditingAccountValue(false);
  };

  const getCurrentPrice = (position) => {
    if (position.position_type === "STOCK") {
      const price = currentPrices[position.symbol];
      return price && typeof price === 'number' && price > 0 ? price : Number(position.purchase_price);
    } else {
      // For options
      const key = `${position.symbol}_${position.option_type}_${position.strike}_${position.expiration_date}`;
      const price = optionPrices[key];
      // Options prices can be 0 or null if out of market hours or no data
      return typeof price === 'number' && price >= 0 ? price : Number(position.purchase_price);
    }
  };

  const getPrevPrice = (position) => {
    if (position.position_type === "STOCK") {
      return dailyPrices[position.symbol];
    } else {
      const key = `${position.symbol}_${position.option_type}_${position.strike}_${position.expiration_date}`;
      return optionPrevPrices[key];
    }
  };

  // Group positions
  const groupedPositions = positions.reduce((acc, position) => {
    let groupKey;
    if (position.position_type === "STOCK") {
      groupKey = `STOCK_${position.symbol}`;
    } else {
      groupKey = `OPTION_${position.symbol}_${position.option_type}_${position.strike}_${position.expiration_date}`;
    }

    const existing = acc.find(g => g.groupKey === groupKey);

    if (existing) {
      existing.quantity += Number(position.quantity);
      existing.totalCost += Number(position.purchase_price) * Number(position.quantity);
      existing.dates.push(position.purchase_date);
      existing.ids.push(position.id);
    } else {
      acc.push({
        groupKey,
        symbol: position.symbol,
        position_type: position.position_type,
        option_type: position.option_type,
        strike: position.strike,
        expiration_date: position.expiration_date,
        quantity: Number(position.quantity),
        totalCost: Number(position.purchase_price) * Number(position.quantity),
        dates: [position.purchase_date],
        ids: [position.id],
        avgPurchasePrice: 0
      });
    }

    return acc;
  }, []);

  groupedPositions.forEach(group => {
    group.avgPurchasePrice = group.totalCost / group.quantity;
  });

  // Separate stocks and options
  const stockGroups = groupedPositions.filter(g => g.position_type === "STOCK");
  const optionGroups = groupedPositions.filter(g => g.position_type === "OPTION");

  const calculateSummary = () => {
    let totalPurchase = 0;
    let totalCurrent = 0;
    let totalYesterday = 0;

    groupedPositions.forEach(group => {
      const multiplier = group.position_type === "OPTION" ? 100 : 1;
      const purchaseTotal = group.avgPurchasePrice * group.quantity * multiplier;
      
      totalPurchase += purchaseTotal;

      const currentPrice = getCurrentPrice(group);
      const currentTotalValue = currentPrice * group.quantity * multiplier; // Renamed to avoid confusion with overall totalCurrent
      totalCurrent += currentTotalValue;

      const prevPrice = getPrevPrice(group);
      if (prevPrice && typeof prevPrice === 'number' && prevPrice >= 0) { // Options can have prevClose 0
        totalYesterday += prevPrice * group.quantity * multiplier;
      } else {
        totalYesterday += currentTotalValue; // Fallback to current total if no prev price
      }
    });

    const totalPL = totalCurrent - totalPurchase;
    const percentPL = totalPurchase > 0 ? (totalPL / totalPurchase) * 100 : 0;
    
    // Ensure totalYesterday is not 0 for daily percent calculation to avoid division by zero
    // And ensure there's an actual change from yesterday to calculate percentage
    const dailyPL = totalCurrent - totalYesterday;
    const dailyPercentPL = totalYesterday > 0 && totalYesterday !== totalCurrent ? (dailyPL / totalYesterday) * 100 : 0;

    return { totalCurrent, totalPL, percentPL, dailyPL, dailyPercentPL };
  };

  const summary = calculateSummary();

  return (
    <div className="p-8 md:p-12 space-y-10 bg-white">
      <div className="max-w-full mx-auto">
        <div className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-black text-gray-900">E&E Open Positions</h1>
            <p className="text-2xl text-gray-700 font-bold">Track your currently held stocks and options</p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isLoadingPrices}
            className="bg-green-600 hover:bg-green-700 text-white text-3xl h-20 px-10 border-4 border-green-800 rounded-none shadow-xl font-black"
          >
            <RefreshCw className={`w-8 h-8 mr-4 ${isLoadingPrices ? 'animate-spin' : ''}`} />
            {isLoadingPrices ? "FETCHING..." : "REFRESH"}
          </Button>
        </div>

        <div className="mb-10">
          <FontSizeSlider value={fontSize} onChange={setFontSize} />
        </div>

        {/* Summary with Current Account Value */}
        <Card className="bg-card text-card-foreground bg-gradient-to-br from-blue-50 to-blue-100 border-1 border-blue-600 shadow-2xl rounded-none mb-10 w-fit mx-auto">
          <CardContent className="bg-gray-300 p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
              {/* Current Account Value - Editable */}
              <div className="bg-blue-50 p-6 border-4 border-blue-700 rounded-none">
                <p className="text-4xl text-blue-900 mb-3 font-black">Current Value</p>
                {isEditingAccountValue ? (
                  <div className="space-y-3">
                    <input
                      type="number"
                      step="0.01"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveAccountValue();
                        if (e.key === 'Escape') handleCancelEditingAccountValue();
                      }}
                      className="w-full text-3xl font-black text-blue-900 border-2 border-blue-700 rounded px-2 py-1"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveAccountValue}
                        className="flex-1 bg-green-600 text-white text-sm font-bold py-1 px-2 rounded hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEditingAccountValue}
                        className="flex-1 bg-gray-500 text-white text-sm font-bold py-1 px-2 rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={handleStartEditingAccountValue}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    title="Click to edit"
                  >
                    <p className="text-5xl font-black text-blue-900">
                      ${Math.round(currentAccountValue).toLocaleString()}
                    </p>
                    <p className="text-sm text-blue-700 mt-2">Click to edit</p>
                  </div>
                )}
              </div>

              {/* Total $$ */}
              <div className="bg-white p-6 border-4 border-gray-900 rounded-none">
                <p className="text-4xl text-gray-700 mb-3 font-black">Total $$</p>
                <p className="text-5xl font-black text-gray-900">
                  ${Math.round(summary.totalCurrent).toLocaleString()}
                </p>
              </div>
              
              {/* Daily P&L */}
              <div className={`p-6 border-4 rounded-none ${summary.dailyPL >= 0 ? 'bg-green-100 border-green-700' : 'bg-red-100 border-red-700'}`}>
                <p className="text-4xl mb-3 font-black" style={{ color: summary.dailyPL >= 0 ? '#15803d' : '#b91c1c' }}>Daily P&L</p>
                <div className="flex items-center gap-4">
                  <p className={`text-5xl font-black ${summary.dailyPL >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {summary.dailyPL >= 0 ? '+' : ''}${Math.round(summary.dailyPL).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Daily % */}
              <div className={`p-6 border-4 rounded-none ${summary.dailyPercentPL >= 0 ? 'bg-green-100 border-green-700' : 'bg-red-100 border-red-700'}`}>
                <p className="text-4xl mb-3 font-black" style={{ color: summary.dailyPercentPL >= 0 ? '#15803d' : '#b91c1c' }}>Daily %</p>
                <p className={`text-5xl font-black ${summary.dailyPercentPL >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {summary.dailyPercentPL >= 0 ? '+' : ''}{summary.dailyPercentPL.toFixed(2)}%
                </p>
              </div>
              
              {/* Total P&L */}
              <div className={`p-6 border-4 rounded-none ${summary.totalPL >= 0 ? 'bg-green-100 border-green-700' : 'bg-red-100 border-red-700'}`}>
                <p className="text-4xl mb-3 font-black" style={{ color: summary.totalPL >= 0 ? '#15803d' : '#b91c1c' }}>Total P&L</p>
                <div className="flex items-center gap-4">
                  <p className={`text-5xl font-black ${summary.totalPL >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {summary.totalPL >= 0 ? '+' : ''}${Math.round(summary.totalPL).toLocaleString()}
                  </p>
                  {summary.totalPL >= 0 ?
                    <TrendingUp className="w-12 h-12 text-green-700" /> :
                    <TrendingDown className="w-12 h-12 text-red-700" />
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* STOCKS TABLE */}
        {stockGroups.length > 0 && (
          <div className="mb-10">
            <h2 className="text-4xl font-black text-gray-900 mb-6">STOCKS</h2>
            <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-4 border-gray-900 hover:bg-transparent bg-green-100">
                        <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>Symbol</TableHead>
                        <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>Avg Premium</TableHead>
                        <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>Purchase Dates</TableHead>
                        <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>Contracts</TableHead>
                        <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>Current Price</TableHead>
                        <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>Total P&L</TableHead>
                        <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>P&L %</TableHead>
                        <TableHead className="text-gray-900 font-black p-4" style={{ fontSize: `${fontSize}px` }}></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockGroups.map(group => {
                        const currentPrice = getCurrentPrice(group);
                        const currentTotal = currentPrice * group.quantity;
                        const purchaseTotal = group.avgPurchasePrice * group.quantity;
                        const totalPL = currentTotal - purchaseTotal;
                        const percentPL = purchaseTotal !== 0 ? (totalPL / purchaseTotal) * 100 : 0;
                        const isProfit = totalPL >= 0;

                        return (
                          <TableRow key={group.groupKey} className="border-b-2 border-gray-300 hover:bg-gray-50">
                            <TableCell className="font-black p-3 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>
                              {group.symbol}
                            </TableCell>
                            <TableCell className="font-bold p-3 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>
                              ${group.avgPurchasePrice.toFixed(2)}
                            </TableCell>
                            <TableCell className="p-3 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>
                              {group.dates.length > 1 ? (
                                <div className="flex flex-col gap-1">
                                  {group.dates.slice(0, 3).map((date, i) => (
                                    <div key={i}>{format(new Date(date), "MMM d, yy")}</div>
                                  ))}
                                  {group.dates.length > 3 && <div className="text-xs text-gray-500">+{group.dates.length - 3} more</div>}
                                </div>
                              ) : (
                                format(new Date(group.dates[0]), "MMM d, yy")
                              )}
                            </TableCell>
                            <TableCell className="font-bold p-3 border-r-2 border-gray-300 text-center" style={{ fontSize: `${fontSize}px` }}>
                              {Math.round(group.quantity)}
                            </TableCell>
                            <TableCell className="font-bold p-3 border-r-2 border-gray-300 bg-gray-100" style={{ fontSize: `${fontSize}px` }}>
                              ${currentPrice.toFixed(2)}
                            </TableCell>
                            <TableCell className={`font-black p-3 border-r-2 border-gray-300 ${isProfit ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`} style={{ fontSize: `${fontSize}px` }}>
                              {isProfit ? '+' : ''}${Math.round(totalPL)}
                            </TableCell>
                            <TableCell className={`font-black p-3 border-r-2 border-gray-300 ${isProfit ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`} style={{ fontSize: `${fontSize}px` }}>
                              {isProfit ? '+' : ''}{percentPL.toFixed(2)}%
                            </TableCell>
                            <TableCell className="p-3">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="lg"
                                  onClick={() => {
                                    setSelectedGroupForBuy(group);
                                    setBuyDialogOpen(true);
                                  }}
                                  className="hover:bg-blue-50 text-blue-600 hover:text-blue-800 border-2 border-blue-400 rounded-none"
                                  style={{ height: `${fontSize * 2}px`, width: `${fontSize * 2}px` }}
                                  title="Buy more"
                                >
                                  <ShoppingCart style={{ width: `${fontSize}px`, height: `${fontSize}px` }} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="lg"
                                  onClick={() => {
                                    setSelectedGroupForSell(group);
                                    setSellDialogOpen(true);
                                  }}
                                  className="hover:bg-green-50 text-green-600 hover:text-green-800 border-2 border-green-400 rounded-none"
                                  style={{ height: `${fontSize * 2}px`, width: `${fontSize * 2}px` }}
                                  title="Sell partial"
                                >
                                  <DollarSign style={{ width: `${fontSize}px`, height: `${fontSize}px` }} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="lg"
                                  onClick={() => group.ids.forEach(id => handleDelete(id))}
                                  className="hover:bg-red-50 text-red-600 hover:text-red-800 border-2 border-red-400 rounded-none"
                                  style={{ height: `${fontSize * 2}px`, width: `${fontSize * 2}px` }}
                                  title="Delete all"
                                >
                                  <Trash2 style={{ width: `${fontSize}px`, height: `${fontSize}px` }} />
                                </Button>
                              </div>
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
        )}

        {/* OPTIONS TABLE */}
        {optionGroups.length > 0 && (
          <div>
            <h2 className="text-4xl font-black text-gray-900 mb-6">OPTIONS</h2>
            <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-4 border-gray-900 hover:bg-transparent bg-purple-100">
                        <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>Symbol</TableHead>
                        <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>Type</TableHead>
                        <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>Strike</TableHead>
                        <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>Expiration</TableHead>
                        <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>Avg Premium</TableHead>
                        <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>Purchase Dates</TableHead>
                        <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>Contracts</TableHead>
                        <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>Current Price</TableHead>
                        <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>Total P&L</TableHead>
                        <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>P&L %</TableHead>
                        <TableHead className="text-gray-900 font-black p-4" style={{ fontSize: `${fontSize}px` }}></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {optionGroups.map(group => {
                        const multiplier = 100;
                        const currentPrice = getCurrentPrice(group);
                        const currentTotal = currentPrice * group.quantity * multiplier;
                        const purchaseTotal = group.avgPurchasePrice * group.quantity * multiplier;
                        const totalPL = currentTotal - purchaseTotal;
                        const percentPL = purchaseTotal !== 0 ? (totalPL / purchaseTotal) * 100 : 0;
                        const isProfit = totalPL >= 0;

                        return (
                          <TableRow key={group.groupKey} className="border-b-2 border-gray-300 hover:bg-gray-50">
                            <TableCell className="font-black p-3 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>
                              {group.symbol}
                            </TableCell>
                            <TableCell className="p-3 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>
                              <span className={`px-3 py-1 rounded ${group.option_type === 'CALL' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} font-bold`}>
                                {group.option_type}
                              </span>
                            </TableCell>
                            <TableCell className="font-bold p-3 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>
                              ${group.strike.toFixed(2)}
                            </TableCell>
                            <TableCell className="p-3 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>
                              {format(new Date(group.expiration_date), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="font-bold p-3 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>
                              ${group.avgPurchasePrice.toFixed(2)}
                            </TableCell>
                            <TableCell className="p-3 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>
                              {group.dates.length > 1 ? (
                                <div className="flex flex-col gap-1">
                                  {group.dates.map((date, i) => (
                                    <div key={i}>{format(new Date(date), "MMM d, yy")}</div>
                                  ))}
                                </div>
                              ) : (
                                format(new Date(group.dates[0]), "MMM d, yy")
                              )}
                            </TableCell>
                            <TableCell className="font-bold p-3 border-r-2 border-gray-300 text-center" style={{ fontSize: `${fontSize}px` }}>
                              {group.quantity}
                            </TableCell>
                            <TableCell className="font-bold p-3 border-r-2 border-gray-300 bg-gray-100" style={{ fontSize: `${fontSize}px` }}>
                              {isLoadingPrices ? "..." : `$${currentPrice.toFixed(2)}`}
                            </TableCell>
                            <TableCell className={`font-black p-3 border-r-2 border-gray-300 ${isProfit ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`} style={{ fontSize: `${fontSize}px` }}>
                              {isProfit ? '+' : ''}${Math.round(totalPL)}
                            </TableCell>
                            <TableCell className={`font-black p-3 border-r-2 border-gray-300 ${isProfit ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`} style={{ fontSize: `${fontSize}px` }}>
                              {isProfit ? '+' : ''}{percentPL.toFixed(2)}%
                            </TableCell>
                            <TableCell className="p-3">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="lg"
                                  onClick={() => {
                                    setSelectedGroupForBuy(group);
                                    setBuyDialogOpen(true);
                                  }}
                                  className="hover:bg-blue-50 text-blue-600 hover:text-blue-800 border-2 border-blue-400 rounded-none"
                                  style={{ height: `${fontSize * 2}px`, width: `${fontSize * 2}px` }}
                                  title="Buy more"
                                >
                                  <ShoppingCart style={{ width: `${fontSize}px`, height: `${fontSize}px` }} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="lg"
                                  onClick={() => {
                                    setSelectedGroupForSell(group);
                                    setSellDialogOpen(true);
                                  }}
                                  className="hover:bg-green-50 text-green-600 hover:text-green-800 border-2 border-green-400 rounded-none"
                                  style={{ height: `${fontSize * 2}px`, width: `${fontSize * 2}px` }}
                                  title="Sell partial"
                                >
                                  <DollarSign style={{ width: `${fontSize}px`, height: `${fontSize}px` }} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="lg"
                                  onClick={() => group.ids.forEach(id => handleDelete(id))}
                                  className="hover:bg-red-50 text-red-600 hover:text-red-800 border-2 border-red-400 rounded-none"
                                  style={{ height: `${fontSize * 2}px`, width: `${fontSize * 2}px` }}
                                  title="Delete all"
                                >
                                  <Trash2 style={{ width: `${fontSize}px`, height: `${fontSize}px` }} />
                                </Button>
                              </div>
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
        )}

        {positions.length === 0 && (
          <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl">
            <CardContent className="p-16 text-center">
              <p className="text-3xl text-gray-700 font-bold">
                No open positions yet. Add your first position in the Add Position tab.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <EEBuyMorePositionDialog 
        isOpen={buyDialogOpen}
        onClose={() => {
          setBuyDialogOpen(false);
          setSelectedGroupForBuy(null);
        }}
        groupedPosition={selectedGroupForBuy}
        onBuy={handleBuyMore}
        currentPrice={selectedGroupForBuy ? getCurrentPrice(selectedGroupForBuy) : null}
      />

      <EESellPartialDialog
        isOpen={sellDialogOpen}
        onClose={() => {
          setSellDialogOpen(false);
          setSelectedGroupForSell(null);
        }}
        groupedPosition={selectedGroupForSell}
        onSell={handleSellPartial}
        currentPrice={selectedGroupForSell ? getCurrentPrice(selectedGroupForSell) : null}
      />
    </div>
  );
}
