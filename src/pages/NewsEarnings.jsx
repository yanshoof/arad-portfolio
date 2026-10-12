import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, ExternalLink, Newspaper, Volume2, VolumeX } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FontSizeSlider from "../components/positions/FontSizeSlider";
import EarningsCalendar from "../components/earnings/EarningsCalendar";
import { speakText } from "@/lib/speech";

export default function NewsEarnings() {
  const [activeTab, setActiveTab] = useState("news");
  const [selectedSymbol, setSelectedSymbol] = useState('all');
  const [newsData, setNewsData] = useState([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [speakingArticle, setSpeakingArticle] = useState(null);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('newsFontSize');
    return saved ? parseInt(saved) : 24;
  });

  const { data: openPositions = [] } = useQuery({
    queryKey: ['openPositions'],
    queryFn: () => base44.entities.OpenPosition.list(),
  });

  const { data: watchList = [] } = useQuery({
    queryKey: ['watchList'],
    queryFn: () => base44.entities.WatchListItem.list(),
  });

  const allSymbols = React.useMemo(() => {
    const positionSymbols = openPositions.map(p => p.symbol);
    const watchSymbols = watchList.map(w => w.symbol);
    return [...new Set([...positionSymbols, ...watchSymbols])].sort();
  }, [openPositions, watchList]);

  useEffect(() => {
    localStorage.setItem('newsFontSize', fontSize.toString());
  }, [fontSize]);

  const fetchNews = async () => {
    setIsLoadingNews(true);
    setNewsData([]);
    try {
      const symbolsToFetch = selectedSymbol === 'all' ? allSymbols.slice(0, 10) : [selectedSymbol];
      // Real headlines from Yahoo Finance with their actual article links.
      const { data } = await base44.functions.invoke('getNews', { symbols: symbolsToFetch, perSymbol: 5 });
      const bySymbol = Object.fromEntries((data?.news || []).map(n => [n.symbol, n.articles || []]));
      setNewsData(symbolsToFetch.map(symbol => ({ symbol, articles: bySymbol[symbol.toUpperCase()] || [] })));
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setIsLoadingNews(false);
    }
  };

  // Also re-run once positions/watch list finish loading (previously the first
  // load fired before symbols arrived, so news stayed empty until REFRESH).
  const symbolsKey = allSymbols.join(',');
  useEffect(() => {
    if (activeTab === 'news' && allSymbols.length > 0) {
      fetchNews();
    }
  }, [selectedSymbol, activeTab, symbolsKey]);

  const filteredNews = selectedSymbol === 'all'
    ? newsData
    : newsData.filter(n => n.symbol === selectedSymbol);

  const speakArticle = (article, idx) => {
    const articleKey = `${article.title}-${idx}`;
    if (speakingArticle === articleKey) {
      window.speechSynthesis.cancel();
      setSpeakingArticle(null);
    } else {
      speakText(`${article.title}. ${article.summary}`, {
        onEnd: () => setSpeakingArticle(null),
      });
      setSpeakingArticle(articleKey);
    }
  };

  return (
    <div className="bg-white min-h-screen p-4 md:p-8">
      {/* Tab switcher */}
      <div className="flex gap-2 mb-8">
        {[
          { key: 'news', label: 'FINANCIAL NEWS' },
          { key: 'earnings', label: 'EARNINGS' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-8 text-2xl font-black h-14 border-4 transition-all ${
              activeTab === tab.key
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* NEWS TAB */}
      {activeTab === 'news' && (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900">FINANCIAL NEWS</h1>
            <div className="flex gap-4 items-center flex-wrap">
              <FontSizeSlider value={fontSize} onChange={setFontSize} />
              <Button
                onClick={fetchNews}
                disabled={isLoadingNews}
                className="bg-gray-900 text-white hover:bg-gray-700 text-2xl font-black h-14 px-6 rounded-none border-4 border-gray-900"
              >
                <RefreshCw className={`w-6 h-6 ${isLoadingNews ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          <div className="mb-6">
            <label className="text-xl font-black text-gray-900 mb-2 block">FILTER BY STOCK</label>
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="text-xl font-bold rounded-none border-2 border-gray-300 max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stocks (Top 10)</SelectItem>
                {allSymbols.map(symbol => (
                  <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoadingNews ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-2xl font-black text-gray-500">LOADING NEWS...</div>
            </div>
          ) : filteredNews.length === 0 ? (
            <Card className="bg-gray-100 border-4 border-gray-300 rounded-none">
              <CardContent className="py-12">
                <div className="text-center">
                  <Newspaper className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <div className="text-2xl font-black text-gray-500">NO NEWS AVAILABLE</div>
                  <div className="text-lg text-gray-600 mt-2">Add stocks to your watch list or open positions to see news</div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredNews.map((stockNews) => (
                <Card key={stockNews.symbol} className="bg-white border-4 border-gray-900 rounded-none">
                  <CardHeader className="bg-gray-100 border-b-4 border-gray-900">
                    <CardTitle className="text-3xl font-black text-gray-900">{stockNews.symbol}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {stockNews.articles.length === 0 ? (
                      <div className="text-center py-8 text-lg text-gray-500">No news available for this symbol</div>
                    ) : (
                      <div className="space-y-4">
                        {stockNews.articles.map((article, idx) => {
                          const articleKey = `${article.title}-${idx}`;
                          const isSpeaking = speakingArticle === articleKey;
                          return (
                            <div key={idx} className="border-l-4 border-blue-600 pl-4 py-2 hover:bg-gray-50 transition-colors">
                              <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                  <h3 className="font-black text-gray-900 mb-2" style={{ fontSize: `${fontSize}px` }}>{article.title}</h3>
                                  <p className="text-gray-700 mb-2" style={{ fontSize: `${Math.max(fontSize - 4, 16)}px` }}>{article.summary}</p>
                                  <div className="flex items-center gap-4 text-gray-600" style={{ fontSize: `${Math.max(fontSize - 8, 14)}px` }}>
                                    <span className="font-bold">{article.source}</span>
                                    <span>{article.timestamp}</span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => speakArticle(article, idx)}
                                    className={`flex-shrink-0 p-2 rounded-none border-2 ${isSpeaking ? 'bg-red-600 text-white border-red-600' : 'bg-green-600 text-white border-green-600'}`}
                                  >
                                    {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                  </button>
                                  {article.url && (
                                    <a href={article.url} target="_blank" rel="noopener noreferrer"
                                      className="flex-shrink-0 bg-blue-600 text-white p-2 rounded-none border-2 border-blue-600">
                                      <ExternalLink className="w-5 h-5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* EARNINGS TAB */}
      {activeTab === 'earnings' && (
        <>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-8">EARNINGS</h1>
          <EarningsCalendar />
        </>
      )}
    </div>
  );
}