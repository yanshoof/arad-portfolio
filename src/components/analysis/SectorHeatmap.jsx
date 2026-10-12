import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SectorHeatmap({ data, fontSize }) {
  if (!data || data.length === 0) {
    return null;
  }

  const maxValue = Math.max(...data.map(d => d.percentage));
  const minValue = Math.min(...data.map(d => d.percentage));

  const getColor = (percentage) => {
    const normalized = maxValue > minValue ? (percentage - minValue) / (maxValue - minValue) : 0.5;
    if (normalized > 0.7) return 'bg-green-700 text-white';
    if (normalized > 0.5) return 'bg-green-500 text-white';
    if (normalized > 0.3) return 'bg-yellow-500 text-gray-900';
    if (normalized > 0.1) return 'bg-orange-500 text-white';
    return 'bg-red-500 text-white';
  };

  // Organize into grid
  const gridSize = Math.ceil(Math.sqrt(data.length));
  const gridData = [];
  for (let i = 0; i < data.length; i += gridSize) {
    gridData.push(data.slice(i, i + gridSize));
  }

  return (
    <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl">
      <CardHeader className="bg-green-50 border-b-4 border-gray-900 p-6">
        <CardTitle className="text-3xl font-black text-gray-900">
          SECTOR EXPOSURE HEATMAP
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-2">
          {gridData.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-2">
              {row.map((sector, colIdx) => (
                <div
                  key={colIdx}
                  className={`flex-1 p-4 border-4 border-gray-900 ${getColor(sector.percentage)} transition-all hover:scale-105 cursor-pointer`}
                  title={`${sector.name}: ${sector.percentage.toFixed(1)}%`}
                >
                  <div className="font-black text-center" style={{ fontSize: `${Math.max(fontSize - 4, 16)}px` }}>
                    {sector.name}
                  </div>
                  <div className="font-bold text-center mt-1" style={{ fontSize: `${Math.max(fontSize - 8, 14)}px` }}>
                    {sector.percentage.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-500 border-2 border-gray-900"></div>
            <span className="font-bold">Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-500 border-2 border-gray-900"></div>
            <span className="font-bold">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-700 border-2 border-gray-900"></div>
            <span className="font-bold">High</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}