import React from "react";
import { Button } from "@/components/ui/button";
import { List, LayoutGrid } from "lucide-react";

export default function ViewModeToggle({ mode, onModeChange, variant = "closed" }) {
  return (
    <Button
      onClick={() => onModeChange(mode === 'detailed' ? 'filtered' : 'detailed')} className="inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-10 [&_svg]:shrink-0 py-2 bg-green-600 hover:bg-green-700 text-white text-3xl h-20 px-10 border-4 border-green-800 rounded-none shadow-xl font-black">


      {mode === 'detailed' ?
      <>
          <LayoutGrid className="w-8 h-8 mr-4" />
          FILTERED
        </> :

      <>
          <List className="w-8 h-8 mr-4" />
          DETAILED
        </>
      }
    </Button>);

}