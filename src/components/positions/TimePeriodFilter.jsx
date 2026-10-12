import React from "react";
import { Button } from "@/components/ui/button";

export default function TimePeriodFilter({ selectedPeriod, onPeriodChange, includeTotal = false }) {
  const periods = includeTotal 
    ? ['TOTAL', '1D', '1W', '1M', '3M', '6M', '1Y']
    : ['1D', '1W', '1M', '3M', '6M', '1Y'];

  return (
    <div className="flex gap-2 md:gap-4 flex-wrap">
      {periods.map((period) => (
        <Button
          key={period}
          onClick={() => onPeriodChange(period)}
          className={`text-xl md:text-3xl h-12 md:h-20 px-4 md:px-10 border-2 md:border-4 rounded-none font-black ${
            selectedPeriod === period
              ? 'bg-gray-300 text-gray-900 border-gray-600'
              : 'bg-white text-gray-900 border-gray-900 hover:bg-gray-100'
          }`}
        >
          {period}
        </Button>
      ))}
    </div>
  );
}