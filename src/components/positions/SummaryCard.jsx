import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function SummaryCard({
  totalPurchase,
  totalSale,
  totalPL,
  percentPL,
  compact = false
}) {
  const isProfit = totalPL >= 0;

  return (
    <Card className="bg-card text-card-foreground bg-gradient-to-br from-blue-50 to-blue-100 border-4 border-blue-600 shadow-2xl rounded-none mb-10 w-full max-w-6xl mx-auto">
      <CardContent className="bg-gray-300 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-4 rounded-none border-4 border-gray-900">
            <p className="text-gray-700 mb-2 text-2xl font-black text-center">Total $$</p>
            <p className="text-gray-900 text-3xl font-black text-center">
              ${Math.round(totalPurchase).toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-none border-4 border-gray-900">
            <p className="text-gray-700 mb-2 text-2xl font-black text-center">Total Sale</p>
            <p className="text-gray-900 text-3xl font-black text-center">
              ${Math.round(totalSale).toLocaleString()}
            </p>
          </div>
          
          <div className="bg-green-100 p-4 rounded-none border-4 border-green-700">
            <p className="mb-2 text-2xl font-black text-center" style={{ color: isProfit ? '#15803d' : '#b91c1c' }}>Total P&L</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-green-700 text-3xl font-black text-center">
                {isProfit ? '+' : ''}${Math.round(totalPL).toLocaleString()}
              </p>
              {isProfit ? (
                <TrendingUp className="w-8 h-8 text-green-700 flex-shrink-0" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-700 flex-shrink-0" />
              )}
            </div>
          </div>
          
          <div className="bg-green-100 p-4 rounded-none border-4 border-green-700">
            <p className="mb-2 text-2xl font-black text-center" style={{ color: isProfit ? '#15803d' : '#b91c1c' }}>P&L %</p>
            <p className="text-green-700 text-3xl font-black text-center">
              {isProfit ? '+' : ''}{percentPL.toFixed(2)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}