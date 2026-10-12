
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Edit, Volume2, VolumeX } from "lucide-react";
import VoiceControls from "../components/voice/VoiceControls";

const DEFAULT_CHANGELOG = `
<h2 style="font-size: 1.8em; font-weight: bold; margin-bottom: 1em;">Change Log</h2>

<h3 style="font-size: 1.5em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; color: #059669;">✓ Latest Updates - ${new Date().toLocaleDateString()}</h3>
<ul style="margin-left: 2em; margin-bottom: 1.5em; line-height: 1.8;">
  <li><strong>Trading Journal:</strong> Comprehensive journal entry system with 22 fields including date, time, ticker, trade category, conviction score, entry reason, expectations, invalidation criteria, setup details, macro context, market mood, emotional state, edge source, alternative plays, VIX, sizing rationale, probability/profit expectations, and post-trade analysis</li>
  <li><strong>Notes Section:</strong> Added rich text editor for trading notes with "Anyone can have a good idea. Very few know how to survive it" framework covering setups, entry/sizing/scaling, trade management, red flags, volatility strategies, and actionable items</li>
  <li><strong>Changes Page:</strong> Created dedicated Changes section with two tabs - Change Log (automatic tracking of all updates) and Ideas & Thoughts (capture trading observations and insights)</li>
  <li><strong>Text-to-Speech:</strong> Integrated read-aloud functionality with natural voice synthesis for Notes and Changes sections for easier content review</li>
  <li><strong>Enhanced Editing:</strong> All text content (Notes, Change Log, Ideas) editable with rich formatting options including headings, lists, bold, italic, colors, and alignment</li>
</ul>

<h3 style="font-size: 1.5em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em;">Previous Updates - Week of ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</h3>
<ul style="margin-left: 2em; margin-bottom: 1.5em; line-height: 1.8;">
  <li><strong>Navigation Enhancement:</strong> Moved all menu items to top navigation bar with active state highlighting</li>
  <li><strong>Daily P&L Feature:</strong> Added daily profit/loss tracking in filtered view with comparison to yesterday's prices</li>
  <li><strong>Chart Integration:</strong> Implemented historical price fetching from Tradier API for accurate P&L calculations</li>
  <li><strong>UI Polish:</strong> Standardized button sizes and styling across Open Positions page (green backgrounds for action buttons)</li>
</ul>

<h3 style="font-size: 1.5em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em;">Changes - Week of ${new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}</h3>
<ul style="margin-left: 2em; margin-bottom: 1.5em; line-height: 1.8;">
  <li><strong>View Modes:</strong> Added Detailed and Filtered view toggle for Open Positions</li>
  <li><strong>Mini Charts:</strong> Integrated trend visualization in filtered view</li>
  <li><strong>Font Size Control:</strong> Added dynamic font size adjustment slider for better readability</li>
  <li><strong>Summary Cards:</strong> Redesigned summary cards with improved visual hierarchy and color coding</li>
</ul>

<h3 style="font-size: 1.5em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em;">Earlier Updates - ${new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toLocaleDateString()}</h3>
<ul style="margin-left: 2em; margin-bottom: 1.5em; line-height: 1.8;">
  <li><strong>Time Period Filters:</strong> Added 1D, 1W, 1M, 3M, 6M, 1Y, TOTAL period selection</li>
  <li><strong>Real-time Pricing:</strong> Integrated Tradier API for live stock price updates</li>
  <li><strong>Historical Data:</strong> Added historical price comparison for P&L calculations</li>
  <li><strong>Refresh Functionality:</strong> Implemented manual refresh button for current prices</li>
</ul>

<h3 style="font-size: 1.5em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em;">Initial Release Features</h3>
<ul style="margin-left: 2em; margin-bottom: 1.5em; line-height: 1.8;">
  <li><strong>Open Positions:</strong> Track currently held stocks with real-time P&L</li>
  <li><strong>Closed Positions:</strong> Historical trade records with profit/loss analysis</li>
  <li><strong>Watch List:</strong> Monitor stocks of interest with current pricing</li>
  <li><strong>Portfolio Stats:</strong> Comprehensive portfolio composition and performance charts</li>
  <li><strong>Add Position:</strong> Quick entry form for recording new trades</li>
  <li><strong>Monthly Performance:</strong> Breakdown of trading results by month</li>
</ul>

<p style="margin-top: 2em; padding: 1em; background-color: #f3f4f6; border-left: 4px solid #3b82f6;">
  <strong>Note:</strong> This change log is automatically updated as new features are added and improvements are made to the Portfolio Tracker application.
</p>
`;

