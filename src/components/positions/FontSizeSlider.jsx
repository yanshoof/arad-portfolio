import React from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export default function FontSizeSlider({ value, onChange }) {
  return (
    <div className="bg-gray-300 px-4 py-4 rounded-none md:p-6 flex flex-row items-center gap-3 md:gap-4 border-1 border-gray-100 w-auto">
      <Label className="text-xl md:text-2xl font-black text-gray-900 whitespace-nowrap">
        FONT SIZE
      </Label>
      <div className="w-48">
        <Slider
          value={[value]}
          onValueChange={(val) => onChange(val[0])}
          min={22}
                      max={60}
          step={2}
          className="[&_[role=slider]]:h-6 [&_[role=slider]]:w-6 md:[&_[role=slider]]:h-8 md:[&_[role=slider]]:w-8 [&>span]:h-3 md:[&>span]:h-4" />

      </div>
      <span className="text-xl md:text-2xl font-bold text-gray-900 min-w-[50px] md:min-w-[60px] text-right">
        {value}px
      </span>
    </div>);

}