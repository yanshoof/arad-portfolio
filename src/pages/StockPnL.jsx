import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import SortableTableHead from "../components/positions/SortableTableHead";
import FontSizeSlider from "../components/positions/FontSizeSlider";

export default function StockPnL() {
  const [closedPositions, setClosedPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'symbol', direction: 'asc' });
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('stockPnLFontSize');
    return saved ? parseInt(saved) : 20;
  });

  useEffect(() => {
    loadPositions();
  }, []);

  useEffect(() => {
    localStorage.setItem('stockPnLFontSize', fontSize.toString());
  }, [fontSize]);

  const loadPositions = async () => {
    setIsLoading(true);
    try {
      const data = await base44.entities.ClosedPosition.list();
      setClosedPositions(data);
    } catch (error) {
      console.error("Error loading closed positions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Group positions by symbol and calculate totals
  const stockSummary = closedPositions.reduce((acc, position) => {
    const symbol = position.symbol;
    const purchaseCost = Number(position.purchase_price) * Number(position.quantity);
    const saleRevenue = Number(position.sell_price) * Number(position.quantity);
    const pl = saleRevenue - purchaseCost;

    if (!acc[symbol]) {
      acc[symbol] = {
        symbol,
        totalPurchaseCost: 0,
        totalSaleRevenue: 0,
        totalPL: 0,
        totalQuantity: 0,
        tradeCount: 0
      };
    }

    acc[symbol].totalPurchaseCost += purchaseCost;
    acc[symbol].totalSaleRevenue += saleRevenue;
    acc[symbol].totalPL += pl;
    acc[symbol].totalQuantity += Number(position.quantity);
    acc[symbol].tradeCount += 1;

    return acc;
  }, {});

  const stockArray = Object.values(stockSummary);

  // Calculate total portfolio summary
  const portfolioSummary = stockArray.reduce((acc, stock) => {
    acc.totalPurchaseCost += stock.totalPurchaseCost;
    acc.totalSaleRevenue += stock.totalSaleRevenue;
    acc.totalPL += stock.totalPL;
    return acc;
  }, { totalPurchaseCost: 0, totalSaleRevenue: 0, totalPL: 0 });

  const portfolioPercentPL = portfolioSummary.totalPurchaseCost > 0
    ? (portfolioSummary.totalPL / portfolioSummary.totalPurchaseCost) * 100
    : 0;

  // Sort the array
  const sortedStocks = [...stockArray].sort((a, b) => {
    let aVal, bVal;

    switch (sortConfig.key) {
      case 'symbol':
        aVal = a.symbol;
        bVal = b.symbol;
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      case 'total_pl':
        aVal = a.totalPL;
        bVal = b.totalPL;
        break;
      case 'percent_pl':
        aVal = a.totalPurchaseCost > 0 ? (a.totalPL / a.totalPurchaseCost) * 100 : 0;
        bVal = b.totalPurchaseCost > 0 ? (b.totalPL / b.totalPurchaseCost) * 100 : 0;
        break;
      case 'trade_count':
        aVal = a.tradeCount;
        bVal = b.tradeCount;
        break;
      default:
        return 0;
    }

    return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
  });

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-6 md:space-y-10 bg-white">
      <div className="flex flex-col items-center">
        {/* Header */}
        <div className="w-full mb-6 flex flex-col md:flex-row justify-center md:justify-between items-center gap-4 md:gap-6">
          <h1 className="text-gray-900 text-3xl md:text-5xl font-black text-center md:text-left">Stock P&L Summary</h1>
          <Button
            onClick={loadPositions}
            disabled={isLoading}
            className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white text-xl md:text-2xl h-14 md:h-16 px-6 md:px-8 border-4 border-green-800 rounded-none shadow-xl font-black"
          >
            <RefreshCw className={`w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? "LOADING..." : "REFRESH"}
          </Button>
        </div>

        {/* Font Size Control */}
        <div className="w-full md:w-auto mb-6">
          <FontSizeSlider value={fontSize} onChange={setFontSize} />
        </div>

        {/* Portfolio Summary Card */}
        <Card className="bg-white border-4 md:border-8 border-gray-900 rounded-none shadow-2xl mb-6 md:mb-10 w-full md:w-auto">
          <CardContent className="p-4 md:p-8">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-4">Total Portfolio Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 border-4 border-blue-200 rounded-none">
                <p className="text-lg md:text-xl text-blue-700 font-bold mb-1">Total Purchase Cost</p>
                <p className="text-2xl md:text-3xl font-black text-blue-900">${Math.round(portfolioSummary.totalPurchaseCost).toLocaleString()}</p>
              </div>
              <div className="bg-purple-50 p-4 border-4 border-purple-200 rounded-none">
                <p className="text-lg md:text-xl text-purple-700 font-bold mb-1">Total Sale Revenue</p>
                <p className="text-2xl md:text-3xl font-black text-purple-900">${Math.round(portfolioSummary.totalSaleRevenue).toLocaleString()}</p>
              </div>
              <div className={`p-4 border-4 rounded-none ${portfolioSummary.totalPL >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <p className={`text-lg md:text-xl font-bold mb-1 ${portfolioSummary.totalPL >= 0 ? 'text-green-700' : 'text-red-700'}`}>Total P&L</p>
                <p className={`text-2xl md:text-3xl font-black ${portfolioSummary.totalPL >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  {portfolioSummary.totalPL >= 0 ? '+' : ''}${Math.round(portfolioSummary.totalPL).toLocaleString()} ({portfolioSummary.totalPL >= 0 ? '+' : ''}{portfolioPercentPL.toFixed(2)}%)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Table */}
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
                      <SortableTableHead
                        label="Trades"
                        sortKey="trade_count"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        fontSize={fontSize}
                      />
                      <TableHead className="bg-green-100 text-green-900 font-black border-r-2 border-gray-300 leading-tight whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, lineHeight: '1.3', paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                        <span className="leading-tight">Total Shares</span>
                      </TableHead>
                      <TableHead className="bg-green-100 text-green-900 font-black border-r-2 border-gray-300 leading-tight whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, lineHeight: '1.3', paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                        <span className="leading-tight">Purchase Cost</span>
                      </TableHead>
                      <TableHead className="bg-green-100 text-green-900 font-black border-r-2 border-gray-300 leading-tight whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, lineHeight: '1.3', paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                        <span className="leading-tight">Sale Revenue</span>
                      </TableHead>
                      <SortableTableHead
                        label="Total P&L"
                        sortKey="total_pl"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        fontSize={fontSize}
                      />
                      <SortableTableHead
                        label="P&L %"
                        sortKey="percent_pl"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        fontSize={fontSize}
                      />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedStocks.map((stock) => {
                      const percentPL = stock.totalPurchaseCost > 0
                        ? (stock.totalPL / stock.totalPurchaseCost) * 100
                        : 0;
                      const isProfit = stock.totalPL >= 0;

                      return (
                        <TableRow key={stock.symbol} className="border-b-2 border-gray-300 hover:bg-gray-50">
                          <TableCell className="font-black text-gray-900 border-r-2 border-gray-300 text-left whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                            {stock.symbol}
                          </TableCell>
                          <TableCell className="text-gray-900 font-bold border-r-2 border-gray-300 text-center whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                            {stock.tradeCount}
                          </TableCell>
                          <TableCell className="text-gray-900 font-bold border-r-2 border-gray-300 text-center whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                            {Math.round(stock.totalQuantity)}
                          </TableCell>
                          <TableCell className="text-gray-900 font-bold border-r-2 border-gray-300 text-center whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                            ${Math.round(stock.totalPurchaseCost).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-gray-900 font-bold border-r-2 border-gray-300 text-center whitespace-nowrap px-3" style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                            ${Math.round(stock.totalSaleRevenue).toLocaleString()}
                          </TableCell>
                          <TableCell className={`font-black border-r-2 border-gray-300 text-center whitespace-nowrap px-3 ${isProfit ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`} style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                            {isProfit ? '+' : ''}${Math.round(stock.totalPL).toLocaleString()}
                          </TableCell>
                          <TableCell className={`font-black border-r-2 border-gray-300 text-center whitespace-nowrap px-3 ${isProfit ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`} style={{ fontSize: `${fontSize}px`, paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}>
                            {isProfit ? '+' : ''}{percentPL.toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {stockArray.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-700 font-bold py-16" style={{ fontSize: `${fontSize + 4}px` }}>
                          No closed positions yet. Close some positions to see stock-level P&L.
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
    </div>
  );
}