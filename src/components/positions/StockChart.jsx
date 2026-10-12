import React, { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, TrendingUp } from "lucide-react";

export default function StockChart({ symbol, isOpen, onClose, period = "1M", currentPrice, dailyPrice }) {
  // Calculate daily % change
  const dailyChange = currentPrice && dailyPrice ? currentPrice - dailyPrice : 0;
  const dailyPercentChange = dailyPrice && dailyPrice > 0 ? (dailyChange / dailyPrice) * 100 : 0;
  const isDailyPositive = dailyChange >= 0;

  // Google Finance URL
  const googleFinanceUrl = `https://www.google.com/finance/quote/${symbol}:NASDAQ`;

  // Auto-open Google Finance when dialog opens
  useEffect(() => {
    if (isOpen && symbol) {
      window.open(googleFinanceUrl, '_blank');
      setTimeout(() => onClose(), 500);
    }
  }, [isOpen, symbol]);

  const handleOpenAgain = () => {
    window.open(googleFinanceUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white border-8 border-gray-900 rounded-none">
        <DialogHeader>
          <DialogTitle className="text-4xl font-black text-gray-900 mb-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-4">
                <TrendingUp className="w-12 h-12 text-blue-600" />
                <span>{symbol} Charts</span>
              </div>
              {currentPrice && (
                <div className="flex items-baseline gap-4">
                  <span className="text-3xl text-gray-700">${currentPrice.toFixed(2)}</span>
                  <span className={`text-3xl font-black ${isDailyPositive ? 'text-green-700' : 'text-red-700'}`}>
                    {isDailyPositive ? '+' : ''}{dailyPercentChange.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-8 text-center space-y-6">
          <p className="text-2xl text-gray-700 font-semibold">
            Opening Google Finance in a new tab...
          </p>

          <Button
            onClick={handleOpenAgain}
            className="bg-blue-600 hover:bg-blue-700 text-white text-2xl h-16 px-10 border-4 border-blue-800 rounded-none shadow-xl font-black"
          >
            <ExternalLink className="w-6 h-6 mr-3" />
            Open Google Finance Again
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}