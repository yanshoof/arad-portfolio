import React from "react";

/**
 * A prominent horizontal bar showing 52-week low, current price, and 52-week high.
 * Designed for high readability (large text, strong contrast).
 */
export default function MomentumBar({ symbol, low, high, current, fontSize = 22 }) {
  const hasData = low > 0 && high > 0 && current > 0 && high > low;
  const rawPct = hasData ? ((current - low) / (high - low)) * 100 : 0;
  const pct = Math.max(0, Math.min(100, rawPct));

  const pctFromLow = hasData ? ((current - low) / low) * 100 : 0;
  const pctFromHigh = hasData ? ((current - high) / high) * 100 : 0;

  // Color zones: red near low, yellow middle, green near high
  let zoneColor = "bg-yellow-400";
  let zoneLabel = "MID RANGE";
  if (pct <= 25) {
    zoneColor = "bg-red-500";
    zoneLabel = "NEAR LOW";
  } else if (pct >= 75) {
    zoneColor = "bg-green-500";
    zoneLabel = "NEAR HIGH";
  }

  return (
    <div className="bg-white border-4 border-gray-900 rounded-none shadow-xl p-5 md:p-7">
      {/* Top row: symbol + zone badge + current price */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-4">
          <h3 className="font-black text-gray-900" style={{ fontSize: `${fontSize + 14}px` }}>
            {symbol}
          </h3>
          <span
            className={`${zoneColor} text-gray-900 font-black px-4 py-1 border-4 border-gray-900`}
            style={{ fontSize: `${fontSize}px` }}
          >
            {zoneLabel}
          </span>
        </div>
        <div className="font-black text-gray-900" style={{ fontSize: `${fontSize + 10}px` }}>
          {hasData ? `$${current.toFixed(2)}` : "—"}
        </div>
      </div>

      {/* The scale bar */}
      {hasData ? (
        <div className="relative">
          {/* Track */}
          <div className="relative h-10 md:h-12 bg-gradient-to-r from-red-200 via-yellow-200 to-green-200 border-4 border-gray-900">
            {/* Current price marker */}
            <div
              className="absolute top-0 bottom-0 flex items-center"
              style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
            >
              <div className="w-2 md:w-3 h-full bg-gray-900" />
            </div>
          </div>

          {/* Current price label above marker */}
          <div
            className="absolute -top-8 md:-top-9 bg-gray-900 text-white font-black px-3 py-0.5 whitespace-nowrap"
            style={{
              left: `${pct}%`,
              transform: "translateX(-50%)",
              fontSize: `${fontSize - 4}px`,
            }}
          >
            {pct.toFixed(0)}%
          </div>

          {/* Low / High labels */}
          <div className="flex justify-between mt-3">
            <div className="text-left">
              <div className="font-black text-red-700" style={{ fontSize: `${fontSize}px` }}>
                52W LOW
              </div>
              <div className="font-black text-gray-900" style={{ fontSize: `${fontSize + 2}px` }}>
                ${low.toFixed(2)}
              </div>
              <div className="font-bold text-green-700" style={{ fontSize: `${fontSize - 2}px` }}>
                +{pctFromLow.toFixed(1)}% from low
              </div>
            </div>
            <div className="text-right">
              <div className="font-black text-green-700" style={{ fontSize: `${fontSize}px` }}>
                52W HIGH
              </div>
              <div className="font-black text-gray-900" style={{ fontSize: `${fontSize + 2}px` }}>
                ${high.toFixed(2)}
              </div>
              <div className="font-bold text-red-700" style={{ fontSize: `${fontSize - 2}px` }}>
                {pctFromHigh.toFixed(1)}% from high
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-gray-500 font-bold py-6 text-center" style={{ fontSize: `${fontSize}px` }}>
          Data unavailable
        </div>
      )}
    </div>
  );
}