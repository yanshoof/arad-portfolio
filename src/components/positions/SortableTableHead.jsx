import React from "react";
import { TableHead } from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SortableTableHead({ 
  label, 
  sortKey, 
  currentSort, 
  onSort,
  fontSize = 20
}) {
  const isSorted = currentSort.key === sortKey;
  const direction = isSorted ? currentSort.direction : null;
  
  const iconSize = Math.min(fontSize * 0.8, 24);

  return (
    <TableHead className="bg-green-100 border-r-2 border-gray-300 p-0">
      <Button
        variant="ghost"
        onClick={() => onSort(sortKey)}
        className="w-full h-full hover:bg-green-200 font-black text-green-900 hover:text-green-900 rounded-none justify-start leading-tight whitespace-nowrap px-3"
        style={{ fontSize: `${fontSize}px`, lineHeight: '1.3', paddingTop: `${fontSize * 0.3}px`, paddingBottom: `${fontSize * 0.3}px` }}
      >
        <span className="leading-tight">{label}</span>
        {!isSorted && <ArrowUpDown className="flex-shrink-0 ml-2" style={{ width: `${iconSize}px`, height: `${iconSize}px` }} />}
        {isSorted && direction === 'asc' && <ArrowUp className="text-gray-700 flex-shrink-0 ml-2" style={{ width: `${iconSize}px`, height: `${iconSize}px` }} />}
        {isSorted && direction === 'desc' && <ArrowDown className="text-gray-700 flex-shrink-0 ml-2" style={{ width: `${iconSize}px`, height: `${iconSize}px` }} />}
      </Button>
    </TableHead>
  );
}