import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO, differenceInCalendarDays, isToday, isTomorrow } from "date-fns";

const HOUR_LABELS = {
  bmo: "Before Open",
  amc: "After Close",
  dmh: "During Hours",
};

function getDaysUntil(dateStr) {
  const d = parseISO(dateStr);
  return differenceInCalendarDays(d, new Date());
}

function getUrgencyStyle(days) {
  if (days <= 0) return "bg-red-600 text-white";
  if (days <= 3) return "bg-orange-500 text-white";
  if (days <= 7) return "bg-yellow-400 text-gray-900";
  return "bg-gray-100 text-gray-900";
}

function getDateLabel(dateStr) {
  const d = parseISO(dateStr);
  if (isToday(d)) return "TODAY";
  if (isTomorrow(d)) return "TOMORROW";
  return format(d, "MMM d, yyyy");
}

export default function EarningsCalendar() {
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('getEarningsCalendar', {});
      if (data?.earnings) {
        setEarnings(data.earnings);
        setLastFetched(new Date());
      }
    } catch (e) {
      console.error("Error fetching earnings:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  // Group by date
  const grouped = earnings.reduce((acc, e) => {
    if (!acc[e.date]) acc[e.date] = [];
    acc[e.date].push(e);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort();

  return (
    <div className="bg-white border-4 border-gray-900 p-0 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6" />
          <span className="text-2xl font-black">EARNINGS CALENDAR</span>
          <span className="text-sm font-bold text-gray-400 ml-2">Next 90 days · Your stocks</span>
        </div>
        <Button
          onClick={fetchEarnings}
          disabled={loading}
          className="bg-white text-gray-900 hover:bg-gray-200 font-black text-sm h-9 px-4 rounded-none border-2 border-white"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'LOADING...' : 'REFRESH'}
        </Button>
      </div>

      {loading && earnings.length === 0 ? (
        <div className="p-12 text-center text-2xl font-black text-gray-400">LOADING EARNINGS DATA...</div>
      ) : earnings.length === 0 ? (
        <div className="p-12 text-center">
          <div className="text-2xl font-black text-gray-400">NO UPCOMING EARNINGS FOUND</div>
          <div className="text-lg text-gray-400 mt-2">No earnings events in the next 90 days for your tracked stocks</div>
        </div>
      ) : (
        <div className="divide-y-4 divide-gray-900">
          {dates.map(date => {
            const days = getDaysUntil(date);
            const items = grouped[date];
            return (
              <div key={date} className="flex">
                {/* Date column */}
                <div className={`w-36 flex-shrink-0 flex flex-col items-center justify-center p-4 border-r-4 border-gray-900 ${getUrgencyStyle(days)}`}>
                  <div className="text-lg font-black">{getDateLabel(date)}</div>
                  {days > 1 && <div className="text-sm font-bold opacity-75">{days}d away</div>}
                </div>
                {/* Earnings items */}
                <div className="flex-1 flex flex-wrap gap-0">
                  {items.map((e, i) => (
                    <div
                      key={e.symbol + i}
                      className="flex flex-col justify-center px-5 py-3 border-r-2 border-gray-200 min-w-[140px]"
                    >
                      <div className="text-2xl font-black text-gray-900">{e.symbol}</div>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-sm font-bold text-gray-500">
                          {HOUR_LABELS[e.hour] || e.hour || "TBD"}
                        </span>
                      </div>
                      {e.epsEstimate != null && (
                        <div className="text-sm font-bold text-gray-500 mt-1">
                          EPS est: <span className="text-gray-900">${e.epsEstimate}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lastFetched && !loading && (
        <div className="px-6 py-2 border-t-2 border-gray-200 text-sm text-gray-400 font-bold">
          Last updated: {format(lastFetched, "MMM d, h:mm a")}
        </div>
      )}
    </div>
  );
}