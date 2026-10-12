import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function OpenPositionSummaryCard({
  totalCurrent,
  totalPL,
  percentPL,
  dailyPL,
  dailyPercentPL
}) {
  const isProfit = totalPL >= 0;
  const isDailyProfit = dailyPL >= 0;

  return (
    <Card className="bg-card text-card-foreground bg-gradient-to-br from-blue-50 to-blue-100 border-1 border-blue-600 shadow-2xl rounded-none mb-6 md:mb-10 w-full md:w-fit mx-auto">
      <CardContent className="bg-gray-300 p-4 md:p-10">
        {/* Mobile: Stack vertically, Desktop: Grid */}
        <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-10">
          <div className="bg-white p-4 md:p-6 border-4 border-gray-900 rounded-none">
            <p className="text-2xl md:text-4xl text-gray-700 mb-2 md:mb-3 font-black">Total $$</p>
            <p className="text-3xl md:text-5xl font-black text-gray-900">
              ${Math.round(totalCurrent).toLocaleString()}
            </p>
          </div>
          
          <div className={`p-4 md:p-6 border-4 rounded-none ${isDailyProfit ? 'bg-green-100 border-green-700' : 'bg-red-100 border-red-700'}`}>
            <p className="text-2xl md:text-4xl mb-2 md:mb-3 font-black" style={{ color: isDailyProfit ? '#15803d' : '#b91c1c' }}>Daily P&L</p>
            <div className="flex items-center gap-3 md:gap-4">
              <p className={`text-3xl md:text-5xl font-black ${isDailyProfit ? 'text-green-700' : 'text-red-700'}`}>
                {isDailyProfit ? '+' : ''}${Math.round(dailyPL).toLocaleString()}
              </p>
            </div>
          </div>

          <div className={`p-4 md:p-6 border-4 rounded-none ${isDailyProfit ? 'bg-green-100 border-green-700' : 'bg-red-100 border-red-700'}`}>
            <p className="text-2xl md:text-4xl mb-2 md:mb-3 font-black" style={{ color: isDailyProfit ? '#15803d' : '#b91c1c' }}>Daily %</p>
            <p className={`text-3xl md:text-5xl font-black ${isDailyProfit ? 'text-green-700' : 'text-red-700'}`}>
              {isDailyProfit ? '+' : ''}{dailyPercentPL.toFixed(2)}%
            </p>
          </div>
          
          <div className={`p-4 md:p-6 border-4 rounded-none ${isProfit ? 'bg-green-100 border-green-700' : 'bg-red-100 border-red-700'}`}>
            <p className="text-2xl md:text-4xl mb-2 md:mb-3 font-black" style={{ color: isProfit ? '#15803d' : '#b91c1c' }}>Total P&L</p>
            <div className="flex items-center gap-3 md:gap-4">
              <p className={`text-3xl md:text-5xl font-black ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
                {isProfit ? '+' : ''}${Math.round(totalPL).toLocaleString()}
              </p>
              {isProfit ? (
                <TrendingUp className="w-8 h-8 md:w-12 md:h-12 text-green-700" />
              ) : (
                <TrendingDown className="w-8 h-8 md:w-12 md:h-12 text-red-700" />
              )}
            </div>
          </div>

          <div className={`p-4 md:p-6 border-4 rounded-none ${isProfit ? 'bg-green-100 border-green-700' : 'bg-red-100 border-red-700'}`}>
            <p className="text-2xl md:text-4xl mb-2 md:mb-3 font-black" style={{ color: isProfit ? '#15803d' : '#b91c1c' }}>Total P&L %</p>
            <p className={`text-3xl md:text-5xl font-black ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
              {isProfit ? '+' : ''}{(percentPL || 0).toFixed(2)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}