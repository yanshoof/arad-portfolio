import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Columns3 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function ColumnSelector({ columns, visibleColumns, onColumnToggle, variant = "closed" }) {
  const [open, setOpen] = useState(false);
  
  const bgColor = variant === "closed" ? "bg-purple-600 hover:bg-purple-700 border-purple-800" : "bg-green-600 hover:bg-green-700 border-green-800";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={`${bgColor} text-white text-3xl h-24 px-10 border-8 rounded-none shadow-xl font-black`}>
          <Columns3 className="w-10 h-10 mr-4" />
          COLUMNS
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white border-8 border-gray-900 rounded-none max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-4xl font-black text-gray-900 mb-8">Select Columns to Display</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-8 p-6">
          {columns.map((column) => (
            <div key={column.id} className="flex items-center space-x-6 p-6 bg-gray-50 border-4 border-gray-300">
              <Checkbox
                id={column.id}
                checked={visibleColumns[column.id]}
                onCheckedChange={() => onColumnToggle(column.id)}
                className="h-10 w-10 border-4 border-gray-900"
              />
              <Label
                htmlFor={column.id}
                className="text-3xl font-bold cursor-pointer text-gray-900"
              >
                {column.label}
              </Label>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}