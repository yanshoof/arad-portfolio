
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import JournalEntryForm from "../components/journal/JournalEntryForm";
import FontSizeSlider from "../components/positions/FontSizeSlider";

export default function Journal() {
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('journalFontSize');
    return saved ? parseInt(saved) : 18;
  });

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    localStorage.setItem('journalFontSize', fontSize.toString());
  }, [fontSize]);

  const loadEntries = async () => {
    const data = await base44.entities.JournalEntry.list("-date", "-time");
    setEntries(data);
  };

  const handleSubmit = async (formData) => {
    await base44.entities.JournalEntry.create(formData);
    setShowForm(false);
    await loadEntries();
  };

  const handleDelete = async (id) => {
    await base44.entities.JournalEntry.delete(id);
    await loadEntries();
  };

  return (
    <div className="p-8 md:p-12 space-y-10 bg-white">
      <div className="mx-auto">
        <div className="mb-12 flex justify-between items-center">
          <h1 className="text-5xl font-black text-gray-900">Journal</h1>
          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white text-3xl h-20 px-10 border-4 border-green-800 rounded-none shadow-xl font-black"
            >
              <Plus className="w-8 h-8 mr-4" />
              ADD ENTRY
            </Button>
          )}
        </div>

        <div className="mb-10">
          <FontSizeSlider value={fontSize} onChange={setFontSize} />
        </div>

        {showForm && (
          <JournalEntryForm
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
          />
        )}

        <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl overflow-hidden w-fit">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="w-auto">
                <TableHeader>
                  <TableRow className="border-b-4 border-gray-900 hover:bg-transparent bg-gray-100">
                    <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>Date</TableHead>
                    <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>Day</TableHead>
                    <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>Time</TableHead>
                    <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>Ticker</TableHead>
                    <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>Category</TableHead>
                    <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>Entry Price</TableHead>
                    <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>Holding Days</TableHead>
                    <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>Conviction</TableHead>
                    <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>Entry Reason</TableHead>
                    <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>Expectations</TableHead>
                    <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>Invalidation</TableHead>
                    <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>Setup</TableHead>
                    <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>Macro Context</TableHead>
                    <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>Market Mood</TableHead>
                    <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>Emotional State</TableHead>
                    <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>Edge Source</TableHead>
                    <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>Alternative Plays</TableHead>
                    <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>VIX</TableHead>
                    <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>Sizing Rationale</TableHead>
                    <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>Prob %</TableHead>
                    <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>Profit %</TableHead>
                    <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>Post Analysis</TableHead>
                    <TableHead className="text-gray-900 font-black p-4" style={{ fontSize: `${fontSize}px` }}></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id} className="border-b-2 border-gray-300 hover:bg-gray-50">
                      <TableCell className="font-bold p-3 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>
                        {entry.date ? format(new Date(entry.date), "MMM d, yyyy") : "-"}
                      </TableCell>
                      <TableCell className="p-3 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>
                        {entry.day_of_week || "-"}
                      </TableCell>
                      <TableCell className="p-3 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>
                        {entry.time || "-"}
                      </TableCell>
                      <TableCell className="font-black p-3 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>
                        {entry.ticker || "-"}
                      </TableCell>
                      <TableCell className="p-3 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>
                        {entry.trade_category === "Other" && entry.trade_category_other ? entry.trade_category_other : entry.trade_category || "-"}
                      </TableCell>
                      <TableCell className="p-3 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>
                        {entry.entry_price ? `$${entry.entry_price.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell className="p-3 border-r-2 border-gray-300 whitespace-nowrap text-center" style={{ fontSize: `${fontSize}px` }}>
                        {entry.planned_holding_days || "-"}
                      </TableCell>
                      <TableCell className="p-3 border-r-2 border-gray-300 whitespace-nowrap text-center" style={{ fontSize: `${fontSize}px` }}>
                        {entry.conviction_score || "-"}
                      </TableCell>
                      <TableCell className="p-3 border-r-2 border-gray-300 max-w-xs" style={{ fontSize: `${fontSize}px` }}>
                        <div className="line-clamp-3">{entry.entry_reason || "-"}</div>
                      </TableCell>
                      <TableCell className="p-3 border-r-2 border-gray-300 max-w-xs" style={{ fontSize: `${fontSize}px` }}>
                        <div className="line-clamp-3">{entry.expectations || "-"}</div>
                      </TableCell>
                      <TableCell className="p-3 border-r-2 border-gray-300 max-w-xs" style={{ fontSize: `${fontSize}px` }}>
                        <div className="line-clamp-3">{entry.invalidation || "-"}</div>
                      </TableCell>
                      <TableCell className="p-3 border-r-2 border-gray-300 max-w-xs" style={{ fontSize: `${fontSize}px` }}>
                        <div className="line-clamp-3">{entry.setup || "-"}</div>
                      </TableCell>
                      <TableCell className="p-3 border-r-2 border-gray-300 max-w-xs" style={{ fontSize: `${fontSize}px` }}>
                        <div className="line-clamp-3">{entry.macro_context || "-"}</div>
                      </TableCell>
                      <TableCell className="p-3 border-r-2 border-gray-300 max-w-xs" style={{ fontSize: `${fontSize}px` }}>
                        <div className="line-clamp-3">{entry.market_mood || "-"}</div>
                      </TableCell>
                      <TableCell className="p-3 border-r-2 border-gray-300 max-w-xs" style={{ fontSize: `${fontSize}px` }}>
                        <div className="line-clamp-3">{entry.emotional_state || "-"}</div>
                      </TableCell>
                      <TableCell className="p-3 border-r-2 border-gray-300 max-w-xs" style={{ fontSize: `${fontSize}px` }}>
                        <div className="line-clamp-3">{entry.edge_source || "-"}</div>
                      </TableCell>
                      <TableCell className="p-3 border-r-2 border-gray-300 max-w-xs" style={{ fontSize: `${fontSize}px` }}>
                        <div className="line-clamp-3">{entry.alternative_plays || "-"}</div>
                      </TableCell>
                      <TableCell className="p-3 border-r-2 border-gray-300 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>
                        {entry.vix_today ? entry.vix_today.toFixed(2) : "-"}
                      </TableCell>
                      <TableCell className="p-3 border-r-2 border-gray-300 max-w-xs" style={{ fontSize: `${fontSize}px` }}>
                        <div className="line-clamp-3">{entry.sizing_rationale || "-"}</div>
                      </TableCell>
                      <TableCell className="p-3 border-r-2 border-gray-300 whitespace-nowrap text-center" style={{ fontSize: `${fontSize}px` }}>
                        {entry.expected_probability ? `${entry.expected_probability}%` : "-"}
                      </TableCell>
                      <TableCell className="p-3 border-r-2 border-gray-300 whitespace-nowrap text-center" style={{ fontSize: `${fontSize}px` }}>
                        {entry.expected_profit ? `${entry.expected_profit}%` : "-"}
                      </TableCell>
                      <TableCell className="p-3 border-r-2 border-gray-300 max-w-xs" style={{ fontSize: `${fontSize}px` }}>
                        <div className="line-clamp-3">{entry.post_trade_analysis || "-"}</div>
                      </TableCell>
                      <TableCell className="p-3">
                        <Button
                          variant="ghost"
                          size="lg"
                          onClick={() => handleDelete(entry.id)}
                          className="hover:bg-red-100 text-red-700 hover:text-red-900 h-12 w-12 border-4 border-red-700 rounded-none"
                        >
                          <Trash2 className="w-6 h-6" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {entries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={23} className="text-center text-gray-700 font-bold py-16 text-3xl">
                        No journal entries yet. Click "Add Entry" to create your first entry.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
