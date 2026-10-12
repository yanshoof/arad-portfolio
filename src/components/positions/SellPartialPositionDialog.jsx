import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign } from "lucide-react";

export default function SellPartialPositionDialog({ 
  isOpen, 
  onClose, 
  groupedPosition, 
  onSell,
  currentPrice 
}) {
  const [sellQuantity, setSellQuantity] = useState("");
  const [sellPrice, setSellPrice] = useState(currentPrice ? currentPrice.toFixed(2) : "");
  const [sellDate, setSellDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!groupedPosition) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const quantity = parseFloat(sellQuantity);
    const price = parseFloat(sellPrice);
    
    if (quantity <= 0 || quantity > groupedPosition.quantity) {
      alert(`Please enter a valid quantity between 0 and ${groupedPosition.quantity}`);
      return;
    }
    
    if (price <= 0) {
      alert("Please enter a valid sell price");
      return;
    }
    
    setIsSubmitting(true);
    await onSell({
      quantity,
      sellPrice: price,
      sellDate
    });
    setIsSubmitting(false);
    
    // Reset form
    setSellQuantity("");
    setSellPrice(currentPrice ? currentPrice.toFixed(2) : "");
    setSellDate(new Date().toISOString().split('T')[0]);
  };

  const potentialProfit = sellQuantity && sellPrice 
    ? (parseFloat(sellPrice) - groupedPosition.avgPurchasePrice) * parseFloat(sellQuantity)
    : 0;
  
  const potentialProfitPercent = potentialProfit !== 0 
    ? (potentialProfit / (groupedPosition.avgPurchasePrice * parseFloat(sellQuantity || 0))) * 100
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-8 border-gray-900 rounded-none">
        <DialogHeader>
          <DialogTitle className="text-4xl font-black text-gray-900 mb-4">
            Sell Partial Position: {groupedPosition.symbol}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-6">
          <div className="bg-gray-100 p-6 border-4 border-gray-300 rounded-none">
            <p className="text-2xl font-bold text-gray-900 mb-2">Current Position</p>
            <div className="space-y-2 text-xl text-gray-700">
              <p><span className="font-bold">Total Quantity:</span> {groupedPosition.quantity.toFixed(2)}</p>
              <p><span className="font-bold">Average Purchase Price:</span> ${groupedPosition.avgPurchasePrice.toFixed(2)}</p>
              <p><span className="font-bold">Current Price:</span> ${currentPrice ? currentPrice.toFixed(2) : 'N/A'}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="sellQuantity" className="text-2xl font-bold text-gray-900">
                Quantity to Sell (Max: {groupedPosition.quantity.toFixed(2)})
              </Label>
              <Input
                id="sellQuantity"
                type="number"
                step="0.01"
                value={sellQuantity}
                onChange={(e) => setSellQuantity(e.target.value)}
                placeholder="Enter quantity"
                className="bg-white border-4 border-gray-900 text-gray-900 text-2xl h-16 rounded-none"
                required
                max={groupedPosition.quantity}
                min="0.01"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="sellPrice" className="text-2xl font-bold text-gray-900">
                Sell Price per Share
              </Label>
              <Input
                id="sellPrice"
                type="number"
                step="0.01"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder="Enter sell price"
                className="bg-white border-4 border-gray-900 text-gray-900 text-2xl h-16 rounded-none"
                required
                min="0.01"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="sellDate" className="text-2xl font-bold text-gray-900">
                Sell Date
              </Label>
              <Input
                id="sellDate"
                type="date"
                value={sellDate}
                onChange={(e) => setSellDate(e.target.value)}
                className="bg-white border-4 border-gray-900 text-gray-900 text-2xl h-16 rounded-none"
                required
              />
            </div>

            {sellQuantity && sellPrice && (
              <div className={`p-6 border-4 rounded-none ${potentialProfit >= 0 ? 'bg-green-50 border-green-600' : 'bg-red-50 border-red-600'}`}>
                <p className="text-2xl font-bold mb-2" style={{ color: potentialProfit >= 0 ? '#15803d' : '#b91c1c' }}>
                  Expected Result
                </p>
                <div className="space-y-2 text-xl">
                  <p className={`font-bold ${potentialProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    P&L: {potentialProfit >= 0 ? '+' : ''}${potentialProfit.toFixed(2)} ({potentialProfit >= 0 ? '+' : ''}{potentialProfitPercent.toFixed(2)}%)
                  </p>
                  <p className="text-gray-700">
                    Remaining Quantity: {(groupedPosition.quantity - parseFloat(sellQuantity)).toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 bg-white border-4 border-gray-900 text-gray-900 text-2xl h-16 rounded-none font-black hover:bg-gray-100"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-2xl h-16 border-4 border-green-800 rounded-none font-black"
                disabled={isSubmitting}
              >
                <DollarSign className="w-6 h-6 mr-2" />
                {isSubmitting ? "Processing..." : "Confirm Sale"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}