import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export default function VoiceControls({ 
  voices, 
  selectedVoice, 
  onVoiceChange,
  rate,
  onRateChange,
  pitch,
  onPitchChange,
  volume,
  onVolumeChange
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-100 border-4 border-gray-900 rounded-none mb-6">
      <div className="space-y-3">
        <Label className="text-xl font-bold text-gray-900">Voice</Label>
        <Select value={selectedVoice} onValueChange={onVoiceChange}>
          <SelectTrigger className="bg-white border-2 border-gray-900 text-gray-900 text-lg h-12 rounded-none">
            <SelectValue placeholder="Select a voice" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {voices.map((voice, index) => (
              <SelectItem key={index} value={index.toString()} className="text-lg">
                {voice.name} ({voice.lang})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label className="text-xl font-bold text-gray-900">Speed: {rate.toFixed(1)}x</Label>
        <Slider
          value={[rate]}
          onValueChange={(val) => onRateChange(val[0])}
          min={0.5}
          max={2}
          step={0.1}
          className="[&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&>span]:h-3"
        />
      </div>

      <div className="space-y-3">
        <Label className="text-xl font-bold text-gray-900">Pitch: {pitch.toFixed(1)}</Label>
        <Slider
          value={[pitch]}
          onValueChange={(val) => onPitchChange(val[0])}
          min={0.5}
          max={2}
          step={0.1}
          className="[&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&>span]:h-3"
        />
      </div>

      <div className="space-y-3">
        <Label className="text-xl font-bold text-gray-900">Volume: {Math.round(volume * 100)}%</Label>
        <Slider
          value={[volume]}
          onValueChange={(val) => onVolumeChange(val[0])}
          min={0}
          max={1}
          step={0.1}
          className="[&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&>span]:h-3"
        />
      </div>
    </div>
  );
}