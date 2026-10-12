import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EEPositionForm({ onSubmit, includeSellingFields = false, isSubmitting = false }) {
  const [formData, setFormData] = useState({
    symbol: "",
    position_type: "STOCK",
    option_type: "CALL",
    strike: "",
    expiration_date: "",
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
      position_type: formData.position_type,
      purchase_price: parseFloat(formData.purchase_price),
      purchase_date: formData.purchase_date,
      quantity: parseFloat(formData.quantity),
      ...(includeSellingFields && {
        sell_price: parseFloat(formData.sell_price),
        sell_date: formData.sell_date
      })
    };

    // Add option-specific fields if it's an option
    if (formData.position_type === "OPTION") {
      data.option_type = formData.option_type;
      data.strike = parseFloat(formData.strike);
      data.expiration_date = formData.expiration_date;
    }

    onSubmit(data);
    
    setFormData({
      symbol: "",
      position_type: "STOCK",
      option_type: "CALL",
      strike: "",
      expiration_date: "",
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
          Add New E&E Position
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
              <Label htmlFor="position_type" className="text-gray-900 text-2xl font-bold">Position Type</Label>
              <Select 
                value={formData.position_type} 
                onValueChange={(value) => setFormData({...formData, position_type: value})}
              >
                <SelectTrigger className="bg-white border-4 border-gray-900 text-gray-900 text-3xl h-20 rounded-none">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STOCK" className="text-2xl">Stock</SelectItem>
                  <SelectItem value="OPTION" className="text-2xl">Option</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.position_type === "OPTION" && (
              <>
                <div className="space-y-4">
                  <Label htmlFor="option_type" className="text-gray-900 text-2xl font-bold">Option Type</Label>
                  <Select 
                    value={formData.option_type} 
                    onValueChange={(value) => setFormData({...formData, option_type: value})}
                  >
                    <SelectTrigger className="bg-white border-4 border-gray-900 text-gray-900 text-3xl h-20 rounded-none">
                      <SelectValue placeholder="Select option type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CALL" className="text-2xl">Call</SelectItem>
                      <SelectItem value="PUT" className="text-2xl">Put</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label htmlFor="strike" className="text-gray-900 text-2xl font-bold">Strike Price</Label>
                  <Input
                    id="strike"
                    type="number"
                    step="0.01"
                    value={formData.strike}
                    onChange={(e) => setFormData({...formData, strike: e.target.value})}
                    placeholder="150.00"
                    className="bg-white border-4 border-gray-900 text-gray-900 text-3xl h-20 placeholder:text-gray-400 rounded-none"
                    required
                  />
                </div>

                <div className="space-y-4">
                  <Label htmlFor="expiration_date" className="text-gray-900 text-2xl font-bold">Expiration Date</Label>
                  <Input
                    id="expiration_date"
                    type="date"
                    value={formData.expiration_date}
                    onChange={(e) => setFormData({...formData, expiration_date: e.target.value})}
                    className="bg-white border-4 border-gray-900 text-gray-900 text-3xl h-20 rounded-none"
                    required
                  />
                </div>
              </>
            )}
            
            <div className="space-y-4">
              <Label htmlFor="purchase_price" className="text-gray-900 text-2xl font-bold">
                {formData.position_type === "OPTION" ? "Purchase Price (Premium)" : "Purchase Price"}
              </Label>
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
              <Label htmlFor="quantity" className="text-gray-900 text-2xl font-bold">
                {formData.position_type === "OPTION" ? "Quantity (Contracts)" : "Quantity (Shares)"}
              </Label>
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