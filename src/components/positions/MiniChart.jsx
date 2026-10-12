import React from "react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

export default function MiniChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="w-48 h-16 bg-gray-200 border-2 border-gray-400" />;
  }

  const prices = data.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  
  // Add 10% padding to top and bottom
  const yMin = minPrice - (priceRange * 0.1);
  const yMax = maxPrice + (priceRange * 0.1);

  const isPositive = data[data.length - 1]?.price >= data[0]?.price;

  return (
    <div className="w-48 h-16">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={[yMin, yMax]} hide />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke={isPositive ? "#15803d" : "#b91c1c"} 
            strokeWidth={4}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}