const DEFAULT_IDEAS = `
<h2 style="font-size: 1.8em; font-weight: bold; margin-bottom: 1em;">Ideas and Thoughts</h2>
<p style="margin-bottom: 0.5em;">Capture your trading ideas, observations, and insights.</p>

<h3 style="font-size: 1.5em; font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em;">Current Market Observations</h3>
<ul style="margin-left: 2em; margin-bottom: 1em;">
  <li>Add your market observations here...</li>
</ul>

<h3 style="font-size: 1.5em; font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em;">Trading Ideas</h3>
<ul style="margin-left: 2em; margin-bottom: 1em;">
  <li>Document potential trade setups...</li>
</ul>

<h3 style="font-size: 1.5em; font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em;">Lessons Learned</h3>
<ul style="margin-left: 2em; margin-bottom: 1em;">
  <li>Track insights from your trading experience...</li>
</ul>
`;

export default function Changes() {
  const [changeLogContent, setChangeLogContent] = useState("");
  const [ideasContent, setIdeasContent] = useState("");
  const [isEditingChangeLog, setIsEditingChangeLog] = useState(false);
  const [isEditingIdeas, setIsEditingIdeas] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [isReadingChangeLog, setIsReadingChangeLog] = useState(false);
  const [isReadingIdeas, setIsReadingIdeas] = useState(false);
  const [voices, setVoices] = useState([]);
  const [showVoiceControls, setShowVoiceControls] = useState(false);
  
  // Voice settings with localStorage persistence
  const [selectedVoice, setSelectedVoice] = useState(() => {
    return localStorage.getItem('changesVoiceIndex') || '0';
  });
  const [rate, setRate] = useState(() => {
    return parseFloat(localStorage.getItem('changesVoiceRate') || '0.9');
  });
  const [pitch, setPitch] = useState(() => {
    return parseFloat(localStorage.getItem('changesVoicePitch') || '1.0');
  });
  const [volume, setVolume] = useState(() => {
    return parseFloat(localStorage.getItem('changesVoiceVolume') || '1.0');
  });

  useEffect(() => {
    loadContent();
    loadVoices();
  }, []);

  // Save voice settings to localStorage
  useEffect(() => {
    localStorage.setItem('changesVoiceIndex', selectedVoice);
  }, [selectedVoice]);

  useEffect(() => {
    localStorage.setItem('changesVoiceRate', rate.toString());
  }, [rate]);

  useEffect(() => {
    localStorage.setItem('changesVoicePitch', pitch.toString());
  }, [pitch]);

  useEffect(() => {
    localStorage.setItem('changesVoiceVolume', volume.toString());
  }, [volume]);

  const loadContent = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    setChangeLogContent(currentUser.change_log || DEFAULT_CHANGELOG);
    setIdeasContent(currentUser.ideas_thoughts || DEFAULT_IDEAS);
  };

  const loadVoices = () => {
    if (window.speechSynthesis) {
      const updateVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        
        // Prioritize quality voices
        const sortedVoices = availableVoices.sort((a, b) => {
          const aEnglish = a.lang.startsWith('en') ? 1 : 0;
          const bEnglish = b.lang.startsWith('en') ? 1 : 0;
          if (aEnglish !== bEnglish) return bEnglish - aEnglish;
          
          const qualityKeywords = ['premium', 'enhanced', 'natural', 'neural', 'google', 'microsoft', 'samantha', 'alex'];
          const aQuality = qualityKeywords.some(kw => a.name.toLowerCase().includes(kw)) ? 1 : 0;
          const bQuality = qualityKeywords.some(kw => b.name.toLowerCase().includes(kw)) ? 1 : 0;
          if (aQuality !== bQuality) return bQuality - aQuality;
          
          return a.name.localeCompare(b.name);
        });
        
        setVoices(sortedVoices);
      };
      
      window.speechSynthesis.onvoiceschanged = updateVoices;
      updateVoices();
    }
  };

  const handleSaveChangeLog = async () => {
    setIsSaving(true);
    await base44.auth.updateMe({ change_log: changeLogContent });
    setIsEditingChangeLog(false);
    setIsSaving(false);
  };

  const handleSaveIdeas = async () => {
    setIsSaving(true);
    await base44.auth.updateMe({ ideas_thoughts: ideasContent });
    setIsEditingIdeas(false);
    setIsSaving(false);
  };

  const stripHtml = (html) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const handleReadAloud = (content, isReading, setIsReading) => {
    if (!window.speechSynthesis) {
      console.warn("Speech synthesis not supported in this browser.");
      return;
    }

    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    const textToRead = stripHtml(content);
    const utterance = new SpeechSynthesisUtterance(textToRead);
    
    // Apply selected voice
    if (voices.length > 0) {
      const voiceIndex = parseInt(selectedVoice);
      if (voices[voiceIndex]) {
        utterance.voice = voices[voiceIndex];
      }
    }
    
    // Apply voice settings
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    
    utterance.onend = () => {
      setIsReading(false);
    };
    
    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      setIsReading(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsReading(true);
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['clean']
    ],
  };

  return (
    <div className="p-8 md:p-12 space-y-10 bg-white">
      <div className="max-w-full mx-auto">
        <div className="mb-12">
          <h1 className="text-5xl font-black text-gray-900 mb-4">Changes</h1>
          <p className="text-2xl text-gray-700 font-bold">Track changes and capture your trading ideas</p>
        </div>

        <Tabs defaultValue="changelog" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-20 bg-gray-200 mb-10 rounded-none border-4 border-gray-900">
            <TabsTrigger value="changelog" className="text-3xl data-[state=active]:bg-green-600 data-[state=active]:text-white bg-white text-gray-900 h-full font-black rounded-none border-4 border-gray-900 hover:bg-green-100">
              CHANGE LOG
            </TabsTrigger>
            <TabsTrigger value="ideas" className="text-3xl data-[state=active]:bg-green-600 data-[state=active]:text-white bg-white text-gray-900 h-full font-black rounded-none border-4 border-gray-900 hover:bg-green-100">
              IDEAS AND THOUGHTS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="changelog">
            <div className="mb-8 flex justify-end gap-4">
              {!isEditingChangeLog && (
                <>
                  <Button
                    onClick={() => setShowVoiceControls(!showVoiceControls)}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-2xl h-16 px-8 border-4 border-purple-800 rounded-none shadow-xl font-black"
                  >
                    {showVoiceControls ? "Hide" : "Voice"} Settings
                  </Button>
                  <Button
                    onClick={() => handleReadAloud(changeLogContent, isReadingChangeLog, setIsReadingChangeLog)}
                    className={`${isReadingChangeLog ? 'bg-red-600 hover:bg-red-700 border-red-800' : 'bg-blue-600 hover:bg-blue-700 border-blue-800'} text-white text-2xl h-16 px-8 border-4 rounded-none shadow-xl font-black`}
                  >
                    {isReadingChangeLog ? <VolumeX className="w-6 h-6 mr-3" /> : <Volume2 className="w-6 h-6 mr-3" />}
                    {isReadingChangeLog ? "Stop" : "Read Aloud"}
                  </Button>
                </>
              )}
              {isEditingChangeLog ? (
                <>
                  <Button
                    onClick={() => {
                      setChangeLogContent(user?.change_log || DEFAULT_CHANGELOG);
                      setIsEditingChangeLog(false);
                    }}
                    className="bg-gray-400 hover:bg-gray-500 text-white text-2xl h-16 px-8 border-4 border-gray-600 rounded-none shadow-xl font-black"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveChangeLog}
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700 text-white text-2xl h-16 px-8 border-4 border-green-800 rounded-none shadow-xl font-black"
                  >
                    <Save className="w-6 h-6 mr-3" />
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setIsEditingChangeLog(true)}
                  className="bg-gray-900 hover:bg-gray-800 text-white text-2xl h-16 px-8 border-4 border-gray-900 rounded-none shadow-xl font-black"
                >
                  <Edit className="w-6 h-6 mr-3" />
                  Edit
                </Button>
              )}
            </div>

            {!isEditingChangeLog && showVoiceControls && (
              <VoiceControls
                voices={voices}
                selectedVoice={selectedVoice}
                onVoiceChange={setSelectedVoice}
                rate={rate}
                onRateChange={setRate}
                pitch={pitch}
                onPitchChange={setPitch}
                volume={volume}
                onVolumeChange={setVolume}
              />
            )}

            <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl overflow-hidden">
              <CardContent className="p-8">
                {isEditingChangeLog ? (
                  <div className="min-h-[600px]">
                    <ReactQuill
                      value={changeLogContent}
                      onChange={setChangeLogContent}
                      modules={modules}
                      className="h-[calc(100%-100px)]"
                      theme="snow"
                    />
                  </div>
                ) : (
                  <div 
                    className="prose prose-lg max-w-none"
                    dangerouslySetInnerHTML={{ __html: changeLogContent }}
                    style={{ 
                      fontSize: '2.2rem',
                      lineHeight: '1.8',
                      color: '#1f2937'
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ideas">
            <div className="mb-8 flex justify-end gap-4">
              {!isEditingIdeas && (
                <>
                  <Button
                    onClick={() => setShowVoiceControls(!showVoiceControls)}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-2xl h-16 px-8 border-4 border-purple-800 rounded-none shadow-xl font-black"
                  >
                    {showVoiceControls ? "Hide" : "Voice"} Settings
                  </Button>
                  <Button
                    onClick={() => handleReadAloud(ideasContent, isReadingIdeas, setIsReadingIdeas)}
                    className={`${isReadingIdeas ? 'bg-red-600 hover:bg-red-700 border-red-800' : 'bg-blue-600 hover:bg-blue-700 border-blue-800'} text-white text-2xl h-16 px-8 border-4 rounded-none shadow-xl font-black`}
                  >
                    {isReadingIdeas ? <VolumeX className="w-6 h-6 mr-3" /> : <Volume2 className="w-6 h-6 mr-3" />}
                    {isReadingIdeas ? "Stop" : "Read Aloud"}
                  </Button>
                </>
              )}
              {isEditingIdeas ? (
                <>
                  <Button
                    onClick={() => {
                      setIdeasContent(user?.ideas_thoughts || DEFAULT_IDEAS);
                      setIsEditingIdeas(false);
                    }}
                    className="bg-gray-400 hover:bg-gray-500 text-white text-2xl h-16 px-8 border-4 border-gray-600 rounded-none shadow-xl font-black"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveIdeas}
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700 text-white text-2xl h-16 px-8 border-4 border-green-800 rounded-none shadow-xl font-black"
                  >
                    <Save className="w-6 h-6 mr-3" />
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setIsEditingIdeas(true)}
                  className="bg-gray-900 hover:bg-gray-800 text-white text-2xl h-16 px-8 border-4 border-gray-900 rounded-none shadow-xl font-black"
                >
                  <Edit className="w-6 h-6 mr-3" />
                  Edit
                </Button>
              )}
            </div>

            {!isEditingIdeas && showVoiceControls && (
              <VoiceControls
                voices={voices}
                selectedVoice={selectedVoice}
                onVoiceChange={setSelectedVoice}
                rate={rate}
                onRateChange={setRate}
                pitch={pitch}
                onPitchChange={setPitch}
                volume={volume}
                onVolumeChange={setVolume}
              />
            )}

            <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl overflow-hidden">
              <CardContent className="p-8">
                {isEditingIdeas ? (
                  <div className="min-h-[600px]">
                    <ReactQuill
                      value={ideasContent}
                      onChange={setIdeasContent}
                      modules={modules}
                      className="h-[calc(100%-100px)]"
                      theme="snow"
                    />
                  </div>
                ) : (
                  <div 
                    className="prose prose-lg max-w-none"
                    dangerouslySetInnerHTML={{ __html: ideasContent }}
                    style={{ 
                      fontSize: '2.2rem',
                      lineHeight: '1.8',
                      color: '#1f2937'
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
