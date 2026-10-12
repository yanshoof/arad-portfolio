import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { TrendingUp, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navigationRow1 = [
  { label: "OPEN", url: createPageUrl("OpenPositions") },
  { label: "OPEN 2", url: createPageUrl("OpenPositions2") },
  { label: "CLOSED", url: createPageUrl("ClosedPositions") },
  { label: "ADD", url: createPageUrl("AddPosition") },
  { label: "WATCH LIST", url: createPageUrl("WatchList") },
  { label: "STOCK P&L", url: createPageUrl("StockPnL") },
  { label: "HISTORY", url: createPageUrl("TransactionHistory") },
];

const navigationRow2 = [
  { label: "NEWS & EARNINGS", url: createPageUrl("NewsEarnings") },
  { label: "MOMENTUM", url: createPageUrl("Momentum") },
  { label: "DATA", url: createPageUrl("Data") },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (url) => {
    return location.pathname === url || location.pathname === url + '/';
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="bg-gray-100 border-b-8 border-gray-300 px-4 md:px-8 py-4 md:py-6">
        <div className="flex items-center justify-between gap-4 mb-4 md:mb-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-gray-400 to-gray-600 rounded-none flex items-center justify-center shadow-2xl border-4 border-gray-700">
              <TrendingUp className="w-7 h-7 md:w-10 md:h-10 text-white" />
            </div>
            <h1 className="text-xl md:text-3xl font-black text-gray-900">Portfolio Tracker</h1>
          </div>
          
          {/* Mobile Menu Button */}
          <Button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden bg-gray-900 text-white p-2 border-2 border-gray-900 rounded-none"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
        
        {/* Desktop Navigation - Row 1 */}
        <nav className="hidden md:flex gap-2 flex-wrap mb-2">
          {navigationRow1.map((item) => {
            const active = isActive(item.url);
            return (
              <Link
                key={item.url}
                to={item.url}
                className={`px-8 text-3xl font-black rounded-none h-12 border-4 transition-all duration-200 flex items-center justify-center ${
                  active
                    ? 'bg-gray-300 text-gray-900 border-gray-600'
                    : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100 hover:border-gray-500'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Navigation - Row 2 */}
        <nav className="hidden md:flex gap-2 flex-wrap">
          {navigationRow2.map((item) => {
            const active = isActive(item.url);
            return (
              <Link
                key={item.url}
                to={item.url}
                className={`px-8 text-2xl font-black rounded-none h-10 border-4 transition-all duration-200 flex items-center justify-center ${
                  active
                    ? 'bg-gray-200 text-gray-900 border-gray-500'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-400'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden flex flex-col gap-2 mt-4">
            {[...navigationRow1, ...navigationRow2].map((item) => {
              const active = isActive(item.url);
              return (
                <Link
                  key={item.url}
                  to={item.url}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-6 py-4 text-2xl font-black rounded-none border-4 transition-all duration-200 flex items-center justify-center ${
                    active
                      ? 'bg-gray-300 text-gray-900 border-gray-600'
                      : 'bg-white text-gray-900 border-gray-300'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <main className="flex-1 overflow-auto bg-white">
        {children}
      </main>
    </div>
  );
}