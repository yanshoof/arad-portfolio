import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw } from "lucide-react";
import FontSizeSlider from "../components/positions/FontSizeSlider";

const INDEXES = [
  { symbol: "DIA", name: "Dow Jones (DIA)" },
  { symbol: "SPY", name: "S&P 500 (SPY)" },
  { symbol: "QQQ", name: "Nasdaq (QQQ)" },
  { symbol: "IWM", name: "Russell 2000 (IWM)" },
  { symbol: "UUP", name: "Dollar Index (UUP)" },
];

export default function Indexes() {
  const [indexData, setIndexData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('indexesFontSize');
    return saved ? parseInt(saved) : 24;
  });

  useEffect(() => {
    localStorage.setItem('indexesFontSize', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    fetchIndexPrices();
  }, []);

  const fetchIndexPrices = async () => {
    setIsLoading(true);
    try {
      const { data } = await base44.functions.invoke('getIndexPrices', {});
      
      if (data && data.prices) {
        const combined = {};
        INDEXES.forEach(index => {
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
    setIsLoading(false);
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-6 md:space-y-10 bg-white">
      <div className="px-3 max-w-full">
        {/* Header */}
        <div className="mb-8 md:mb-12 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6">
            <div className="flex-shrink-0">
              <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-2 md:mb-4">Indexes</h1>
              <p className="text-lg md:text-2xl text-gray-700 font-bold">Major market indices</p>
            </div>
            <FontSizeSlider value={fontSize} onChange={setFontSize} />
            <Button
              onClick={fetchIndexPrices}
              disabled={isLoading}
              className="flex-shrink-0 w-full md:w-auto bg-green-600 hover:bg-green-700 text-white text-xl md:text-2xl h-14 md:h-16 px-6 md:px-8 border-4 border-green-800 rounded-none shadow-xl font-black"
            >
              <RefreshCw className={`w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? "FETCHING..." : "REFRESH"}
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card className="bg-white border-4 md:border-8 border-gray-900 rounded-none shadow-2xl overflow-hidden w-full md:w-fit md:mx-auto">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="w-full md:w-auto">
                <TableHeader>
                  <TableRow className="border-b-4 border-gray-900 hover:bg-transparent bg-gray-100">
                    <TableHead 
                      className="text-gray-900 font-black p-4 border-r-2 border-gray-300 bg-green-100" 
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      Index
                    </TableHead>
                    <TableHead 
                      className="text-gray-900 font-black p-4 border-r-2 border-gray-300 bg-green-100 text-right" 
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      Price
                    </TableHead>
                    <TableHead 
                      className="text-gray-900 font-black p-4 border-r-2 border-gray-300 bg-green-100 text-right" 
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      Change
                    </TableHead>
                    <TableHead 
                      className="text-gray-900 font-black p-4 bg-green-100 text-right" 
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      Change %
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {INDEXES.map((index) => {
                    const data = indexData[index.symbol];
                    const isPositive = data?.change >= 0;
                    const changeColor = data?.change !== 0 
                      ? (isPositive ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50')
                      : 'text-gray-900';
                    
                    return (
                      <TableRow key={index.symbol} className="border-b-2 border-gray-300 hover:bg-gray-50 h-16">
                        <TableCell 
                          className="font-black text-gray-900 p-3 border-r-2 border-gray-300" 
                          style={{ fontSize: `${fontSize}px` }}
                        >
                          {index.name}
                        </TableCell>
                        <TableCell 
                          className="font-bold p-3 border-r-2 border-gray-300 text-gray-900 bg-gray-100 text-right" 
                          style={{ fontSize: `${fontSize}px` }}
                        >
                          {data?.price ? data.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : isLoading ? "..." : "—"}
                        </TableCell>
                        <TableCell 
                          className={`font-black p-3 border-r-2 border-gray-300 text-right ${changeColor}`} 
                          style={{ fontSize: `${fontSize}px` }}
                        >
                          {data?.change !== undefined 
                            ? `${isPositive ? '+' : ''}${data.change.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : "—"}
                        </TableCell>
                        <TableCell 
                          className={`font-black p-3 text-right ${changeColor}`} 
                          style={{ fontSize: `${fontSize}px` }}
                        >
                          {data?.changePercent !== undefined 
                            ? `${isPositive ? '+' : ''}${data.changePercent.toFixed(2)}%`
                            : "—"}
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
    </div>
  );
}