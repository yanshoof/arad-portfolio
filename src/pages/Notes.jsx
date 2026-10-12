
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Save, Edit, Volume2, VolumeX } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import VoiceControls from "../components/voice/VoiceControls"; // New import for VoiceControls

const DEFAULT_CONTENT = `
<h1 style="font-size: 2.5em; font-weight: bold; margin-bottom: 1em;">Anyone can have a good idea. Very few know how to survive it.</h1>

<h2 style="font-size: 1.8em; font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em;">Part 1: Setups</h2>

<h3 style="font-size: 1.5em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em;">A) Narrative Setups - Time frame - Multi Month</h3>
<ul style="margin-left: 2em; margin-bottom: 1em;">
  <li>Sector Narrative/Theme Accelerating (AI, Semis, Clean Energy, Rare Earth, Batteries).</li>
  <li>Earning beats / Strong institutional flows within the last 1-2 weeks.</li>
  <li>Stock reclaims a key level: 50 or 100 or 200 Daily Moving Average - With volume.</li>
</ul>

<h3 style="font-size: 1.5em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em;">B) Event-Driven Setups - Time frame - Multi day</h3>
<ul style="margin-left: 2em; margin-bottom: 1em;">
  <li>Clear earnings reaction: Gap and go, or gap and fade.</li>
  <li>Volume surge with tight intraday movement</li>
  <li>Follow-through on day 2 or 3 (for example, post-earning drift).</li>
  <li>FDA approvals (Risky).</li>
  <li>Mergers and acquisitions rumors / Deal announcements</li>
  <li>Product launches / Investor days</li>
</ul>

<h3 style="font-size: 1.5em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em;">C) Technical or Momentum Setups</h3>
<ul style="margin-left: 2em; margin-bottom: 1em;">
  <li>Stock undercuts prior low, flushes weak hands, then reclaims the level on volume.</li>
</ul>

<h2 style="font-size: 1.8em; font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em;">Part 2: Entry, Sizing, Scaling</h2>

<h3 style="font-size: 1.5em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em;">1) Entry isn't a price, it's a process</h3>
<p style="margin-bottom: 0.5em;">Starter size is uncertainty premium/cost, add on confirmation = conviction earned.</p>
<p style="margin-bottom: 0.5em;"><strong>Enter when there is a thesis. Add when there is confirmation. Checklist:</strong></p>
<ul style="margin-left: 2em; margin-bottom: 1em;">
  <li>Can you define invalidation (not just price, but behavior).</li>
  <li>Is there liquidity and volume at this price level?</li>
  <li>Catalyst - is there a binary risk (earnings, macro) in the next few days?</li>
  <li>Maturity - are we early? mid-point or late?</li>
  <li>Conviction on a scale of 1 to 5?</li>
</ul>

<h3 style="font-size: 1.5em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em;">2) Sizing</h3>
<ul style="margin-left: 2em; margin-bottom: 1em;">
  <li>Starter - 20-40% of intended position size</li>
  <li>Add another 20-40% on volume expansion to support your theory</li>
  <li>Add final 20-40% only if macro/theme lines up and the price accelerates</li>
  <li>Sizing should be determined based on the stock volatility - example, trading NVIDIA on earnings and trading Procter & Gamble in August is not the same thing; One moves 8% on headlines, the other barely flinches.</li>
</ul>

<h3 style="font-size: 1.5em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em;">3) Scaling</h3>
<p style="margin-bottom: 0.5em;">Flat → Small → Working → Add.<br/>
Full → Extended → Trim.<br/>
Unclear → Don't touch.</p>
<p style="margin-bottom: 1em;"><strong>Note:</strong> Best to do scaling middle of the day to reduce slippage and volatility.</p>

<h2 style="font-size: 1.8em; font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em;">Part 3: Managing the trade</h2>
<ul style="margin-left: 2em; margin-bottom: 1em;">
  <li>Stop when the thesis fails, not where you get uncomfortable.</li>
  <li>Stop is not meant to protect ego, but to control risk paths.</li>
</ul>

<p style="margin-bottom: 0.5em;"><strong>Examples:</strong></p>
<ul style="margin-left: 2em; margin-bottom: 1em;">
  <li>A breakout that can't hold above a key prior high.</li>
  <li>A reclaim that gets reversed on volume.</li>
  <li>A low volume drift turns into a high-volume rejection.</li>
  <li>Avoid cutting too early trap, or never selling trap. If the story didn't change - keep holding. If the story changed, don't wait for the market to validate your idea.</li>
  <li>Think in decision zones, not targets.</li>
  <li>Stops should be mechanical, not emotional.</li>
  <li>Letting winners run is where you actually get paid.</li>
</ul>

<h2 style="font-size: 1.8em; font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em;">Part 4: Red Flags</h2>
<ul style="margin-left: 2em; margin-bottom: 1em;">
  <li>You're trading bigger after a loss</li>
  <li>You're justifying a bad trade with "it will bounce"</li>
  <li>You're changing mental stop because "you believe"</li>
</ul>

<p style="margin-bottom: 0.5em;"><strong>When this happens, reset:</strong></p>
<ul style="margin-left: 2em; margin-bottom: 1em;">
  <li>Cut size</li>
  <li>Take 24 hours</li>
  <li>Review without judgement</li>
</ul>

<p style="margin-bottom: 1em;"><em>If you wait until you're in a tailspin, it's already too late.</em></p>

<h2 style="font-size: 1.8em; font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em;">Part 5: Volatility</h2>

<h3 style="font-size: 1.5em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em;">1) Low Volatility Environment - VIX is under 15</h3>
<ul style="margin-left: 2em; margin-bottom: 1em;">
  <li>Setups take longer to develop.</li>
  <li>Breakout grinds.</li>
  <li>False moves are common.</li>
  <li>Position size can increase due to narrow expected ranges.</li>
  <li>Options premium is cheaper, long volatility makes sense if you expect regime change.</li>
  <li>Trade less, hold longer, use wider stops, be patient with scaling, there's no rush, trends develop slowly.</li>
</ul>

<h3 style="font-size: 1.5em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em;">2) Moderate volatility - VIX is between 15 and 22</h3>
<ul style="margin-left: 2em; margin-bottom: 1em;">
  <li>Price respects structure.</li>
  <li>Catalysts matter, but don't fully dominate.</li>
  <li>Focus on clean setups with structure and narrative.</li>
</ul>

<h3 style="font-size: 1.5em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em;">3) High Volatility - VIX is above 23</h3>
<ul style="margin-left: 2em; margin-bottom: 1em;">
  <li>Liquidity thins out, spreads widen, slippage spikes.</li>
  <li>Diversification vanishes.</li>
  <li>Strong names sell off anyway and everything is beta.</li>
  <li>Cut position sizes, trade smaller.</li>
  <li>Intraday and short term trading is preferred. Overnight should be protected (volatility products, options).</li>
</ul>

<h2 style="font-size: 1.8em; font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em;">Part 6: Final thoughts/action items</h2>
<ul style="margin-left: 2em; margin-bottom: 1em;">
  <li>Categorize your setups (Narrative / Event / Mean Reversion (Technical) / Positioning (hedge)</li>
  <li>With time each setup type should have a checklist, entry criteria and sizing rules...</li>
  <li>Create a journal, document the setup type, conviction score, entry reason, and outcome vs. expectations - what validates or invalidates the idea.</li>
</ul>
`;

