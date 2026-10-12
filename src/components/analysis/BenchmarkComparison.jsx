import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function BenchmarkComparison({ portfolioData, benchmarkData, fontSize }) {
  if (!portfolioData || !benchmarkData) {
    return null;
  }

  const chartData = portfolioData.map((point, idx) => ({
    date: point.date,
    portfolio: point.return,
    benchmark: benchmarkData[idx]?.return || 0
  }));

  const portfolioReturn = portfolioData[portfolioData.length - 1]?.return || 0;
  const benchmarkReturn = benchmarkData[benchmarkData.length - 1]?.return || 0;
  const outperformance = portfolioReturn - benchmarkReturn;

  return (
    <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl">
      <CardHeader className="bg-orange-50 border-b-4 border-gray-900 p-6">
        <CardTitle className="text-3xl font-black text-gray-900">
          PORTFOLIO VS BENCHMARK (S&P 500)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-100 border-4 border-blue-700 p-4">
            <div className="text-lg font-black text-blue-900">PORTFOLIO RETURN</div>
            <div className="text-4xl font-black text-blue-900 flex items-center gap-2">
              {portfolioReturn >= 0 ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
              {portfolioReturn.toFixed(2)}%
            </div>
          </div>
          <div className="bg-gray-100 border-4 border-gray-700 p-4">
            <div className="text-lg font-black text-gray-900">S&P 500 RETURN</div>
            <div className="text-4xl font-black text-gray-900 flex items-center gap-2">
              {benchmarkReturn >= 0 ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
              {benchmarkReturn.toFixed(2)}%
            </div>
          </div>
          <div className={`border-4 p-4 ${outperformance >= 0 ? 'bg-green-100 border-green-700' : 'bg-red-100 border-red-700'}`}>
            <div className={`text-lg font-black ${outperformance >= 0 ? 'text-green-900' : 'text-red-900'}`}>
              {outperformance >= 0 ? 'OUTPERFORMANCE' : 'UNDERPERFORMANCE'}
            </div>
            <div className={`text-4xl font-black ${outperformance >= 0 ? 'text-green-900' : 'text-red-900'}`}>
              {Math.abs(outperformance).toFixed(2)}%
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ccc" strokeWidth={2} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: Math.max(fontSize - 6, 14), fontWeight: 'bold' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fontSize: Math.max(fontSize - 4, 16), fontWeight: 'bold' }}
              label={{ value: 'Return (%)', angle: -90, position: 'insideLeft', style: { fontSize: fontSize, fontWeight: 'bold' } }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '4px solid #000',
                borderRadius: 0,
                fontSize: `${fontSize}px`,
                fontWeight: 'bold',
                padding: '12px'
              }}
              formatter={(value) => `${value.toFixed(2)}%`}
            />
            <Legend 
              wrapperStyle={{ fontSize: `${fontSize}px`, fontWeight: 'bold' }}
            />
            <Line 
              type="monotone" 
              dataKey="portfolio" 
              stroke="#3b82f6" 
              strokeWidth={4}
              name="Your Portfolio"
              dot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="benchmark" 
              stroke="#6b7280" 
              strokeWidth={4}
              name="S&P 500"
              dot={{ r: 6 }}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}