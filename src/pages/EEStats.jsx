import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function EEStats() {
  return (
    <div className="p-8 md:p-12 space-y-10 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <h1 className="text-5xl font-black text-gray-900 mb-4">E&E Statistics</h1>
          <p className="text-2xl text-gray-700 font-bold">Portfolio performance and analytics</p>
        </div>

        <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl">
          <CardContent className="p-20 text-center">
            <p className="text-6xl font-black text-gray-900 mb-8">Coming Soon</p>
            <p className="text-3xl text-gray-700 font-bold">Statistics and analytics features are under development</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}