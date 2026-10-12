import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import EEOpenPositions from "./EEOpenPositions";
import EEClosedPositions from "./EEClosedPositions";
import EEAddPosition from "./EEAddPosition";
import EEStats from "./EEStats";
import EEJournal from "./EEJournal";

export default function EE() {
  const [activeTab, setActiveTab] = useState('open');

  const tabs = [
    { id: 'open', label: 'Open Positions', component: EEOpenPositions },
    { id: 'closed', label: 'Closed Positions', component: EEClosedPositions },
    { id: 'add', label: 'Add Position', component: EEAddPosition },
    { id: 'stats', label: 'Stats', component: EEStats },
    { id: 'journal', label: 'Journal', component: EEJournal }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-white">
      {/* Horizontal Submenu */}
      <div className="bg-gray-100 border-b-8 border-gray-300 px-8 py-6">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-8 text-3xl font-black rounded-none h-16 border-4 transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gray-300 text-gray-900 border-gray-600'
                  : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100 hover:border-gray-500'
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Active Tab Content */}
      <div>
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}