import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function PositionForm({ onSubmit, includeSellingFields = false, isSubmitting = false }) {
  const [formData, setFormData] = useState({
    symbol: "",
    purchase_price: "",
    purchase_date: "",
    quantity: "",
    ...(includeSellingFields && {
      sell_price: "",
      sell_date: ""
    })
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      symbol: formData.symbol.toUpperCase(),
      purchase_price: parseFloat(formData.purchase_price),
      purchase_date: formData.purchase_date,
      quantity: parseFloat(formData.quantity),
      ...(includeSellingFields && {
        sell_price: parseFloat(formData.sell_price),
        sell_date: formData.sell_date
      })
    };
    onSubmit(data);
    setFormData({
      symbol: "",
      purchase_price: "",
      purchase_date: "",
      quantity: "",
      ...(includeSellingFields && {
        sell_price: "",
        sell_date: ""
      })
    });
  };

  return (
    <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl">
      <CardHeader className="p-10 bg-gray-100 border-b-4 border-gray-900">
        <CardTitle className="flex items-center gap-3 text-gray-900 text-3xl font-black">
          <Plus className="w-10 h-10" />
          Add New Position
        </CardTitle>
      </CardHeader>
      <CardContent className="p-10">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-4">
              <Label htmlFor="symbol" className="text-gray-900 text-2xl font-bold">Symbol</Label>
              <Input
                id="symbol"
                value={formData.symbol}
                onChange={(e) => setFormData({...formData, symbol: e.target.value})}
                placeholder="AAPL"
                className="bg-white border-4 border-gray-900 text-gray-900 text-3xl h-20 placeholder:text-gray-400 rounded-none"
                required
              />
            </div>
            
            <div className="space-y-4">
              <Label htmlFor="purchase_price" className="text-gray-900 text-2xl font-bold">Purchase Price</Label>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                value={formData.purchase_price}
                onChange={(e) => setFormData({...formData, purchase_price: e.target.value})}
                placeholder="150.00"
                className="bg-white border-4 border-gray-900 text-gray-900 text-3xl h-20 placeholder:text-gray-400 rounded-none"
                required
              />
            </div>
            
            <div className="space-y-4">
              <Label htmlFor="purchase_date" className="text-gray-900 text-2xl font-bold">Purchase Date</Label>
              <Input
                id="purchase_date"
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                className="bg-white border-4 border-gray-900 text-gray-900 text-3xl h-20 rounded-none"
                required
              />
            </div>
            
            <div className="space-y-4">
              <Label htmlFor="quantity" className="text-gray-900 text-2xl font-bold">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                placeholder="10"
                className="bg-white border-4 border-gray-900 text-gray-900 text-3xl h-20 placeholder:text-gray-400 rounded-none"
                required
              />
            </div>

            {includeSellingFields && (
              <>
                <div className="space-y-4">
                  <Label htmlFor="sell_price" className="text-gray-900 text-2xl font-bold">Sell Price</Label>
                  <Input
                    id="sell_price"
                    type="number"
                    step="0.01"
                    value={formData.sell_price}
                    onChange={(e) => setFormData({...formData, sell_price: e.target.value})}
                    placeholder="175.00"
                    className="bg-white border-4 border-gray-900 text-gray-900 text-3xl h-20 placeholder:text-gray-400 rounded-none"
                    required
                  />
                </div>
                
                <div className="space-y-4">
                  <Label htmlFor="sell_date" className="text-gray-900 text-2xl font-bold">Sell Date</Label>
                  <Input
                    id="sell_date"
                    type="date"
                    value={formData.sell_date}
                    onChange={(e) => setFormData({...formData, sell_date: e.target.value})}
                    className="bg-white border-4 border-gray-900 text-gray-900 text-3xl h-20 rounded-none"
                    required
                  />
                </div>
              </>
            )}
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-gray-900 hover:bg-gray-800 text-white text-3xl h-20 shadow-lg rounded-none font-black border-4 border-gray-900"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Adding..." : "Add Position"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}