import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PositionForm from "../components/positions/PositionForm";

export default function AddPosition() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleAddClosed = async (formData) => {
    setIsSubmitting(true);
    await base44.entities.ClosedPosition.create(formData);
    setSuccessMessage("Closed position added successfully!");
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      navigate(createPageUrl("ClosedPositions"));
    }, 2000);
    setIsSubmitting(false);
  };

  const handleAddOpen = async (formData) => {
    setIsSubmitting(true);
    await base44.entities.OpenPosition.create(formData);
    setSuccessMessage("Open position added successfully!");
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      navigate(createPageUrl("OpenPositions"));
    }, 2000);
    setIsSubmitting(false);
  };

  return (
    <div className="p-8 md:p-12 space-y-10 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <h1 className="text-5xl font-black text-gray-900 mb-4">Add Position</h1>
          <p className="text-2xl text-gray-700 font-bold">Record a new stock position</p>
        </div>

        {showSuccess && (
          <Card className="bg-green-100 border-4 border-green-600 mb-10 rounded-none">
            <CardContent className="p-8">
              <div className="flex items-center gap-4">
                <CheckCircle className="w-12 h-12 text-green-700" />
                <p className="text-3xl font-bold text-green-700">{successMessage}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="closed" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-20 bg-gray-200 mb-10 rounded-none border-4 border-gray-900">
            <TabsTrigger value="closed" className="text-2xl data-[state=active]:bg-white data-[state=active]:text-gray-900 h-full font-black rounded-none">
              Closed Position
            </TabsTrigger>
            <TabsTrigger value="open" className="text-2xl data-[state=active]:bg-white data-[state=active]:text-gray-900 h-full font-black rounded-none">
              Open Position
            </TabsTrigger>
          </TabsList>

          <TabsContent value="closed">
            <PositionForm 
              onSubmit={handleAddClosed} 
              includeSellingFields={true}
              isSubmitting={isSubmitting}
            />
          </TabsContent>

          <TabsContent value="open">
            <PositionForm 
              onSubmit={handleAddOpen}
              isSubmitting={isSubmitting}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}