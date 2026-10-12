import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, RefreshCw, Plus, ArrowRight, X } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import FontSizeSlider from "../components/positions/FontSizeSlider";
import StockChart from "../components/positions/StockChart";
import SortableTableHead from "../components/positions/SortableTableHead";
import TVList from "../components/watchlist/TVList";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const BUILT_IN_CATEGORIES = ['Open', 'Tech', 'Metals and Batteries', 'Ideas to Check', 'Photonics', 'Space', 'Memory', 'Asymmetric Bets', 'Short Term', 'Tradewhisperer'];
const INDEXES_CATEGORY = 'Indexes';
const TV_CATEGORY = 'TV';

const INDEX_SYMBOLS = [
  { symbol: "DIA", name: "Dow Jones (DIA)" },
  { symbol: "SPY", name: "S&P 500 (SPY)" },
  { symbol: "QQQ", name: "Nasdaq (QQQ)" },
  { symbol: "IWM", name: "Russell 2000 (IWM)" },
  { symbol: "UUP", name: "Dollar Index (UUP)" },
];



export default function WatchList() {
  const [watchList, setWatchList] = useState([]);
  const [newSymbol, setNewSymbol] = useState("");
  const [currentPrices, setCurrentPrices] = useState({});
  const [prevClosePrices, setPrevClosePrices] = useState({});
  const [oneMonthPrices, setOneMonthPrices] = useState({});
  const [sixMonthPrices, setSixMonthPrices] = useState({});
  const [oneYearPrices, setOneYearPrices] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [chartSymbol, setChartSymbol] = useState(null);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('watchListFontSize');
    return saved ? parseInt(saved) : 20;
  });

  const [selectedCategory, setSelectedCategory] = useState('Open');
  const [sortConfig, setSortConfig] = useState({ key: 'symbol', direction: 'asc' });
  const [indexData, setIndexData] = useState({});
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('watchListCustomCategories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [hiddenBuiltIns, setHiddenBuiltIns] = useState(() => {
    try {
      const saved = localStorage.getItem('watchListHiddenBuiltIns');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const visibleBuiltIns = BUILT_IN_CATEGORIES.filter((c) => !hiddenBuiltIns.includes(c));
  // Auto-recover any categories that have symbols but aren't in the known lists
  const knownCategories = new Set([...BUILT_IN_CATEGORIES, ...customCategories, INDEXES_CATEGORY, TV_CATEGORY]);
  const orphanedCategories = [...new Set(watchList.map((i) => i.category).filter((c) => c && !knownCategories.has(c)))];
  const CATEGORIES = [...visibleBuiltIns, ...customCategories, ...orphanedCategories, TV_CATEGORY, INDEXES_CATEGORY];

  useEffect(() => {
    localStorage.setItem('watchListCustomCategories', JSON.stringify(customCategories));
  }, [customCategories]);

  // Category preferences are saved on the user account so they persist
  // across devices, browsers, and sessions (localStorage is only a fallback).
  const loadCategoryPrefs = async () => {
    try {
      const user = await base44.auth.me();
      if (Array.isArray(user.watchlist_custom_categories)) {
        setCustomCategories(user.watchlist_custom_categories);
      }
      if (Array.isArray(user.watchlist_hidden_builtins)) {
        setHiddenBuiltIns(user.watchlist_hidden_builtins);
        localStorage.setItem('watchListHiddenBuiltIns', JSON.stringify(user.watchlist_hidden_builtins));
      }
    } catch (e) {
      console.error("Error loading category preferences:", e);
    }
  };

  const persistCategoryPrefs = (custom, hidden) => {
    base44.auth.updateMe({
      watchlist_custom_categories: custom,
      watchlist_hidden_builtins: hidden
    });
  };

  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (CATEGORIES.includes(name)) {
      setNewCategoryName("");
      setShowAddCategory(false);
      return;
    }
    const updated = [...customCategories, name];
    setCustomCategories(updated);
    persistCategoryPrefs(updated, hiddenBuiltIns);
    setNewCategoryName("");
    setShowAddCategory(false);
    setSelectedCategory(name);
  };

  const handleDeleteCategory = async (category) => {
    const itemsInCategory = watchList.filter((item) => item.category === category);
    const message = itemsInCategory.length > 0
      ? `Delete watchlist "${category}" and its ${itemsInCategory.length} symbol(s)?`
      : `Delete watchlist "${category}"?`;
    if (!window.confirm(message)) return;

    for (const item of itemsInCategory) {
      await base44.entities.WatchListItem.delete(item.id);
    }
    if (customCategories.includes(category)) {
      const updatedCustom = customCategories.filter((c) => c !== category);
      setCustomCategories(updatedCustom);
      persistCategoryPrefs(updatedCustom, hiddenBuiltIns);
    } else {
      const hidden = hiddenBuiltIns.includes(category) ? hiddenBuiltIns : [...hiddenBuiltIns, category];
      localStorage.setItem('watchListHiddenBuiltIns', JSON.stringify(hidden));
      setHiddenBuiltIns(hidden);
      persistCategoryPrefs(customCategories, hidden);
    }
    if (selectedCategory === category) {
      setSelectedCategory('Open');
    }
    await loadWatchList();
  };

  const fetchHistoricalPrices = async (symbols) => {
    try {
      const { data } = await base44.functions.invoke('getBulkHistoricalPrices', {
        symbols,
        periods: [
          { key: '1M', daysAgo: 22 },
          { key: '6M', daysAgo: 132 },
          { key: '1Y', daysAgo: 252 },
        ],
      });

      if (!data?.prices) return;

      const oneMonthPricesMap = {};
      const sixMonthPricesMap = {};
      const oneYearPricesMap = {};

      for (const symbol of symbols) {
        const p = data.prices[symbol] || {};
        if (p['1M'] > 0) oneMonthPricesMap[symbol] = p['1M'];
        if (p['6M'] > 0) sixMonthPricesMap[symbol] = p['6M'];
        if (p['1Y'] > 0) oneYearPricesMap[symbol] = p['1Y'];
      }

      setOneMonthPrices(oneMonthPricesMap);
      setSixMonthPrices(sixMonthPricesMap);
      setOneYearPrices(oneYearPricesMap);
    } catch (error) {
      console.error("Error fetching historical prices:", error);
    }
  };

  const fetchIndexPrices = async () => {
    try {
      const { data } = await base44.functions.invoke('getIndexPrices', {});
      if (data && data.prices) {
        const combined = {};
        INDEX_SYMBOLS.forEach(index => {
          const price = data.prices[index.symbol];
          const prevClose = data.prevCloses?.[index.symbol];
          if (price) {
            const change = prevClose ? price - prevClose : 0;
            const changePercent = prevClose ? (change / prevClose) * 100 : 0;
            combined[index.symbol] = { price, change, changePercent };
          }
        });
        setIndexData(combined);
      }
    } catch (error) {
      console.error("Error fetching index prices:", error);
    }
  };

  const fetchAllPrices = async (items) => {
    const symbols = [...new Set(items.map((item) => item.symbol))];

    try {
      console.log("Fetching all prices for:", symbols);

      const { data } = await base44.functions.invoke('getCurrentPrices', { symbols });

      if (data && data.prices) {
        setCurrentPrices(data.prices);
      }

      if (data && data.prevCloses) {
        setPrevClosePrices(data.prevCloses);
      }

      await fetchHistoricalPrices(symbols);

    } catch (error) {
      console.error("Error fetching prices:", error);
    }
  };

  useEffect(() => {
    loadWatchList();
    fetchIndexPrices();
    loadCategoryPrefs();
  }, []);

  useEffect(() => {
    localStorage.setItem('watchListFontSize', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    if (watchList.length === 0) return;

    const isMarketHours = () => {
      const now = new Date();
      const estTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const hours = estTime.getHours();
      const day = estTime.getDay();

      return day >= 1 && day <= 5 && hours >= 9 && hours < 16;
    };

    let interval;
    if (watchList.length > 0 && isMarketHours()) {
      interval = setInterval(() => {
        fetchAllPrices(watchList);
      }, 60000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [watchList]);

  const loadWatchList = async () => {
    setIsLoading(true);
    const data = await base44.entities.WatchListItem.list("-date_added");
    setWatchList(data);
    if (data.length > 0) {
      await fetchAllPrices(data);
    }
    setIsLoading(false);
  };

  const handleAddSymbol = async () => {
    if (!newSymbol.trim()) return;

    await base44.entities.WatchListItem.create({
      symbol: newSymbol.toUpperCase(),
      date_added: new Date().toISOString().split('T')[0],
      category: selectedCategory
    });

    setNewSymbol("");
    await loadWatchList();
  };

  const handleDelete = async (id) => {
    await base44.entities.WatchListItem.delete(id);
    await loadWatchList();
  };

  const handleMoveToCategory = async (item, newCategory) => {
    await base44.entities.WatchListItem.update(item.id, { category: newCategory });
    await loadWatchList();
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    if (selectedCategory === 'Indexes') {
      await fetchIndexPrices();
    } else {
      await fetchAllPrices(watchList);
    }
    setIsLoading(false);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getPriceChange = (symbol) => {
    const current = currentPrices[symbol];
    const prevClose = prevClosePrices[symbol];

    if (!current || !prevClose) return { value: 0, percent: 0 };

    const change = current - prevClose;
    const percentChange = (change / prevClose) * 100;

    return { value: change, percent: percentChange };
  };

  const getPercentChange = (symbol, historicalPrice) => {
    const current = currentPrices[symbol];
    if (!current || !historicalPrice) return null;

    return ((current - historicalPrice) / historicalPrice) * 100;
  };

  const getSortedWatchList = () => {
    const filtered = watchList.filter((item) => item.category === selectedCategory);
    const sorted = [...filtered];

    sorted.sort((a, b) => {
      let aVal, bVal;

      switch (sortConfig.key) {
        case 'symbol':
          aVal = a.symbol;
          bVal = b.symbol;
          break;
        case 'date_added':
          aVal = new Date(a.date_added);
          bVal = new Date(b.date_added);
          break;
        case 'current_price':
          aVal = currentPrices[a.symbol] || 0;
          bVal = currentPrices[b.symbol] || 0;
          break;
        case 'change_percent':
          aVal = getPriceChange(a.symbol).percent;
          bVal = getPriceChange(b.symbol).percent;
          break;
        case 'one_month_percent':
          aVal = getPercentChange(a.symbol, oneMonthPrices[a.symbol]) || 0;
          bVal = getPercentChange(b.symbol, oneMonthPrices[b.symbol]) || 0;
          break;
        case 'six_month_percent':
          aVal = getPercentChange(a.symbol, sixMonthPrices[a.symbol]) || 0;
          bVal = getPercentChange(b.symbol, sixMonthPrices[b.symbol]) || 0;
          break;
        case 'one_year_percent':
          aVal = getPercentChange(a.symbol, oneYearPrices[a.symbol]) || 0;
          bVal = getPercentChange(b.symbol, oneYearPrices[b.symbol]) || 0;
          break;
        default:
          aVal = a[sortConfig.key];
          bVal = b[sortConfig.key];
          break;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const sortedWatchList = getSortedWatchList();

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-6 md:space-y-10 bg-white">
      <div className="px-3 max-w-full">
            {/* Header */}
            <div className="mb-8 md:mb-12 flex flex-col gap-4">
              <div className="mx-48 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6">
                <div className="flex-shrink-0">
                  <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-2 md:mb-4">Watch List</h1>
                  <p className="text-lg md:text-2xl text-gray-700 font-bold">Monitor stocks you're interested in</p>
                </div>
                <FontSizeSlider value={fontSize} onChange={setFontSize} />
                <Button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex-shrink-0 w-full md:w-auto bg-green-600 hover:bg-green-700 text-white text-xl md:text-2xl h-14 md:h-16 px-6 md:px-8 border-4 border-green-800 rounded-none shadow-xl font-black">

                  <RefreshCw className={`w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? "FETCHING..." : "REFRESH"}
                </Button>
              </div>
            </div>

            {/* Category Filter Buttons */}
            <div className="mb-6 md:mb-10 flex gap-2 md:gap-4 flex-wrap items-center">
              {CATEGORIES.map((category) => {
                const isDeletable = category !== INDEXES_CATEGORY && category !== TV_CATEGORY;
                return (
                  <div key={category} className="relative inline-flex">
                    <Button
                      onClick={() => setSelectedCategory(category)}
                      className={`text-xl md:text-3xl h-12 md:h-20 px-4 md:px-10 border-2 md:border-4 rounded-none font-black ${
                        selectedCategory === category ?
                          'bg-gray-300 text-gray-900 border-gray-600' :
                          'bg-white text-gray-900 border-gray-900 hover:bg-gray-100'} ${isDeletable ? 'pr-12 md:pr-16' : ''}`
                      }>
                      {category}
                    </Button>
                    {isDeletable && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category); }}
                        className="absolute right-1 top-1 bg-red-600 hover:bg-red-700 text-white border border-red-800 rounded-none w-4 h-4 flex items-center justify-center"
                        title={`Delete ${category}`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              {showAddCategory ? (
                <div className="flex gap-2 items-center">
                  <Input
                    autoFocus
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                    placeholder="List name"
                    className="bg-white border-4 border-gray-900 text-gray-900 text-xl md:text-2xl h-12 md:h-20 px-4 rounded-none font-bold w-48 md:w-64"
                  />
                  <Button
                    onClick={handleAddCategory}
                    className="bg-green-600 hover:bg-green-700 text-white text-xl md:text-2xl h-12 md:h-20 px-4 md:px-6 border-4 border-green-800 rounded-none font-black">
                    SAVE
                  </Button>
                  <Button
                    onClick={() => { setShowAddCategory(false); setNewCategoryName(""); }}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-900 text-xl md:text-2xl h-12 md:h-20 px-4 md:px-6 border-4 border-gray-700 rounded-none font-black">
                    CANCEL
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setShowAddCategory(true)}
                  className="text-xl md:text-3xl h-12 md:h-20 px-4 md:px-8 border-2 md:border-4 rounded-none font-black bg-yellow-400 hover:bg-yellow-500 text-gray-900 border-yellow-600">
                  <Plus className="w-5 h-5 md:w-7 md:h-7 mr-2" />
                  ADD LIST
                </Button>
              )}
            </div>

            {/* Add Symbol Card */}
            {selectedCategory !== 'Indexes' && selectedCategory !== TV_CATEGORY && <Card className="bg-white text-card-foreground mr-64 mb-6 rounded-none border-4 md:border-8 border-gray-900 shadow-2xl md:mb-10">
              <CardContent className="mx-64 px-5 py-4 md:p-8">
                <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                  <Input
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  placeholder="Enter symbol (e.g., AAPL)"
                  className="flex-1 bg-white border-4 border-gray-900 text-gray-900 text-xl md:text-3xl h-16 md:h-20 rounded-none font-bold"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSymbol()} />

                  <Button
                  onClick={handleAddSymbol}
                  className="w-full md:w-auto bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-xl md:text-3xl h-16 md:h-20 px-6 md:px-10 border-8 border-yellow-600 rounded-none shadow-xl font-black">

                    <Plus className="w-6 h-6 md:w-10 md:h-10 mr-2 md:mr-4" />
                    ADD TO {selectedCategory}
                  </Button>
                </div>
              </CardContent>
              </Card>}

              {isLoading &&
          <Alert className="mb-10 bg-yellow-100 border-8 border-yellow-600 rounded-none">
                <RefreshCw className="h-8 w-8 animate-spin text-yellow-900" />
                <AlertDescription className="text-2xl font-bold text-yellow-900">Fetching current stock prices...</AlertDescription>
              </Alert>
          }

            {/* Indexes Table */}
            {selectedCategory === 'Indexes' && (
              <Card className="bg-indigo-50 border-4 md:border-8 border-indigo-700 rounded-none shadow-2xl overflow-hidden w-full md:w-fit md:mx-auto">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table className="w-full md:w-auto">
                      <TableHeader>
                        <TableRow className="border-b-4 border-indigo-700 hover:bg-transparent bg-indigo-200">
                          <TableHead className="text-indigo-900 font-black p-4 border-r-2 border-indigo-300" style={{ fontSize: `${fontSize}px` }}>Index</TableHead>
                          <TableHead className="text-indigo-900 font-black p-4 border-r-2 border-indigo-300 text-right" style={{ fontSize: `${fontSize}px` }}>Price</TableHead>
                          <TableHead className="text-indigo-900 font-black p-4 border-r-2 border-indigo-300 text-right" style={{ fontSize: `${fontSize}px` }}>Change</TableHead>
                          <TableHead className="text-indigo-900 font-black p-4 text-right" style={{ fontSize: `${fontSize}px` }}>Change %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {INDEX_SYMBOLS.map((index) => {
                          const d = indexData[index.symbol];
                          const isPositive = d?.change >= 0;
                          const changeColor = d?.change !== 0
                            ? (isPositive ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50')
                            : 'text-gray-900';
                          return (
                            <TableRow key={index.symbol} className="border-b-2 border-indigo-200 hover:bg-indigo-100 h-16">
                              <TableCell className="font-black text-indigo-900 p-3 border-r-2 border-indigo-200" style={{ fontSize: `${fontSize}px` }}>
                                <button
                                  onClick={() => setChartSymbol(index.symbol)}
                                  className="hover:text-indigo-600 underline cursor-pointer text-left">
                                  {index.name}
                                </button>
                              </TableCell>
                              <TableCell className="font-bold p-3 border-r-2 border-indigo-200 text-indigo-900 bg-indigo-100 text-right" style={{ fontSize: `${fontSize}px` }}>
                                {d?.price ? d.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : isLoading ? "..." : "—"}
                              </TableCell>
                              <TableCell className={`font-black p-3 border-r-2 border-indigo-200 text-right ${changeColor}`} style={{ fontSize: `${fontSize}px` }}>
                                {d?.change !== undefined ? `${isPositive ? '+' : ''}${d.change.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                              </TableCell>
                              <TableCell className={`font-black p-3 text-right ${changeColor}`} style={{ fontSize: `${fontSize}px` }}>
                                {d?.changePercent !== undefined ? `${isPositive ? '+' : ''}${d.changePercent.toFixed(2)}%` : "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* TV Recommendations */}
            {selectedCategory === TV_CATEGORY && <TVList fontSize={fontSize} />}

            {/* Watch List Table */}
            {selectedCategory !== 'Indexes' && selectedCategory !== TV_CATEGORY && <Card className="bg-white border-4 md:border-8 border-gray-900 rounded-none shadow-2xl overflow-hidden w-full md:w-fit md:mx-auto">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="w-full md:w-auto">
                    <TableHeader>
                      <TableRow className="border-b-4 border-gray-900 hover:bg-transparent bg-gray-100 h-32">
                        <SortableTableHead
                        label="Symbol"
                        sortKey="symbol"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        fontSize={fontSize} />

                        <SortableTableHead
                        label="Date Added"
                        sortKey="date_added"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        fontSize={fontSize} />

                        <SortableTableHead
                        label="Current Price"
                        sortKey="current_price"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        fontSize={fontSize} />

                        <SortableTableHead
                        label="1D %"
                        sortKey="change_percent"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        fontSize={fontSize} />

                        <SortableTableHead
                        label="1M %"
                        sortKey="one_month_percent"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        fontSize={fontSize} />

                        <SortableTableHead
                        label="6M %"
                        sortKey="six_month_percent"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        fontSize={fontSize} />

                        <SortableTableHead
                        label="1Y %"
                        sortKey="one_year_percent"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        fontSize={fontSize} />

                        <TableHead className="text-gray-900 font-black p-4" style={{ fontSize: `${fontSize}px` }}></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedWatchList.map((item) => {
                      const currentPrice = currentPrices[item.symbol];
                      const prevClose = prevClosePrices[item.symbol];
                      const priceChange = getPriceChange(item.symbol);
                      const hasChange = currentPrice && prevClose && priceChange.value !== 0;
                      const isPositive = priceChange.value > 0;

                      const oneMonthChange = getPercentChange(item.symbol, oneMonthPrices[item.symbol]);
                      const sixMonthChange = getPercentChange(item.symbol, sixMonthPrices[item.symbol]);
                      const oneYearChange = getPercentChange(item.symbol, oneYearPrices[item.symbol]);

                      return (
                        <TableRow key={item.id} className="border-b-2 border-gray-300 hover:bg-gray-50">
                            <TableCell className="font-black text-gray-900 p-3 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>
                              <button
                              onClick={() => setChartSymbol(item.symbol)}
                              className="hover:text-gray-600 underline cursor-pointer">

                                {item.symbol}
                              </button>
                            </TableCell>
                            <TableCell className="text-gray-900 font-bold p-3 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>
                              {format(new Date(item.date_added), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="font-bold p-3 border-r-2 border-gray-300 text-gray-900 bg-gray-100" style={{ fontSize: `${fontSize}px` }}>
                              {currentPrice ? `$${currentPrice.toFixed(2)}` : isLoading ? "Loading..." : "N/A"}
                            </TableCell>
                            <TableCell className={`font-black p-3 border-r-2 border-gray-300 ${hasChange ? isPositive ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50' : 'text-gray-900'}`} style={{ fontSize: `${fontSize}px` }}>
                              {hasChange ?
                            <>
                                  {isPositive ? '+' : ''}{priceChange.percent.toFixed(2)}%
                                </> :

                            "—"
                            }
                            </TableCell>
                            <TableCell className={`font-black p-3 border-r-2 border-gray-300 ${oneMonthChange !== null ? oneMonthChange >= 0 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50' : 'text-gray-900'}`} style={{ fontSize: `${fontSize}px` }}>
                              {oneMonthChange !== null ?
                            <>
                                  {oneMonthChange >= 0 ? '+' : ''}{oneMonthChange.toFixed(2)}%
                                </> :

                            "—"
                            }
                            </TableCell>
                            <TableCell className={`font-black p-3 border-r-2 border-gray-300 ${sixMonthChange !== null ? sixMonthChange >= 0 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50' : 'text-gray-900'}`} style={{ fontSize: `${fontSize}px` }}>
                              {sixMonthChange !== null ?
                            <>
                                  {sixMonthChange >= 0 ? '+' : ''}{sixMonthChange.toFixed(2)}%
                                </> :

                            "—"
                            }
                            </TableCell>
                            <TableCell className={`font-black p-3 border-r-2 border-gray-300 ${oneYearChange !== null ? oneYearChange >= 0 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50' : 'text-gray-900'}`} style={{ fontSize: `${fontSize}px` }}>
                              {oneYearChange !== null ?
                            <>
                                  {oneYearChange >= 0 ? '+' : ''}{oneYearChange.toFixed(2)}%
                                </> :

                            "—"
                            }
                            </TableCell>
                            <TableCell className="p-3">
                              <div className="flex gap-2">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                    variant="ghost"
                                    size="lg"
                                    className="hover:bg-blue-100 text-blue-700 hover:text-blue-900 h-12 w-12 border-4 border-blue-700 rounded-none">

                                      <ArrowRight className="w-6 h-6" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="bg-white border-4 border-gray-900 rounded-none">
                                    {CATEGORIES.filter((cat) => cat !== item.category && cat !== TV_CATEGORY && cat !== INDEXES_CATEGORY).map((category) =>
                                  <DropdownMenuItem
                                    key={category}
                                    onClick={() => handleMoveToCategory(item, category)}
                                    className="text-xl font-bold cursor-pointer hover:bg-gray-100">

                                        Move to {category}
                                      </DropdownMenuItem>
                                  )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <Button
                                variant="ghost"
                                size="lg"
                                onClick={() => handleDelete(item.id)}
                                className="hover:bg-red-100 text-red-700 hover:text-red-900 h-12 w-12 border-4 border-red-700 rounded-none">

                                  <Trash2 className="w-6 h-6" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>);

                    })}
                      {sortedWatchList.length === 0 &&
                    <TableRow>
                          <TableCell colSpan={8} className="text-center text-gray-700 font-bold py-16" style={{ fontSize: `${fontSize + 4}px` }}>
                            No symbols in {selectedCategory} watch list. Add your first symbol above.
                          </TableCell>
                        </TableRow>
                    }
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>}
            </div>

            <StockChart
            symbol={chartSymbol}
            isOpen={!!chartSymbol}
            onClose={() => setChartSymbol(null)}
            period="1M"
            />
    </div>
  );
}