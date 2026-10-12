import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, Lock, Unlock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SummaryCard from "../components/positions/SummaryCard";
import FontSizeSlider from "../components/positions/FontSizeSlider";

const COLORS = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];

export default function Summary() {
  const [closedPositions, setClosedPositions] = useState([]);
  const [openPositions, setOpenPositions] = useState([]);
  const [currentPrices, setCurrentPrices] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('summaryFontSize');
    return saved ? parseInt(saved) : 24;
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem('summaryFontSize', fontSize.toString());
  }, [fontSize]);

  const loadData = async () => {
    setIsLoading(true);
    const closed = await base44.entities.ClosedPosition.list();
    const open = await base44.entities.OpenPosition.list();
    setClosedPositions(closed);
    setOpenPositions(open);

    if (open.length > 0) {
      await fetchCurrentPrices(open);
    }
    setIsLoading(false);
  };

  const fetchCurrentPrices = async (openPos) => {
    setIsFetchingPrices(true);
    const symbols = [...new Set(openPos.map((p) => p.symbol))];

    try {
      const { data } = await base44.functions.invoke('getCurrentPrices', { symbols });

      if (data && data.prices) {
        setCurrentPrices(data.prices);
      }
    } catch (error) {
      console.error("Error fetching prices:", error);
    }
    setIsFetchingPrices(false);
  };

  const getCurrentPrice = (position) => {
    const price = currentPrices[position.symbol];
    if (price && typeof price === 'number' && price > 0) {
      return price;
    }
    return Number(position.purchase_price) || 0;
  };

  const calculateClosedSummary = () => {
    let totalPurchase = 0;
    let totalSale = 0;

    closedPositions.forEach((position) => {
      totalPurchase += Number(position.purchase_price) * Number(position.quantity);
      totalSale += Number(position.sell_price) * Number(position.quantity);
    });

    const totalPL = totalSale - totalPurchase;
    const percentPL = totalPurchase > 0 ? totalPL / totalPurchase * 100 : 0;

    return { totalPurchase, totalSale, totalPL, percentPL };
  };

  const calculateOpenSummary = () => {
    let totalPurchase = 0;
    let totalCurrent = 0;

    openPositions.forEach((position) => {
      const currentPrice = getCurrentPrice(position);
      totalPurchase += Number(position.purchase_price) * Number(position.quantity);
      totalCurrent += currentPrice * Number(position.quantity);
    });

    const totalPL = totalCurrent - totalPurchase;
    const percentPL = totalPurchase > 0 ? totalPL / totalPurchase * 100 : 0;

    return { totalPurchase, totalSale: totalCurrent, totalPL, percentPL };
  };

  const getPortfolioComposition = () => {
    const composition = {};
    let totalValue = 0;

    openPositions.forEach((position) => {
      const currentPrice = getCurrentPrice(position);
      const value = currentPrice * Number(position.quantity);

      if (composition[position.symbol]) {
        composition[position.symbol] += value;
      } else {
        composition[position.symbol] = value;
      }
      totalValue += value;
    });

    return Object.entries(composition).
    map(([symbol, value]) => ({
      name: symbol,
      value: value,
      percentage: totalValue > 0 ? (value / totalValue * 100) : 0,
      totalValue: totalValue
    })).
    sort((a, b) => b.value - a.value);
  };

  const closedSummary = calculateClosedSummary();
  const openSummary = calculateOpenSummary();
  const barData = getPortfolioComposition();

  const CustomBarLabel = (props) => {
    const { x, y, width, value, name } = props;
    return (
      <g>
        <text
          x={x + width / 2}
          y={y - 45}
          fill="#1f2937"
          textAnchor="middle"
          style={{ fontSize: `${fontSize}px` }}
          className="font-black">
          {name}
        </text>
        <text
          x={x + width / 2}
          y={y - 10}
          fill="#1f2937"
          textAnchor="middle"
          style={{ fontSize: `${fontSize}px` }}
          className="font-black">
          {value?.toFixed(1)}%
        </text>
      </g>
    );
  };

  return (
    <div className="p-8 md:p-12 space-y-10 bg-white">
      <div className="max-w-full mx-auto">
        <div className="mb-12 flex justify-between items-center gap-6">
          <div>
            <h1 className="text-5xl font-black text-gray-900 mb-4">Summary & Statistics</h1>
            <p className="text-2xl text-gray-700 font-bold">Overview of your portfolio performance</p>
          </div>
          <FontSizeSlider value={fontSize} onChange={setFontSize} />
          <Button
            onClick={() => fetchCurrentPrices(openPositions)}
            disabled={isFetchingPrices || openPositions.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white text-3xl h-24 px-10 border-4 border-green-800 rounded-none shadow-xl font-black">

            <RefreshCw className={`w-10 h-10 mr-4 ${isFetchingPrices ? 'animate-spin' : ''}`} />
            {isFetchingPrices ? "FETCHING..." : "REFRESH"}
          </Button>
        </div>

        {isFetchingPrices &&
        <Alert className="mb-10 bg-gray-100 border-8 border-gray-600 rounded-none">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-900" />
            <AlertDescription className="text-2xl font-bold text-gray-900">Fetching current stock prices from the internet...</AlertDescription>
          </Alert>
        }

        <div className="grid lg:grid-cols-2 gap-10 mb-10">
          <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl">
            <CardHeader className="flex flex-col space-y-1.5 p-8 bg-purple-50 border-b-1 border-gray-900">
              <CardTitle className="flex items-center gap-4 text-gray-900 text-4xl font-black">
                <Lock className="w-10 h-10 text-purple-600" />
                Closed Positions Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 p-6 opacity-100">
              <SummaryCard {...closedSummary} compact={true} />
            </CardContent>
          </Card>

          <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl">
            <CardHeader className="flex flex-col space-y-1.5 p-8 bg-green-50 border-b-1 border-gray-900">
              <CardTitle className="flex items-center gap-4 text-gray-900 text-4xl font-black">
                <Unlock className="w-10 h-10 text-green-600" />
                Open Positions Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="">
              <SummaryCard {...openSummary} compact={true} />
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl">
          <CardHeader className="p-8 bg-blue-50 border-b-4 border-gray-900">
            <CardTitle className="flex items-center gap-4 text-gray-900 text-4xl font-black">
              <TrendingUp className="w-10 h-10 text-blue-600" />
              Portfolio Composition
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            {barData.length > 0 ?
            <div className="h-[700px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 100, right: 30, left: 30, bottom: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" strokeWidth={2} />
                    <XAxis
                    dataKey="name"
                    tick={{ fontSize: fontSize, fontWeight: 'bold', fill: '#1f2937' }}
                    stroke="#1f2937"
                    strokeWidth={3}
                    angle={0}
                    textAnchor="middle"
                    height={80} />

                    <YAxis
                    tick={{ fontSize: fontSize, fontWeight: 'bold', fill: '#1f2937' }}
                    stroke="#1f2937"
                    strokeWidth={3}
                    label={{
                      value: 'Portfolio %',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fontSize: fontSize, fontWeight: 'bold', fill: '#1f2937' }
                    }} />

                    <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '4px solid #1f2937',
                      borderRadius: '0',
                      color: '#1f2937',
                      fontSize: `${fontSize}px`,
                      fontWeight: 'bold',
                      padding: '16px'
                    }}
                    formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Portfolio %']}
                    labelStyle={{ fontSize: `${fontSize}px`, fontWeight: 'black', marginBottom: '8px' }} />

                    <Bar dataKey="percentage" label={<CustomBarLabel />}>
                      {barData.map((entry, index) =>
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    )}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div> :

            <div className="h-[700px] flex items-center justify-center text-gray-700 text-4xl font-bold">
                No open positions to display
              </div>
            }
          </CardContent>
        </Card>
      </div>
    </div>);

}