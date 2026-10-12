import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search } from "lucide-react";
import FontSizeSlider from "../components/positions/FontSizeSlider";
import MomentumBar from "../components/momentum/MomentumBar";

const CATEGORIES = ['Open', 'Tech', 'Metals and Batteries', 'Ideas to Check', 'Photonics', 'Space', 'Memory', 'Asymmetric Bets', 'Short Term', 'Tradewhisperer'];
const TABS = [...CATEGORIES, 'Search'];

export default function Momentum() {
  const [selectedCategory, setSelectedCategory] = useState('Open');
  const [searchInput, setSearchInput] = useState('');
  const [searchSymbol, setSearchSymbol] = useState(null);
  const [searchData, setSearchData] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [currentPrices, setCurrentPrices] = useState({});
  const [ranges, setRanges] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('momentumFontSize');
    return saved ? parseInt(saved, 10) : 22;
  });

  useEffect(() => {
    localStorage.setItem('momentumFontSize', fontSize.toString());
  }, [fontSize]);

  const { data: watchList = [] } = useQuery({
    queryKey: ['watchList'],
    queryFn: () => base44.entities.WatchListItem.list('-date_added'),
  });

  const filteredItems = useMemo(
    () => watchList.filter(item => item.category === selectedCategory),
    [watchList, selectedCategory]
  );

  const fetchData = async (items) => {
    const symbols = [...new Set(items.map(i => i.symbol))];
    if (symbols.length === 0) {
      setCurrentPrices({});
      setRanges({});
      return;
    }
    setIsLoading(true);
    try {
      const [pricesRes, rangesRes] = await Promise.all([
        base44.functions.invoke('getCurrentPrices', { symbols }),
        base44.functions.invoke('get52WeekRange', { symbols }),
      ]);
      if (pricesRes?.data?.prices) setCurrentPrices(pricesRes.data.prices);
      if (rangesRes?.data?.ranges) setRanges(rangesRes.data.ranges);
    } catch (e) {
      console.error("Error fetching momentum data:", e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (filteredItems.length > 0) fetchData(filteredItems);
  }, [filteredItems]);

  const handleSearch = async () => {
    const sym = searchInput.trim().toUpperCase();
    if (!sym) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchData(null);
    setSearchSymbol(sym);
    try {
      const [pricesRes, rangesRes] = await Promise.all([
        base44.functions.invoke('getCurrentPrices', { symbols: [sym] }),
        base44.functions.invoke('get52WeekRange', { symbols: [sym] }),
      ]);
      const current = pricesRes?.data?.prices?.[sym];
      const range = rangesRes?.data?.ranges?.[sym];
      if (!current || !range) {
        setSearchError(`No data found for "${sym}". Check the symbol and try again.`);
      } else {
        setSearchData({ symbol: sym, current, low: range.low, high: range.high });
      }
    } catch (e) {
      console.error("Search error:", e);
      setSearchError("Failed to fetch data. Please try again.");
    }
    setSearchLoading(false);
  };

  // Build sorted display list: closest to 52w low first
  const displayItems = useMemo(() => {
    return filteredItems
      .map(item => {
        const r = ranges[item.symbol];
        const current = currentPrices[item.symbol];
        const pct = (r && current && r.high > r.low)
          ? ((current - r.low) / (r.high - r.low)) * 100
          : null;
        return { symbol: item.symbol, low: r?.low, high: r?.high, current, pct };
      })
      .sort((a, b) => {
        // Items without data go to bottom
        if (a.pct === null && b.pct === null) return a.symbol.localeCompare(b.symbol);
        if (a.pct === null) return 1;
        if (b.pct === null) return -1;
        return a.pct - b.pct; // ascending: closest to low first
      });
  }, [filteredItems, ranges, currentPrices]);

  return (
    <div className="p-4 md:p-8 lg:p-12 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-2">Momentum</h1>
          <p className="text-lg md:text-2xl text-gray-700 font-bold">
            See how close each stock is to its 52-week low or high
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <FontSizeSlider value={fontSize} onChange={setFontSize} />
          <Button
            onClick={() => fetchData(filteredItems)}
            disabled={isLoading || filteredItems.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white text-xl md:text-2xl h-14 md:h-16 px-6 md:px-8 border-4 border-green-800 rounded-none shadow-xl font-black"
          >
            <RefreshCw className={`w-5 h-5 md:w-6 md:h-6 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? "FETCHING..." : "REFRESH"}
          </Button>
        </div>
      </div>

      {/* Category filter */}
      <div className="mb-8 flex gap-2 md:gap-4 flex-wrap">
        {TABS.map(category => (
          <Button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`text-xl md:text-2xl h-12 md:h-16 px-4 md:px-8 border-4 rounded-none font-black ${
              selectedCategory === category
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-900 border-gray-900 hover:bg-gray-100'
            }`}
          >
            {category === 'Search' ? '🔍 SEARCH' : category}
          </Button>
        ))}
      </div>

      {/* Search tab */}
      {selectedCategory === 'Search' && (
        <div>
          <div className="mb-8 flex flex-col md:flex-row gap-4">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter symbol (e.g., AAPL)"
              className="flex-1 bg-white border-4 border-gray-900 text-gray-900 text-xl md:text-3xl h-16 md:h-20 rounded-none font-bold"
            />
            <Button
              onClick={handleSearch}
              disabled={searchLoading || !searchInput.trim()}
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-xl md:text-2xl h-16 md:h-20 px-6 md:px-10 border-4 border-yellow-600 rounded-none shadow-xl font-black"
            >
              <Search className={`w-6 h-6 mr-2 ${searchLoading ? 'animate-spin' : ''}`} />
              {searchLoading ? 'SEARCHING...' : 'SEARCH'}
            </Button>
          </div>

          {searchError && (
            <div className="text-center py-8 text-xl font-bold text-red-700 border-4 border-red-700 mb-6">
              {searchError}
            </div>
          )}

          {searchData && (
            <MomentumBar
              symbol={searchData.symbol}
              low={searchData.low}
              high={searchData.high}
              current={searchData.current}
              fontSize={fontSize}
            />
          )}

          {!searchData && !searchError && !searchLoading && (
            <div className="text-center py-16 text-2xl font-bold text-gray-600 border-4 border-gray-300">
              Enter a stock symbol to see its 52-week momentum.
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mb-6 flex items-center gap-4 flex-wrap text-lg md:text-xl font-bold text-gray-700">
        <span>Sorted: closest to 52-week LOW first</span>
        <span className="inline-flex items-center gap-2">
          <span className="w-6 h-6 bg-red-500 border-2 border-gray-900 inline-block" /> near low
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-6 h-6 bg-yellow-400 border-2 border-gray-900 inline-block" /> mid
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-6 h-6 bg-green-500 border-2 border-gray-900 inline-block" /> near high
        </span>
      </div>

      {/* Bars (category tabs only) */}
      {selectedCategory !== 'Search' && (
      filteredItems.length === 0 ? (
        <div className="text-center py-16 text-2xl font-bold text-gray-600 border-4 border-gray-300">
          No symbols in {selectedCategory}. Add some from the Watch List tab.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {displayItems.map(item => (
            <MomentumBar
              key={item.symbol}
              symbol={item.symbol}
              low={item.low}
              high={item.high}
              current={item.current}
              fontSize={fontSize}
            />
          ))}
        </div>
      )
      )}
    </div>
  );
}