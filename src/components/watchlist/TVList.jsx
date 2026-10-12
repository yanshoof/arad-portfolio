import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";

export default function TVList({ fontSize }) {
  const [items, setItems] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newComments, setNewComments] = useState("");

  const load = async () => {
    const data = await base44.entities.TVRecommendation.list("-created_date");
    setItems(data);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await base44.entities.TVRecommendation.create({ title: newTitle.trim(), comments: newComments.trim() });
    setNewTitle("");
    setNewComments("");
    await load();
  };

  const handleDelete = async (id) => {
    await base44.entities.TVRecommendation.delete(id);
    await load();
  };

  const handleCommentsBlur = async (item, value) => {
    if (value === (item.comments || "")) return;
    await base44.entities.TVRecommendation.update(item.id, { comments: value });
    await load();
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white rounded-none border-4 md:border-8 border-gray-900 shadow-2xl">
        <CardContent className="px-5 py-4 md:p-8">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Movie / series name"
              className="flex-1 bg-white border-4 border-gray-900 text-gray-900 text-xl md:text-2xl h-16 rounded-none font-bold"
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Input
              value={newComments}
              onChange={(e) => setNewComments(e.target.value)}
              placeholder="Comments (optional)"
              className="flex-[2] bg-white border-4 border-gray-900 text-gray-900 text-xl md:text-2xl h-16 rounded-none font-bold"
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button
              onClick={handleAdd}
              className="w-full md:w-auto bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-xl md:text-2xl h-16 px-6 md:px-10 border-8 border-yellow-600 rounded-none shadow-xl font-black">
              <Plus className="w-6 h-6 mr-2" />
              ADD
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-4 md:border-8 border-gray-900 rounded-none shadow-2xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b-4 border-gray-900 hover:bg-transparent bg-gray-100">
                <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300 w-1/3" style={{ fontSize: `${fontSize}px` }}>Movie / Series</TableHead>
                <TableHead className="text-gray-900 font-black p-4 border-r-2 border-gray-300" style={{ fontSize: `${fontSize}px` }}>Comments</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="border-b-2 border-gray-300 hover:bg-gray-50">
                  <TableCell className="font-black text-gray-900 p-3 border-r-2 border-gray-300 align-top" style={{ fontSize: `${fontSize}px` }}>
                    {item.title}
                  </TableCell>
                  <TableCell className="p-3 border-r-2 border-gray-300">
                    <Textarea
                      defaultValue={item.comments || ""}
                      onBlur={(e) => handleCommentsBlur(item, e.target.value)}
                      placeholder="Add comments..."
                      className="bg-transparent border-2 border-transparent hover:border-gray-300 focus:border-gray-900 text-gray-900 rounded-none font-bold min-h-[60px]"
                      style={{ fontSize: `${Math.max(fontSize - 4, 14)}px` }}
                    />
                  </TableCell>
                  <TableCell className="p-3 align-top">
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={() => handleDelete(item.id)}
                      className="hover:bg-red-100 text-red-700 hover:text-red-900 h-12 w-12 border-4 border-red-700 rounded-none">
                      <Trash2 className="w-6 h-6" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-700 font-bold py-16" style={{ fontSize: `${fontSize + 4}px` }}>
                    No recommendations yet. Add your first movie or series above.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}