const DEFAULT_CHANGELOG_CONTENT = `
<h1 style="font-size: 2.5em; font-weight: bold; margin-bottom: 1em;">Change Log</h1>

<h2 style="font-size: 1.8em; font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em;">[Date] - Initial Version</h2>
<ul style="margin-left: 2em; margin-bottom: 1em;">
  <li>Added initial trading notes structure.</li>
  <li>Implemented save and edit functionality.</li>
  <li>Integrated read-aloud feature.</li>
</ul>

<h2 style="font-size: 1.8em; font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em;">[Date] - Feature Update</h2>
<ul style="margin-left: 2em; margin-bottom: 1em;">
  <li>Reduced overall font sizes for better readability.</li>
  <li>Added Change Log tab for tracking modifications.</li>
  <li>Improved voice selection for read-aloud.</li>
</ul>
`;

export default function Notes() {
  const [content, setContent] = useState("");
  const [changeLogContent, setChangeLogContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [isReading, setIsReading] = useState(false);
  const [activeTab, setActiveTab] = useState("trading-notes");
  const [voices, setVoices] = useState([]);
  const [showVoiceControls, setShowVoiceControls] = useState(false);
  
  // Voice settings with localStorage persistence
  const [selectedVoice, setSelectedVoice] = useState(() => {
    return localStorage.getItem('notesVoiceIndex') || '0';
  });
  const [rate, setRate] = useState(() => {
    return parseFloat(localStorage.getItem('notesVoiceRate') || '0.9');
  });
  const [pitch, setPitch] = useState(() => {
    return parseFloat(localStorage.getItem('notesVoicePitch') || '1.0');
  });
  const [volume, setVolume] = useState(() => {
    return parseFloat(localStorage.getItem('notesVoiceVolume') || '1.0');
  });

  useEffect(() => {
    const loadData = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setContent(currentUser.trading_notes || DEFAULT_CONTENT);
      setChangeLogContent(currentUser.change_log || DEFAULT_CHANGELOG_CONTENT);
    };

    const loadVoices = () => {
      if (window.speechSynthesis) {
        const updateVoices = () => {
          const availableVoices = window.speechSynthesis.getVoices();
          
          // Prioritize quality voices
          const sortedVoices = availableVoices.sort((a, b) => {
            // Prioritize English voices
            const aEnglish = a.lang.startsWith('en') ? 1 : 0;
            const bEnglish = b.lang.startsWith('en') ? 1 : 0;
            if (aEnglish !== bEnglish) return bEnglish - aEnglish;
            
            // Prioritize premium/enhanced voices
            const qualityKeywords = ['premium', 'enhanced', 'natural', 'neural', 'google', 'microsoft', 'samantha', 'alex'];
            const aQuality = qualityKeywords.some(kw => a.name.toLowerCase().includes(kw)) ? 1 : 0;
            const bQuality = qualityKeywords.some(kw => b.name.toLowerCase().includes(kw)) ? 1 : 0;
            if (aQuality !== bQuality) return bQuality - aQuality;
            
            // Fallback to alphabetical sort by name
            return a.name.localeCompare(b.name);
          });
          
          setVoices(sortedVoices);
        };
        
        window.speechSynthesis.onvoiceschanged = updateVoices;
        updateVoices(); // Initial call
      }
    };

    loadData();
    loadVoices();
  }, []);

  // Save voice settings to localStorage
  useEffect(() => {
    localStorage.setItem('notesVoiceIndex', selectedVoice);
  }, [selectedVoice]);

  useEffect(() => {
    localStorage.setItem('notesVoiceRate', rate.toString());
  }, [rate]);

  useEffect(() => {
    localStorage.setItem('notesVoicePitch', pitch.toString());
  }, [pitch]);

  useEffect(() => {
    localStorage.setItem('notesVoiceVolume', volume.toString());
  }, [volume]);

  const handleSave = async () => {
    setIsSaving(true);
    if (activeTab === "trading-notes") {
      await base44.auth.updateMe({ trading_notes: content });
    } else if (activeTab === "change-log") {
      await base44.auth.updateMe({ change_log: changeLogContent });
    }
    setIsEditing(false);
    setIsSaving(false);
  };

  const stripHtml = (html) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const handleReadAloud = () => {
    if (!window.speechSynthesis) {
      console.warn("Speech synthesis not supported in this browser.");
      return;
    }

    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    const textToRead = activeTab === "trading-notes" ? stripHtml(content) : stripHtml(changeLogContent);
    const utterance = new SpeechSynthesisUtterance(textToRead);
    
    // Apply selected voice
    if (voices.length > 0) {
      const voiceIndex = parseInt(selectedVoice);
      if (voices[voiceIndex]) {
        utterance.voice = voices[voiceIndex];
      } else if (voices[0]) { // Fallback to first available voice if selected index is invalid
        utterance.voice = voices[0];
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
        <div className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-black text-gray-900 mb-4">Trading Notes & Rules</h1>
            <p className="text-2xl text-gray-700 font-bold">Your trading strategy and guidelines</p>
          </div>
          <div className="flex gap-4">
            {!isEditing && (
              <>
                <Button
                  onClick={() => setShowVoiceControls(!showVoiceControls)}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-2xl h-16 px-8 border-4 border-purple-800 rounded-none shadow-xl font-black"
                >
                  {showVoiceControls ? "Hide" : "Voice"} Settings
                </Button>
                <Button
                  onClick={handleReadAloud}
                  className={`${isReading ? 'bg-red-600 hover:bg-red-700 border-red-800' : 'bg-blue-600 hover:bg-blue-700 border-blue-800'} text-white text-2xl h-16 px-8 border-4 rounded-none shadow-xl font-black`}
                >
                  {isReading ? <VolumeX className="w-6 h-6 mr-3" /> : <Volume2 className="w-6 h-6 mr-3" />}
                  {isReading ? "Stop" : "Read Aloud"}
                </Button>
              </>
            )}
            {isEditing ? (
              <>
                <Button
                  onClick={() => {
                    if (activeTab === "trading-notes") {
                      setContent(user?.trading_notes || DEFAULT_CONTENT);
                    } else if (activeTab === "change-log") {
                      setChangeLogContent(user?.change_log || DEFAULT_CHANGELOG_CONTENT);
                    }
                    setIsEditing(false);
                  }}
                  className="bg-gray-400 hover:bg-gray-500 text-white text-2xl h-16 px-8 border-4 border-gray-600 rounded-none shadow-xl font-black"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700 text-white text-2xl h-16 px-8 border-4 border-green-800 rounded-none shadow-xl font-black"
                >
                  <Save className="w-6 h-6 mr-3" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-gray-900 hover:bg-gray-800 text-white text-2xl h-16 px-8 border-4 border-gray-900 rounded-none shadow-xl font-black"
              >
                <Edit className="w-6 h-6 mr-3" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {!isEditing && showVoiceControls && (
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-16 text-3xl mb-4 bg-gray-100 rounded-none shadow-inner">
            <TabsTrigger 
              value="trading-notes" 
              className="data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=active]:shadow-lg font-black text-gray-700 hover:bg-gray-200"
            >
              Trading Notes
            </TabsTrigger>
            <TabsTrigger 
              value="change-log" 
              className="data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=active]:shadow-lg font-black text-gray-700 hover:bg-gray-200"
            >
              Change Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trading-notes">
            <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl overflow-hidden">
              <CardContent className="p-8">
                {isEditing && activeTab === "trading-notes" ? (
                  <div className="min-h-[600px]">
                    <ReactQuill
                      value={content}
                      onChange={setContent}
                      modules={modules}
                      className="h-[calc(100%-100px)]"
                      theme="snow"
                    />
                  </div>
                ) : (
                  <div 
                    className="prose prose-lg max-w-none"
                    dangerouslySetInnerHTML={{ __html: content }}
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

          <TabsContent value="change-log">
            <Card className="bg-white border-8 border-gray-900 rounded-none shadow-2xl overflow-hidden">
              <CardContent className="p-8">
                {isEditing && activeTab === "change-log" ? (
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
        </Tabs>
      </div>
    </div>
  );
}
