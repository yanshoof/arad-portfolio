import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

export default function JournalEntryForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    time: new Date().toTimeString().slice(0, 5),
    ticker: "",
    trade_category: "",
    trade_category_other: "",
    entry_price: "",
    planned_holding_days: "",
    conviction_score: "",
    entry_reason: "",
    expectations: "",
    invalidation: "",
    setup: "",
    macro_context: "",
    market_mood: "",
    emotional_state: "",
    edge_source: "",
    alternative_plays: "",
    vix_today: "",
    sizing_rationale: "",
    expected_probability: "",
    expected_profit: "",
    post_trade_analysis: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = { ...formData };
    
    // Convert numeric fields
    if (submitData.entry_price) submitData.entry_price = parseFloat(submitData.entry_price);
    if (submitData.planned_holding_days) submitData.planned_holding_days = parseInt(submitData.planned_holding_days);
    if (submitData.conviction_score) submitData.conviction_score = parseInt(submitData.conviction_score);
    if (submitData.vix_today) submitData.vix_today = parseFloat(submitData.vix_today);
    if (submitData.expected_probability) submitData.expected_probability = parseFloat(submitData.expected_probability);
    if (submitData.expected_profit) submitData.expected_profit = parseFloat(submitData.expected_profit);
    
    onSubmit(submitData);
  };

  return (
    <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl mb-10">
      <CardHeader className="p-8 bg-gray-100 border-b-4 border-gray-900 flex flex-row items-center justify-between">
        <CardTitle className="text-4xl font-black text-gray-900">New Journal Entry</CardTitle>
        <Button
          onClick={onCancel}
          variant="ghost"
          size="icon"
          className="h-12 w-12 hover:bg-gray-200"
        >
          <X className="w-8 h-8" />
        </Button>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-xl font-bold">Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  setFormData({
                    ...formData,
                    date: e.target.value,
                    day_of_week: date.toLocaleDateString('en-US', { weekday: 'long' })
                  });
                }}
                className="border-4 border-gray-900 text-xl h-14"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xl font-bold">Day of Week</Label>
              <Input
                value={formData.day_of_week}
                disabled
                className="border-4 border-gray-900 text-xl h-14 bg-gray-100"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xl font-bold">Time (HH:MM)</Label>
              <Input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({...formData, time: e.target.value})}
                className="border-4 border-gray-900 text-xl h-14"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xl font-bold">Ticker/Symbol</Label>
              <Input
                value={formData.ticker}
                onChange={(e) => setFormData({...formData, ticker: e.target.value.toUpperCase()})}
                placeholder="AAPL"
                className="border-4 border-gray-900 text-xl h-14"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xl font-bold">Trade Category</Label>
              <Select
                value={formData.trade_category}
                onValueChange={(value) => setFormData({...formData, trade_category: value})}
              >
                <SelectTrigger className="border-4 border-gray-900 text-xl h-14">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Narrative">Narrative</SelectItem>
                  <SelectItem value="Event">Event</SelectItem>
                  <SelectItem value="Technical">Technical</SelectItem>
                  <SelectItem value="Positioning (hedge)">Positioning (hedge)</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.trade_category === "Other" && (
            <div className="space-y-2">
              <Label className="text-xl font-bold">Other Category</Label>
              <Input
                value={formData.trade_category_other}
                onChange={(e) => setFormData({...formData, trade_category_other: e.target.value})}
                placeholder="Specify category"
                className="border-4 border-gray-900 text-xl h-14"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-xl font-bold">Entry Price</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.entry_price}
                onChange={(e) => setFormData({...formData, entry_price: e.target.value})}
                placeholder="150.00"
                className="border-4 border-gray-900 text-xl h-14"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xl font-bold">Planned Holding (days)</Label>
              <Input
                type="number"
                value={formData.planned_holding_days}
                onChange={(e) => setFormData({...formData, planned_holding_days: e.target.value})}
                placeholder="5"
                className="border-4 border-gray-900 text-xl h-14"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xl font-bold">Conviction Score (1-5)</Label>
              <Select
                value={formData.conviction_score}
                onValueChange={(value) => setFormData({...formData, conviction_score: value})}
              >
                <SelectTrigger className="border-4 border-gray-900 text-xl h-14">
                  <SelectValue placeholder="Select score" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Low</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3 - Medium</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5 - High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xl font-bold">Entry Reason</Label>
            <Textarea
              value={formData.entry_reason}
              onChange={(e) => setFormData({...formData, entry_reason: e.target.value})}
              placeholder="Why are you entering this trade?"
              className="border-4 border-gray-900 text-xl min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xl font-bold">Expectations</Label>
            <Textarea
              value={formData.expectations}
              onChange={(e) => setFormData({...formData, expectations: e.target.value})}
              placeholder="What do you expect to happen?"
              className="border-4 border-gray-900 text-xl min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xl font-bold">What Invalidates the Trade?</Label>
            <Textarea
              value={formData.invalidation}
              onChange={(e) => setFormData({...formData, invalidation: e.target.value})}
              placeholder="What would make this trade invalid?"
              className="border-4 border-gray-900 text-xl min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xl font-bold">Setup</Label>
            <Textarea
              value={formData.setup}
              onChange={(e) => setFormData({...formData, setup: e.target.value})}
              placeholder="Describe the setup"
              className="border-4 border-gray-900 text-xl min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xl font-bold">Macro Context / Regime</Label>
            <Textarea
              value={formData.macro_context}
              onChange={(e) => setFormData({...formData, macro_context: e.target.value})}
              placeholder="What's the macro environment?"
              className="border-4 border-gray-900 text-xl min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xl font-bold">Market Mood</Label>
            <Textarea
              value={formData.market_mood}
              onChange={(e) => setFormData({...formData, market_mood: e.target.value})}
              placeholder="How's the market feeling?"
              className="border-4 border-gray-900 text-xl min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xl font-bold">Pre-Trade Emotional State</Label>
            <Textarea
              value={formData.emotional_state}
              onChange={(e) => setFormData({...formData, emotional_state: e.target.value})}
              placeholder="How are you feeling?"
              className="border-4 border-gray-900 text-xl min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xl font-bold">Edge Source</Label>
            <Textarea
              value={formData.edge_source}
              onChange={(e) => setFormData({...formData, edge_source: e.target.value})}
              placeholder="What's your edge?"
              className="border-4 border-gray-900 text-xl min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xl font-bold">Alternative Plays Considered</Label>
            <Textarea
              value={formData.alternative_plays}
              onChange={(e) => setFormData({...formData, alternative_plays: e.target.value})}
              placeholder="What other options did you consider?"
              className="border-4 border-gray-900 text-xl min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-xl font-bold">VIX Today</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.vix_today}
                onChange={(e) => setFormData({...formData, vix_today: e.target.value})}
                placeholder="15.50"
                className="border-4 border-gray-900 text-xl h-14"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xl font-bold">Expected Probability (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.expected_probability}
                onChange={(e) => setFormData({...formData, expected_probability: e.target.value})}
                placeholder="65"
                className="border-4 border-gray-900 text-xl h-14"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xl font-bold">Expected Profit (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.expected_profit}
                onChange={(e) => setFormData({...formData, expected_profit: e.target.value})}
                placeholder="10"
                className="border-4 border-gray-900 text-xl h-14"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xl font-bold">Sizing Rationale</Label>
            <Textarea
              value={formData.sizing_rationale}
              onChange={(e) => setFormData({...formData, sizing_rationale: e.target.value})}
              placeholder="Why this position size?"
              className="border-4 border-gray-900 text-xl min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xl font-bold">Post Trade Analysis</Label>
            <Textarea
              value={formData.post_trade_analysis}
              onChange={(e) => setFormData({...formData, post_trade_analysis: e.target.value})}
              placeholder="Thoughts, ideas, and analysis after the trade"
              className="border-4 border-gray-900 text-xl min-h-[150px]"
            />
          </div>

          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              onClick={onCancel}
              className="bg-gray-400 hover:bg-gray-500 text-white text-2xl h-16 px-10 border-4 border-gray-600 rounded-none font-black"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white text-2xl h-16 px-10 border-4 border-green-800 rounded-none font-black"
            >
              Save Entry
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}