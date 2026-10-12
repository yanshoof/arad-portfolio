import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function PerformanceAttribution({ data, fontSize }) {
  if (!data || data.length === 0) {
    return null;
  }

  const COLORS = {
    positive: '#10b981',
    negative: '#ef4444'
  };

  return (
    <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl">
      <CardHeader className="bg-purple-50 border-b-4 border-gray-900 p-6">
        <CardTitle className="text-3xl font-black text-gray-900">
          PERFORMANCE ATTRIBUTION BY STOCK
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ccc" strokeWidth={2} />
            <XAxis 
              dataKey="symbol" 
              tick={{ fontSize: Math.max(fontSize - 6, 14), fontWeight: 'bold' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fontSize: Math.max(fontSize - 4, 16), fontWeight: 'bold' }}
              label={{ value: 'P&L ($)', angle: -90, position: 'insideLeft', style: { fontSize: fontSize, fontWeight: 'bold' } }}
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
              formatter={(value) => [`$${value.toFixed(2)}`, 'P&L']}
            />
            <Bar dataKey="pnl" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? COLORS.positive : COLORS.negative} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}