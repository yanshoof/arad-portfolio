import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera } from "lucide-react";

export default function CaptureSnapshotDialog({ isOpen, onClose, onSave, defaultDate }) {
  const [label, setLabel] = useState("");
  const [addToWhatIf, setAddToWhatIf] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ label: label.trim() || `${new Date(defaultDate).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" })} Activity`, showInWhatIf: addToWhatIf });
    setSaving(false);
    setLabel("");
    setAddToWhatIf(true);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white border-8 border-gray-900 rounded-none max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <Camera className="w-8 h-8 text-purple-700" />
            Capture Portfolio Snapshot
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-4">
          <p className="text-lg font-bold text-gray-700">
            This freezes your current open positions for "what if I held" analysis. Live prices will still update.
          </p>
          <div>
            <label className="block text-lg font-black text-gray-900 mb-2">Label (optional)</label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={`${new Date(defaultDate).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" })} Activity`}
              className="border-4 border-gray-900 rounded-none h-14 text-xl font-bold"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer p-4 border-4 border-gray-900 bg-purple-50">
            <input
              type="checkbox"
              checked={addToWhatIf}
              onChange={(e) => setAddToWhatIf(e.target.checked)}
              className="w-6 h-6"
            />
            <span className="text-xl font-black text-gray-900">Add to "What If?" section</span>
          </label>
          <div className="flex gap-3 justify-end pt-2">
            <Button onClick={onClose} className="bg-white text-gray-900 border-4 border-gray-900 rounded-none text-xl font-black h-14 px-6 hover:bg-gray-100">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-purple-700 hover:bg-purple-800 text-white border-4 border-purple-900 rounded-none text-xl font-black h-14 px-6">
              {saving ? "Saving..." : "📸 Capture"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}