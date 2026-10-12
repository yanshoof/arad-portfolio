
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import SortableTableHead from "../components/positions/SortableTableHead";
import SummaryCard from "../components/positions/SummaryCard"; // Added import

export default function EEClosedPositions() {
  const [positions, setPositions] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'sell_date', direction: 'desc' });

  useEffect(() => {
    loadPositions();
  }, []);

  const loadPositions = async () => {
    const data = await base44.entities.EEClosedPosition.list("-sell_date");
    setPositions(data);
  };

  const handleDelete = async (id) => {
    await base44.entities.EEClosedPosition.delete(id);
    await loadPositions();
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const calculatePL = (position) => {
    const multiplier = position.position_type === "OPTION" ? 100 : 1;
    const purchaseTotal = position.purchase_price * position.quantity * multiplier;
    const sellTotal = position.sell_price * position.quantity * multiplier;
    const totalPL = sellTotal - purchaseTotal;
    const percentPL = purchaseTotal !== 0 ? (totalPL / purchaseTotal) * 100 : 0;
    
    return { totalPL, percentPL };
  };

  // New function to calculate summary for a list of positions
  const calculateSummary = (positionsList) => {
    let totalPurchase = 0;
    let totalSale = 0;

    positionsList.forEach((position) => {
      const multiplier = position.position_type === "OPTION" ? 100 : 1;
      totalPurchase += position.purchase_price * position.quantity * multiplier;
      totalSale += position.sell_price * position.quantity * multiplier;
    });

    const totalPL = totalSale - totalPurchase;
    const percentPL = totalPurchase > 0 ? (totalPL / totalPurchase) * 100 : 0;

    return { totalPurchase, totalSale, totalPL, percentPL };
  };

  const getSortedPositions = (positionsList) => {
    const sorted = [...positionsList];
    
    sorted.sort((a, b) => {
      let aVal, bVal;
      
      switch(sortConfig.key) {
        case 'symbol':
          aVal = a.symbol;
          bVal = b.symbol;
          break;
        case 'purchase_date':
          aVal = new Date(a.purchase_date);
          bVal = new Date(b.purchase_date);
          break;
        case 'sell_date':
          aVal = new Date(a.sell_date);
          bVal = new Date(b.sell_date);
          break;
        case 'expiration_date':
          aVal = new Date(a.expiration_date);
          bVal = new Date(b.expiration_date);
          break;
        case 'strike':
          aVal = a.strike || 0;
          bVal = b.strike || 0;
          break;
        case 'purchase_price':
          aVal = a.purchase_price;
          bVal = b.purchase_price;
          break;
        case 'sell_price':
          aVal = a.sell_price;
          bVal = b.sell_price;
          break;
        case 'total_pl':
          const aPL = calculatePL(a);
          const bPL = calculatePL(b);
          aVal = aPL.totalPL;
          bVal = bPL.totalPL;
          break;
        case 'percent_pl':
          const aPercentPL = calculatePL(a);
          const bPercentPL = calculatePL(b);
          aVal = aPercentPL.percentPL;
          bVal = bPercentPL.percentPL;
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

  // Separate positions
  const optionPositions = getSortedPositions(positions.filter(p => p.position_type === "OPTION"));
  const stockPositions = getSortedPositions(positions.filter(p => p.position_type === "STOCK"));

  // Calculate summaries for separated positions
  const optionSummary = calculateSummary(optionPositions);
  const stockSummary = calculateSummary(stockPositions);

  return (
    <div className="p-8 md:p-12 space-y-10 bg-white">
      <div className="flex flex-col items-center">
        <div className="mb-12 w-full max-w-7xl">
          <h1 className="text-5xl font-black text-gray-900 mb-4">E&E Closed Positions</h1>
          <p className="text-2xl text-gray-700 font-bold">Track your completed stock and option trades</p>
        </div>

        {/* Options Summary */}
        {optionPositions.length > 0 && (
          <div className="mb-6">
            <h2 className="text-3xl font-black text-gray-900 mb-4 text-center">OPTIONS SUMMARY</h2>
            <SummaryCard {...optionSummary} compact={true} />
          </div>
        )}

        {/* Options Table */}
        {optionPositions.length > 0 && (
          <div className="mb-10">
            <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl overflow-hidden w-fit">
              <CardHeader className="bg-purple-100 border-b-4 border-gray-900 p-6">
                <CardTitle className="text-3xl font-black text-gray-900">OPTIONS</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="w-auto">
                    <TableHeader>
                      <TableRow className="border-b-4 border-gray-900 hover:bg-transparent bg-gray-100">
                        <SortableTableHead label="Symbol" sortKey="symbol" currentSort={sortConfig} onSort={handleSort} fontSize={20} />
                        <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 text-2xl">Type</TableHead>
                        <SortableTableHead label="Strike" sortKey="strike" currentSort={sortConfig} onSort={handleSort} fontSize={20} />
                        <SortableTableHead label="Expiration" sortKey="expiration_date" currentSort={sortConfig} onSort={handleSort} fontSize={20} />
                        <SortableTableHead label="Buy Premium" sortKey="purchase_price" currentSort={sortConfig} onSort={handleSort} fontSize={20} />
                        <SortableTableHead label="Sell Premium" sortKey="sell_price" currentSort={sortConfig} onSort={handleSort} fontSize={20} />
                        <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 text-2xl">Contracts</TableHead>
                        <SortableTableHead label="Total P&L" sortKey="total_pl" currentSort={sortConfig} onSort={handleSort} fontSize={20} />
                        <SortableTableHead label="% P&L" sortKey="percent_pl" currentSort={sortConfig} onSort={handleSort} fontSize={20} />
                        <TableHead className="text-gray-900 font-black p-4"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {optionPositions.map((position) => {
                        const { totalPL, percentPL } = calculatePL(position);
                        const isProfit = totalPL >= 0;

                        return (
                          <TableRow key={position.id} className="border-b-2 border-gray-300 hover:bg-gray-50">
                            <TableCell className="font-black text-gray-900 p-3 border-r-2 border-gray-300 text-2xl">{position.symbol}</TableCell>
                            <TableCell className="text-gray-900 font-bold p-3 border-r-2 border-gray-300 text-2xl">{position.option_type}</TableCell>
                            <TableCell className="text-gray-900 font-bold p-3 border-r-2 border-gray-300 text-2xl">${position.strike.toFixed(2)}</TableCell>
                            <TableCell className="text-gray-900 font-bold p-3 border-r-2 border-gray-300 text-2xl">{format(new Date(position.expiration_date), "MMM d, yyyy")}</TableCell>
                            <TableCell className="text-gray-900 font-bold p-3 border-r-2 border-gray-300 text-2xl">${position.purchase_price.toFixed(2)}</TableCell>
                            <TableCell className="text-gray-900 font-bold p-3 border-r-2 border-gray-300 text-2xl">${position.sell_price.toFixed(2)}</TableCell>
                            <TableCell className="text-gray-900 font-bold p-3 border-r-2 border-gray-300 text-2xl">{Math.round(position.quantity)}</TableCell>
                            <TableCell className={`font-black p-3 border-r-2 border-gray-300 text-2xl ${isProfit ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                              {isProfit ? '+' : ''}${Math.round(totalPL)}
                            </TableCell>
                            <TableCell className={`font-black p-3 border-r-2 border-gray-300 text-2xl ${isProfit ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                              {isProfit ? '+' : ''}{percentPL.toFixed(2)}%
                            </TableCell>
                            <TableCell className="p-3">
                              <Button
                                variant="ghost"
                                size="lg"
                                onClick={() => handleDelete(position.id)}
                                className="hover:bg-red-100 text-red-700 hover:text-red-900 h-12 w-12 border-4 border-red-700 rounded-none"
                              >
                                <Trash2 className="w-6 h-6" />
                              </Button>
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

        {/* Stocks Summary */}
        {stockPositions.length > 0 && (
          <div className="mb-6 mt-10">
            <h2 className="text-3xl font-black text-gray-900 mb-4 text-center">STOCKS SUMMARY</h2>
            <SummaryCard {...stockSummary} compact={true} />
          </div>
        )}

        {/* Stocks Table */}
        {stockPositions.length > 0 && (
          <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl overflow-hidden w-fit">
            <CardHeader className="bg-blue-100 border-b-4 border-gray-900 p-6">
              <CardTitle className="text-3xl font-black text-gray-900">STOCKS</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="w-auto">
                  <TableHeader>
                    <TableRow className="border-b-4 border-gray-900 hover:bg-transparent bg-gray-100">
                      <SortableTableHead label="Symbol" sortKey="symbol" currentSort={sortConfig} onSort={handleSort} fontSize={20} />
                      <SortableTableHead label="Purchase Price" sortKey="purchase_price" currentSort={sortConfig} onSort={handleSort} fontSize={20} />
                      <SortableTableHead label="Sell Price" sortKey="sell_price" currentSort={sortConfig} onSort={handleSort} fontSize={20} />
                      <SortableTableHead label="Purchase Date" sortKey="purchase_date" currentSort={sortConfig} onSort={handleSort} fontSize={20} />
                      <SortableTableHead label="Sell Date" sortKey="sell_date" currentSort={sortConfig} onSort={handleSort} fontSize={20} />
                      <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 text-2xl">Quantity</TableHead>
                      <SortableTableHead label="Total P&L" sortKey="total_pl" currentSort={sortConfig} onSort={handleSort} fontSize={20} />
                      <SortableTableHead label="% P&L" sortKey="percent_pl" currentSort={sortConfig} onSort={handleSort} fontSize={20} />
                      <TableHead className="text-gray-900 font-black p-4"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockPositions.map((position) => {
                      const { totalPL, percentPL } = calculatePL(position);
                      const isProfit = totalPL >= 0;

                      return (
                        <TableRow key={position.id} className="border-b-2 border-gray-300 hover:bg-gray-50">
                          <TableCell className="font-black text-gray-900 p-3 border-r-2 border-gray-300 text-2xl">{position.symbol}</TableCell>
                          <TableCell className="text-gray-900 font-bold p-3 border-r-2 border-gray-300 text-2xl">${position.purchase_price.toFixed(2)}</TableCell>
                          <TableCell className="text-gray-900 font-bold p-3 border-r-2 border-gray-300 text-2xl">${position.sell_price.toFixed(2)}</TableCell>
                          <TableCell className="text-gray-900 font-bold p-3 border-r-2 border-gray-300 text-2xl">{format(new Date(position.purchase_date), "MMM d, yyyy")}</TableCell>
                          <TableCell className="text-gray-900 font-bold p-3 border-r-2 border-gray-300 text-2xl">{format(new Date(position.sell_date), "MMM d, yyyy")}</TableCell>
                          <TableCell className="text-gray-900 font-bold p-3 border-r-2 border-gray-300 text-2xl">{Math.round(position.quantity)}</TableCell>
                          <TableCell className={`font-black p-3 border-r-2 border-gray-300 text-2xl ${isProfit ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                            {isProfit ? '+' : ''}${Math.round(totalPL)}
                          </TableCell>
                          <TableCell className={`font-black p-3 border-r-2 border-gray-300 text-2xl ${isProfit ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                            {isProfit ? '+' : ''}{percentPL.toFixed(2)}%
                          </TableCell>
                          <TableCell className="p-3">
                            <Button
                              variant="ghost"
                              size="lg"
                              onClick={() => handleDelete(position.id)}
                              className="hover:bg-red-100 text-red-700 hover:text-red-900 h-12 w-12 border-4 border-red-700 rounded-none"
                            >
                              <Trash2 className="w-6 h-6" />
                            </Button>
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

        {positions.length === 0 && (
          <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl">
            <CardContent className="p-16 text-center">
              <p className="text-3xl font-bold text-gray-700">No closed positions yet. Add your first closed position in the Add Position tab.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
