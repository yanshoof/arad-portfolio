import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CorrelationMatrix({ correlationData, fontSize }) {
  if (!correlationData || correlationData.length === 0) {
    return null;
  }

  const getColor = (correlation) => {
    if (correlation > 0.7) return 'bg-blue-700 text-white';
    if (correlation > 0.4) return 'bg-blue-500 text-white';
    if (correlation > 0.1) return 'bg-blue-300 text-gray-900';
    if (correlation > -0.1) return 'bg-gray-300 text-gray-900';
    if (correlation > -0.4) return 'bg-red-300 text-gray-900';
    if (correlation > -0.7) return 'bg-red-500 text-white';
    return 'bg-red-700 text-white';
  };

  return (
    <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl">
      <CardHeader className="bg-blue-50 border-b-4 border-gray-900 p-6">
        <CardTitle className="text-3xl font-black text-gray-900">
          ASSET CORRELATION MATRIX
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border-4 border-gray-900 p-2 bg-gray-200"></th>
                {correlationData.map((item) => (
                  <th key={item.symbol} className="border-4 border-gray-900 p-2 bg-gray-200 font-black" style={{ fontSize: `${Math.max(fontSize - 6, 14)}px` }}>
                    {item.symbol}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {correlationData.map((row) => (
                <tr key={row.symbol}>
                  <td className="border-4 border-gray-900 p-2 bg-gray-200 font-black" style={{ fontSize: `${Math.max(fontSize - 6, 14)}px` }}>
                    {row.symbol}
                  </td>
                  {correlationData.map((col) => {
                    const correlation = row.correlations[col.symbol] || 0;
                    return (
                      <td
                        key={col.symbol}
                        className={`border-4 border-gray-900 p-3 font-bold text-center ${getColor(correlation)} transition-all hover:scale-110 cursor-pointer`}
                        title={`${row.symbol} vs ${col.symbol}: ${correlation.toFixed(2)}`}
                        style={{ fontSize: `${Math.max(fontSize - 8, 12)}px` }}
                      >
                        {correlation.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-700 border-2 border-gray-900"></div>
            <span className="font-bold">-1.0 (Negative)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-300 border-2 border-gray-900"></div>
            <span className="font-bold">0.0 (None)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-700 border-2 border-gray-900"></div>
            <span className="font-bold">+1.0 (Positive)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}