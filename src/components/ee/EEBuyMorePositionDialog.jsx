import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingCart } from "lucide-react";
import { format } from "date-fns";

export default function EEBuyMorePositionDialog({ 
  isOpen, 
  onClose, 
  groupedPosition, 
  onBuy,
  currentPrice 
}) {
  const [buyQuantity, setBuyQuantity] = useState("");
  const [buyPrice, setBuyPrice] = useState(currentPrice ? currentPrice.toFixed(2) : "");
  const [buyDate, setBuyDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!groupedPosition) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const quantity = parseFloat(buyQuantity);
    const price = parseFloat(buyPrice);
    
    if (quantity <= 0) {
      alert("Please enter a valid quantity greater than 0");
      return;
    }
    
    if (price <= 0) {
      alert("Please enter a valid buy price");
      return;
    }
    
    setIsSubmitting(true);
    await onBuy({
      quantity,
      buyPrice: price,
      buyDate
    });
    setIsSubmitting(false);
    
    // Reset form
    setBuyQuantity("");
    setBuyPrice(currentPrice ? currentPrice.toFixed(2) : "");
    setBuyDate(new Date().toISOString().split('T')[0]);
  };

  const isOption = groupedPosition.position_type === "OPTION";
  const multiplier = isOption ? 100 : 1;
  
  const newTotalQuantity = buyQuantity ? groupedPosition.quantity + parseFloat(buyQuantity) : groupedPosition.quantity;
  const newTotalCost = buyQuantity && buyPrice 
    ? groupedPosition.totalCost + (parseFloat(buyPrice) * parseFloat(buyQuantity) * multiplier)
    : groupedPosition.totalCost;
  const newAvgPrice = newTotalQuantity > 0 ? newTotalCost / (newTotalQuantity * multiplier) : 0;
  const avgPriceChange = newAvgPrice - groupedPosition.avgPurchasePrice;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white border-8 border-gray-900 rounded-none">
        <DialogHeader>
          <DialogTitle className="text-4xl font-black text-gray-900 mb-4">
            Buy More: {groupedPosition.symbol}
            {isOption && (
              <div className="text-2xl text-gray-700 mt-2">
                {groupedPosition.option_type} ${groupedPosition.strike} exp {format(new Date(groupedPosition.expiration_date), "MMM d, yyyy")}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-6">
          <div className="bg-gray-100 p-6 border-4 border-gray-300 rounded-none">
            <p className="text-2xl font-bold text-gray-900 mb-2">Current Position</p>
            <div className="space-y-2 text-xl text-gray-700">
              <p><span className="font-bold">Current {isOption ? 'Contracts' : 'Quantity'}:</span> {groupedPosition.quantity.toFixed(isOption ? 0 : 2)}</p>
              <p><span className="font-bold">Average Purchase Price:</span> ${groupedPosition.avgPurchasePrice.toFixed(2)}</p>
              <p><span className="font-bold">Current Price:</span> ${currentPrice ? currentPrice.toFixed(2) : 'N/A'}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="buyQuantity" className="text-2xl font-bold text-gray-900">
                {isOption ? 'Contracts' : 'Quantity'} to Buy
              </Label>
              <Input
                id="buyQuantity"
                type="number"
                step={isOption ? "1" : "0.01"}
                value={buyQuantity}
                onChange={(e) => setBuyQuantity(e.target.value)}
                placeholder={isOption ? "Enter contracts" : "Enter quantity"}
                className="bg-white border-4 border-gray-900 text-gray-900 text-2xl h-16 rounded-none"
                required
                min={isOption ? "1" : "0.01"}
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="buyPrice" className="text-2xl font-bold text-gray-900">
                Buy Price per {isOption ? 'Contract' : 'Share'}
              </Label>
              <Input
                id="buyPrice"
                type="number"
                step="0.01"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                placeholder="Enter buy price"
                className="bg-white border-4 border-gray-900 text-gray-900 text-2xl h-16 rounded-none"
                required
                min="0.01"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="buyDate" className="text-2xl font-bold text-gray-900">
                Buy Date
              </Label>
              <Input
                id="buyDate"
                type="date"
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                className="bg-white border-4 border-gray-900 text-gray-900 text-2xl h-16 rounded-none"
                required
              />
            </div>

            {buyQuantity && buyPrice && (
              <div className="p-6 border-4 rounded-none bg-blue-50 border-blue-600">
                <p className="text-2xl font-bold mb-2 text-blue-900">
                  New Position Details
                </p>
                <div className="space-y-2 text-xl text-gray-700">
                  <p className="font-bold">
                    New Total {isOption ? 'Contracts' : 'Quantity'}: {newTotalQuantity.toFixed(isOption ? 0 : 2)}
                  </p>
                  <p className="font-bold">
                    New Average Price: ${newAvgPrice.toFixed(2)}
                    <span className={`ml-2 ${avgPriceChange >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                      ({avgPriceChange >= 0 ? '+' : ''}${avgPriceChange.toFixed(2)})
                    </span>
                  </p>
                  <p className="text-gray-600">
                    Total Cost of Purchase: ${(parseFloat(buyPrice) * parseFloat(buyQuantity) * multiplier).toFixed(2)}
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
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-2xl h-16 border-4 border-blue-800 rounded-none font-black"
                disabled={isSubmitting}
              >
                <ShoppingCart className="w-6 h-6 mr-2" />
                {isSubmitting ? "Processing..." : "Confirm Purchase"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}