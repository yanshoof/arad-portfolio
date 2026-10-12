import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function MonthlyStats({ positions }) {
  const getMonthlyStats = () => {
    const monthlyData = {};

    positions.forEach((position) => {
      // parseISO treats YYYY-MM-DD as local date (avoids UTC->local shift
      // that was misclassifying trades by month).
      const month = format(parseISO(position.sell_date), 'MMM yyyy');
      const purchaseSum = position.purchase_price * position.quantity;
      const sellSum = position.sell_price * position.quantity;
      const pl = sellSum - purchaseSum;

      if (!monthlyData[month]) {
        monthlyData[month] = { pl: 0, count: 0 };
      }

      monthlyData[month].pl += pl;
      monthlyData[month].count += 1;
    });

    return Object.entries(monthlyData).
    sort(([a], [b]) => new Date(b) - new Date(a)).
    slice(0, 6);
  };

  const monthlyStats = getMonthlyStats();

  return (
    <Card className="bg-slate-200 text-card-foreground mb-10 rounded-none border-1 border-gray-900 shadow-2xl">
      <CardHeader className="p-8 bg-gray-100 border-b-4 border-gray-900">
        <CardTitle className="flex items-center gap-3 text-gray-900 text-4xl font-black">
          <Calendar className="w-10 h-10" />
          Monthly Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="px-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {monthlyStats.map(([month, data]) =>
          <div key={month} className="bg-red-50 px-32 rounded-none border-8 border-red-700">
              <p className="text-gray-900 mb-4 text-4xl font-bold">{month}</p>
              <p className={`text-4xl font-black ${data.pl >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {data.pl >= 0 ? '+' : ''}${data.pl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-gray-700 mt-3 text-4xl font-bold">{data.count} trades</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>);

}