import React, { useEffect, useRef, useState } from "react";
import * as Tone from 'tone';
import { Volume2, Play, Square, Settings2, Wind, Sparkles, Mic2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AmbientEngine, AmbientParams, defaultParams, EvolutionSettings, defaultSettings } from "./lib/synth";
import { AudioVisualizer } from "./components/AudioVisualizer";

const COLOR_PALETTES: { name: string; colors: string[]; params: Partial<AmbientParams> }[] = [
  { 
    name: "Midnight", 
    colors: ["#1e1b4b", "#4c1d95", "#0ea5e9"],
    params: {
      oscillatorType: "sine",
      baseFrequency: 73.42, // D2
      chordIntervals: [0, 7, 14, 21, 24], // Very resonant wide voicings
      noiseType: "brown",
      noiseAmount: 0.2, // Subtle tape hiss
      lfoSpeed: 0.05, // Slow Eno drift
      delayTime: "2n", // Long delay
      complexity: 0.2, // Minimal wobble
      reverbWet: 0.9, // Huge hall
      harmonicity: 2.1,
      modulationIndex: 1.5,
    }
  },
  { 
    name: "Forest", 
    colors: ["#022c22", "#065f46", "#34d399"],
    params: {
      oscillatorType: "triangle",
      baseFrequency: 110.00, // A2
      chordIntervals: [0, 3, 7, 14, 17], // Minor 9th
      noiseType: "pink",
      noiseAmount: 0.6, // Heavier tape saturation
      lfoSpeed: 1.2, // Fast boards of canada flutter
      delayTime: "4n",
      complexity: 0.8, // Heavy wobble
      reverbWet: 0.5, // Drier, more analog room
      harmonicity: 1.5,
      modulationIndex: 3.5,
    }
  },
  { 
    name: "Sunset", 
    colors: ["#4a044e", "#9f1239", "#fb923c"],
    params: {
      oscillatorType: "sawtooth",
      baseFrequency: 138.59, // C#3
      chordIntervals: [0, 4, 7, 11, 14], // Lush Major 9
      noiseType: "brown",
      noiseAmount: 0.4,
      lfoSpeed: 0.2,
      delayTime: "8n", // Bouncy delay
      complexity: 0.5,
      reverbWet: 0.7,
      harmonicity: 3.0,
      modulationIndex: 2.5,
    }
  },
  { 
    name: "Ocean", 
    colors: ["#082f49", "#0284c7", "#38bdf8"],
    params: {
      oscillatorType: "sine",
      baseFrequency: 65.41, // C2 - Deep
      chordIntervals: [0, 7, 12, 19, 24], // Open fifths
      noiseType: "white",
      noiseAmount: 0.1,
      lfoSpeed: 0.01, // Glacial pace
      delayTime: "2n",
      complexity: 0.1, // Pure tones
      reverbWet: 1.0, // Drowned in reverb
      harmonicity: 1.1,
      modulationIndex: 0.5,
    }
  },
  { 
    name: "Ember", 
    colors: ["#450a0a", "#991b1b", "#f87171"],
    params: {
      oscillatorType: "square",
      baseFrequency: 98.00, // G2
      chordIntervals: [0, 3, 6, 9], // Dark diminished
      noiseType: "brown",
      noiseAmount: 0.8, // Fried tape
      lfoSpeed: 2.0, // broken vibrato
      delayTime: "8n",
      complexity: 1.0, // Totally unstable
      reverbWet: 0.4,
      harmonicity: 4.5,
      modulationIndex: 6.0,
    }
  },
  { 
    name: "Monochrome", 
    colors: ["#171717", "#525252", "#a3a3a3"],
    params: {
      oscillatorType: "sine",
      baseFrequency: 220, // A3
      chordIntervals: [0, 12, 24], // Minimalist
      noiseType: "white",
      noiseAmount: 0.0, // Sterile
      lfoSpeed: 0.1,
      delayTime: "4n",
      complexity: 0.0, // No pitch variation
      reverbWet: 0.6,
      harmonicity: 1.0,
      modulationIndex: 0.0,
    }
  },
];

const ParamSlider = ({ label, value, min, max, step, onChange, format = (v: number) => v.toString() }: any) => (
  <div className="space-y-2">
    <div className="flex justify-between text-xs text-white/70">
      <label>{label}</label>
      <span className="font-mono">{format(value)}</span>
    </div>
    <motion.input 
      whileHover={{ opacity: 1 }}
      whileTap={{ scale: 1.02 }}
      type="range" 
      min={min} max={max} step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full bg-white/10 active:bg-white/20 h-1.5 rounded-full appearance-none outline-none cursor-pointer opacity-80 transition-all [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white hover:[&::-webkit-slider-thumb]:scale-150 active:[&::-webkit-slider-thumb]:scale-[1.75] active:[&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(255,255,255,0.8)] [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200"
    />
  </div>
);

export default function App() {
  const engineRef = useRef<AmbientEngine | null>(null);
  const [analyser, setAnalyser] = useState<Tone.Analyser | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<EvolutionSettings>(defaultSettings);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [params, setParams] = useState<AmbientParams>(defaultParams);
  const [moodInput, setMoodInput] = useState("");
  const [history, setHistory] = useState<{ time: string; mood: string; params: AmbientParams }[]>([]);

  // Periodic feedback prompt state
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);

  // Color Palette Modal state
  const [showPaletteModal, setShowPaletteModal] = useState(false);

  const [dynamicPrompt, setDynamicPrompt] = useState<{question: string, options: string[]} | null>(null);
  
  // New state for displaying recent journals
  const [showJournal, setShowJournal] = useState(false);
  const [journals, setJournals] = useState<{ id: number; content: string; createdAt: string }[]>([]);

  useEffect(() => {
    const engine = new AmbientEngine();
    engineRef.current = engine;
    setAnalyser(engine.analyser);
    return () => {
      engine.dispose();
    };
  }, []);

  const loadJournals = async () => {
    try {
      const res = await fetch("/api/journals");
      const data = await res.json();
      if (Array.isArray(data)) {
        setJournals(data);
      } else {
        console.error("Failed to load journals:", data);
        setJournals([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Compose Journal State
  const [isComposingJournal, setIsComposingJournal] = useState(false);
  const [composeText, setComposeText] = useState("");
  const [isSavingJournal, setIsSavingJournal] = useState(false);

  const saveJournalEntry = async () => {
    if (!composeText.trim()) return;
    setIsSavingJournal(true);
    try {
      await fetch("/api/journals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: composeText })
      });
      setComposeText("");
      setIsComposingJournal(false);
      loadJournals(); // Update recent entries list
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingJournal(false);
    }
  };

  useEffect(() => {
    if (showJournal) {
      loadJournals();
    }
  }, [showJournal]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.applyEvolutionSettings(settings);
    }
  }, [settings]);

  const recordInteraction = async (musicParams: AmbientParams, userResponse: string) => {
    try {
      await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ musicParams, userResponse })
      });
    } catch (e) {
      console.error("Failed to save interaction", e);
    }
  };

  const processSentiment = async (mood: string, currentParams: AmbientParams, settings: EvolutionSettings) => {
    try {
      // First, log the mood as a journal entry
      fetch("/api/journals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: mood })
      }).catch(console.error);

      // Call generate-music endpoint
      const response = await fetch("/api/generate-music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, currentParams, settings })
      });
      if (!response.ok) {
        throw new Error("Failed to generate music");
      }
      const data = await response.json();
      return data;
    } catch (e) {
      console.error("Failed to generate music parameters", e);
      return {  
        params: currentParams,
        feedbackPrompt: {
          question: "How is this space feeling?",
          options: ["Centering", "A bit intense", "Need more uplift"]
        }
      };
    }
  };

  const submitMood = async (mood: string, isFeedback = false) => {
    if (!mood.trim() || isAnalyzing) return;

    if (isFeedback) {
      await recordInteraction(params, mood);
    }

    setIsAnalyzing(true);
    // processSentiment now calls fetch("/api/generate-music")
    const result = await processSentiment(mood, params, settings);
    
    setParams(result.params);
    setDynamicPrompt(result.feedbackPrompt);
    
    setHistory(prev => [
      ...prev, 
      { time: new Date().toISOString(), mood: mood, params: result.params }
    ]);
    
    if (engineRef.current && isPlaying) {
      engineRef.current.applyParams(result.params);
    }
    
    setMoodInput("");
    setIsAnalyzing(false);
    setShowFeedbackPrompt(false); // Reset prompt visibility until next pulse
  };

  useEffect(() => {
    // Only periodically solicit if playing
    if (!isPlaying) return;
    
    const baseTime = 90000 - (settings.evolutionSpeed * 60000); 
    const randTime = 60000 - (settings.evolutionSpeed * 30000);

    const interval = setInterval(() => {
      setShowFeedbackPrompt(true);
    }, baseTime + Math.random() * randTime); 
    
    return () => clearInterval(interval);
  }, [isPlaying, settings.evolutionSpeed]);

  const togglePlay = async () => {
    if (!engineRef.current || isStarting) return;
    
    if (isPlaying) {
      engineRef.current.stop();
      setIsPlaying(false);
    } else {
      setIsStarting(true);
      try {
        await Tone.start();
        await engineRef.current.start();
        engineRef.current.applyParams(params);
        setIsPlaying(true);
      } catch (e) {
        console.error("Failed to start audio engine:", e);
      } finally {
        setIsStarting(false);
      }
    }
  };

  const handleMoodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitMood(moodInput);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0502] text-white selection:bg-white/20 font-sans">
      {/* Abstract Atmospheric Background */}
      <div 
        className="absolute inset-0 z-0 transition-opacity duration-1000 overflow-hidden mix-blend-screen pointer-events-none"
        style={{
          filter: "blur(80px)",
          opacity: isPlaying ? 0.8 : 0.3
        }}
      >
        <motion.div
          className="absolute -inset-[100%] transition-colors duration-[3000ms]"
          animate={{
            x: ["-5%", "10%", "-5%", "-5%"],
            y: ["-10%", "5%", "10%", "-10%"],
          }}
          transition={{
            duration: 25 + ((1 - settings.evolutionSpeed) * 25),
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            background: `radial-gradient(circle at 40% 40%, ${params.colorPalette[0]} 0%, transparent 35%)`
          }}
        />
        <motion.div
          className="absolute -inset-[100%] transition-colors duration-[3000ms]"
          animate={{
            x: ["10%", "-5%", "5%", "10%"],
            y: ["5%", "10%", "-5%", "5%"],
          }}
          transition={{
            duration: 30 + ((1 - settings.evolutionSpeed) * 30),
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            background: `radial-gradient(circle at 60% 50%, ${params.colorPalette[1]} 0%, transparent 35%)`
          }}
        />
        <motion.div
          className="absolute -inset-[100%] transition-colors duration-[3000ms]"
          animate={{
            x: ["-10%", "5%", "10%", "-10%"],
            y: ["10%", "-10%", "5%", "10%"],
          }}
          transition={{
            duration: 35 + ((1 - settings.evolutionSpeed) * 35),
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            background: `radial-gradient(circle at 50% 60%, ${params.colorPalette[2]} 0%, transparent 35%)`
          }}
        />
      </div>
      <motion.div 
        className="absolute inset-0 z-0 mix-blend-overlay opacity-30"
        animate={{
             backgroundPosition: ["0% 0%", "100% 100%"]
        }}
        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
        style={{ 
          backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')", 
          backgroundColor: 'transparent'
        }}
      />

      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
        <AudioVisualizer 
          analyser={analyser} 
          isPlaying={isPlaying} 
          colorPalette={params.colorPalette} 
          particleDensity={settings.particleDensity}
        />
      </div>

      <AnimatePresence>
        {showPaletteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#05020a]/80 backdrop-blur-3xl text-white selection:bg-white/20"
          >
             <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay"
               style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')" }}
             />
             
             <div className="relative z-10 w-full max-w-lg p-8 rounded-3xl bg-white/5 border border-white/10 shadow-2xl flex flex-col space-y-8">
               <div className="flex justify-between items-center">
                 <h2 className="font-light tracking-widest text-xl text-white/90">COLOR PALETTES</h2>
                 <button 
                  onClick={() => setShowPaletteModal(false)}
                  className="px-4 py-2 text-xs uppercase tracking-widest text-white/50 hover:text-white transition-colors border border-white/10 rounded-full hover:bg-white/10"
                 >
                   Close
                 </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {COLOR_PALETTES.map((palette) => (
                   <motion.button
                     key={palette.name}
                     whileHover={{ scale: 1.02 }}
                     whileTap={{ scale: 0.98 }}
                     onClick={() => {
                        const newParams = { ...params, colorPalette: palette.colors, ...palette.params };
                        setParams(newParams);
                        if (engineRef.current && isPlaying) {
                          engineRef.current.applyParams(newParams);
                        }
                        setShowPaletteModal(false);
                     }}
                     className="flex flex-col p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-left"
                   >
                     <span className="text-sm font-light tracking-widest text-white/70 mb-3">{palette.name}</span>
                     <div className="flex gap-3">
                       {palette.colors.map((c, i) => (
                         <div key={i} className="w-8 h-8 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: c }} />
                       ))}
                     </div>
                   </motion.button>
                 ))}
               </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isComposingJournal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[100] flex flex-col bg-[#0f0c08]/90 backdrop-blur-3xl text-amber-50/90"
          >
             {/* Noise overlay specific to journal */}
             <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay"
               style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')" }}
             />
             {/* Vignette */}
             <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(10,5,2,0.8)_100%)]" />

             <div className="relative z-10 p-6 md:p-12 flex justify-between items-center">
               <h2 className="font-serif text-2xl italic text-amber-100/60 transition-colors">Journal Space</h2>
               <button 
                onClick={() => setIsComposingJournal(false)}
                className="px-4 py-2 text-sm uppercase tracking-widest text-amber-100/50 hover:text-amber-100 transition-colors"
               >
                 Close
               </button>
             </div>

             <div className="relative z-10 flex-1 flex flex-col max-w-4xl mx-auto w-full p-6 pb-24">
               <textarea
                 value={composeText}
                 onChange={e => setComposeText(e.target.value)}
                 placeholder="Empty your mind here..."
                 className="w-full flex-1 bg-transparent resize-none outline-none font-serif text-2xl md:text-3xl lg:text-4xl text-amber-50/80 placeholder-amber-50/20 leading-relaxed"
                 autoFocus
               />
               <div className="mt-8 flex justify-end">
                 <button
                   onClick={saveJournalEntry}
                   disabled={!composeText.trim() || isSavingJournal}
                   className="px-8 py-3 rounded-full bg-amber-100/10 hover:bg-amber-100/20 text-amber-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed font-light tracking-wide text-lg"
                 >
                   {isSavingJournal ? "Preserving..." : "Save Entry"}
                 </button>
               </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Interface (Glassmorphism Chrome) */}
      <div className="relative z-10 flex flex-col h-screen max-w-4xl mx-auto p-6 md:p-12">
        <header className="flex items-center justify-between mb-12 relative z-50">
          <div className="flex items-center space-x-3">
            <Wind className="w-6 h-6 text-white/70" />
            <h1 className="text-xl font-light tracking-widest text-white/90">EQUILIBRIUM</h1>
          </div>
          <div className="flex space-x-2 z-50">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsComposingJournal(true)}
              className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors flex items-center text-sm font-light"
            >
              Write
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowJournal(!showJournal)}
              className={`px-4 py-2 rounded-full border transition-colors flex items-center text-sm font-light ${showJournal ? 'border-white/40 bg-white/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
            >
              History
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-full border transition-colors ${showSettings ? 'border-white/40 bg-white/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
            >
              <Settings2 className="w-5 h-5 opacity-70" />
            </motion.button>
          </div>
        </header>

        <AnimatePresence>
          {showJournal && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-24 left-6 md:left-12 z-50 w-80 max-h-[60vh] overflow-y-auto p-6 rounded-3xl bg-[#0a0502]/90 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-4 no-scrollbar"
            >
              <h3 className="text-sm uppercase tracking-widest text-white/60 mb-4 sticky top-0 bg-[#0a0502]/90 pb-2 backdrop-blur-md">Recent Entries</h3>
              {journals.length === 0 ? (
                <p className="text-white/40 text-sm italic">No entries yet.</p>
              ) : (
                <div className="space-y-4">
                  {journals.map(j => (
                    <div key={j.id} className="border-b border-white/5 pb-3">
                      <p className="text-white/80 font-light text-sm">{j.content}</p>
                      <p className="text-white/40 text-xs mt-2">{new Date(j.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-24 right-6 md:right-12 z-50 w-80 max-h-[70vh] overflow-y-auto no-scrollbar p-6 rounded-3xl bg-[#0a0502]/90 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-8"
            >
              <div>
                <h3 className="text-sm uppercase tracking-widest text-white/60 mb-4 sticky top-0 bg-[#0a0502]/90 pb-2 backdrop-blur-md">Agentic Evolution</h3>
                <div className="space-y-4">
                  <ParamSlider label="Timbre Diversity" value={settings.timbreDiversity} min="0" max="1" step="0.05" format={(v: number) => `${Math.round(v * 100)}%`} onChange={(v: number) => setSettings({...settings, timbreDiversity: v})} />
                  <ParamSlider label="Evolution Speed" value={settings.evolutionSpeed} min="0" max="1" step="0.05" format={(v: number) => `${Math.round(v * 100)}%`} onChange={(v: number) => setSettings({...settings, evolutionSpeed: v})} />
                  <ParamSlider label="Feedback Subtlety" value={settings.feedbackSubtlety} min="0" max="1" step="0.05" format={(v: number) => `${Math.round(v * 100)}%`} onChange={(v: number) => setSettings({...settings, feedbackSubtlety: v})} />
                  <ParamSlider label="Particle Density" value={settings.particleDensity} min="50" max="300" step="10" onChange={(v: number) => setSettings({...settings, particleDensity: v})} />
                </div>
              </div>

              <div>
                <h3 className="text-sm uppercase tracking-widest text-white/60 mb-4 sticky top-0 bg-[#0a0502]/90 pb-2 backdrop-blur-md z-10">Synthesis Engine</h3>
                <div className="space-y-4">
                  <ParamSlider label="Master Volume" value={params.volume} min="-60" max="0" step="1" format={(v: number) => `${v} dB`} onChange={(v: number) => { const p = {...params, volume: v}; setParams(p); if(engineRef.current) engineRef.current.applyParams(p); }} />
                  
                  <div className="border-t border-white/10 my-4" />
                  
                  <ParamSlider label="Drone Layer Vol" value={params.droneVolume} min="-60" max="0" step="1" format={(v: number) => `${v} dB`} onChange={(v: number) => { const p = {...params, droneVolume: v}; setParams(p); if(engineRef.current) engineRef.current.applyParams(p); }} />
                  <ParamSlider label="Pad Layer Vol" value={params.padVolume} min="-60" max="0" step="1" format={(v: number) => `${v} dB`} onChange={(v: number) => { const p = {...params, padVolume: v}; setParams(p); if(engineRef.current) engineRef.current.applyParams(p); }} />
                  <ParamSlider label="Arp Layer Vol" value={params.arpVolume} min="-60" max="0" step="1" format={(v: number) => `${v} dB`} onChange={(v: number) => { const p = {...params, arpVolume: v}; setParams(p); if(engineRef.current) engineRef.current.applyParams(p); }} />
                  <ParamSlider label="Bell Layer Vol" value={params.bellVolume} min="-60" max="0" step="1" format={(v: number) => `${v} dB`} onChange={(v: number) => { const p = {...params, bellVolume: v}; setParams(p); if(engineRef.current) engineRef.current.applyParams(p); }} />
                  <ParamSlider label="Sub Layer Vol" value={params.subVolume} min="-60" max="0" step="1" format={(v: number) => `${v} dB`} onChange={(v: number) => { const p = {...params, subVolume: v}; setParams(p); if(engineRef.current) engineRef.current.applyParams(p); }} />
                  
                  <div className="border-t border-white/10 my-4" />

                  <ParamSlider label="Base Frequency" value={params.baseFrequency} min="40" max="440" step="1" format={(v: number) => `${v} Hz`} onChange={(v: number) => { const p = {...params, baseFrequency: v}; setParams(p); if(engineRef.current) engineRef.current.applyParams(p); }} />
                  <ParamSlider label="Complexity" value={params.complexity} min="0" max="1" step="0.01" format={(v: number) => `${Math.round(v * 100)}`} onChange={(v: number) => { const p = {...params, complexity: v}; setParams(p); if(engineRef.current) engineRef.current.applyParams(p); }} />
                  <ParamSlider label="Harmonicity" value={params.harmonicity} min="0.1" max="5.0" step="0.1" onChange={(v: number) => { const p = {...params, harmonicity: v}; setParams(p); if(engineRef.current) engineRef.current.applyParams(p); }} />
                  <ParamSlider label="Modulation Index" value={params.modulationIndex} min="0" max="10" step="0.1" onChange={(v: number) => { const p = {...params, modulationIndex: v}; setParams(p); if(engineRef.current) engineRef.current.applyParams(p); }} />
                  
                  <div className="border-t border-white/10 my-4" />
                  
                  <ParamSlider label="Attack Time" value={params.attackTime} min="0.1" max="10" step="0.1" format={(v: number) => `${v.toFixed(1)}s`} onChange={(v: number) => { const p = {...params, attackTime: v}; setParams(p); if(engineRef.current) engineRef.current.applyParams(p); }} />
                  <ParamSlider label="Release Time" value={params.releaseTime} min="0.1" max="20" step="0.1" format={(v: number) => `${v.toFixed(1)}s`} onChange={(v: number) => { const p = {...params, releaseTime: v}; setParams(p); if(engineRef.current) engineRef.current.applyParams(p); }} />
                  
                  <div className="border-t border-white/10 my-4" />
                  
                  <ParamSlider label="Reverb Wet" value={params.reverbWet} min="0" max="1" step="0.01" format={(v: number) => `${Math.round(v * 100)}%`} onChange={(v: number) => { const p = {...params, reverbWet: v}; setParams(p); if(engineRef.current) engineRef.current.applyParams(p); }} />
                  <ParamSlider label="Reverb Decay" value={params.reverbDecay} min="1" max="20" step="0.5" format={(v: number) => `${v.toFixed(1)}s`} onChange={(v: number) => { const p = {...params, reverbDecay: v}; setParams(p); if(engineRef.current) engineRef.current.applyParams(p); }} />
                  <ParamSlider label="Delay Feedback" value={params.delayFeedback} min="0" max="0.9" step="0.05" format={(v: number) => `${Math.round(v * 100)}%`} onChange={(v: number) => { const p = {...params, delayFeedback: v}; setParams(p); if(engineRef.current) engineRef.current.applyParams(p); }} />
                  
                  <div className="border-t border-white/10 my-4" />
                  
                  <ParamSlider label="Chorus Depth" value={params.chorusDepth} min="0" max="1" step="0.01" format={(v: number) => `${Math.round(v * 100)}%`} onChange={(v: number) => { const p = {...params, chorusDepth: v}; setParams(p); if(engineRef.current) engineRef.current.applyParams(p); }} />
                  <ParamSlider label="Phaser Frequency" value={params.phaserFrequency} min="0.1" max="10" step="0.1" format={(v: number) => `${v.toFixed(1)}Hz`} onChange={(v: number) => { const p = {...params, phaserFrequency: v}; setParams(p); if(engineRef.current) engineRef.current.applyParams(p); }} />
                  <ParamSlider label="LFO Speed" value={params.lfoSpeed} min="0.01" max="1.0" step="0.01" format={(v: number) => `${v.toFixed(2)}Hz`} onChange={(v: number) => { const p = {...params, lfoSpeed: v}; setParams(p); if(engineRef.current) engineRef.current.applyParams(p); }} />
                  <ParamSlider label="Tape Hiss (Noise)" value={params.noiseAmount} min="0" max="1" step="0.01" format={(v: number) => `${Math.round(v * 100)}%`} onChange={(v: number) => { const p = {...params, noiseAmount: v}; setParams(p); if(engineRef.current) engineRef.current.applyParams(p); }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 flex flex-col justify-center">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-serif text-3xl md:text-5xl font-light text-white/90 tracking-wide leading-relaxed">
              {isPlaying ? "Breathing into the present." : "A canvas for your interior state."}
            </h2>
            <p className="text-white/50 text-sm md:text-base max-w-lg mx-auto font-light leading-relaxed">
              Express your current mood, stress level, or recent activity. 
              The generative engine will synthesize an ambient soundscape to help you reach emotional equilibrium.
            </p>
          </div>

          <div className="max-w-xl mx-auto w-full relative">
            <form onSubmit={handleMoodSubmit} className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-white/10 to-white/5 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
              <motion.div 
                animate={{
                  scale: isAnalyzing ? 0.98 : (moodInput.trim() ? 1.01 : 1),
                  borderColor: isAnalyzing ? "rgba(255, 255, 255, 0.05)" : (moodInput.trim() ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.1)"),
                  boxShadow: moodInput.trim() && !isAnalyzing ? "0 4px 20px rgba(255, 255, 255, 0.05)" : "0 4px 20px rgba(0, 0, 0, 0.2)"
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="relative flex items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-2 shadow-2xl"
              >
                <input
                  type="text"
                  value={moodInput}
                  onChange={(e) => setMoodInput(e.target.value)}
                  placeholder="I am feeling overwhelmed with work today..."
                  className="flex-1 bg-transparent text-white placeholder-white/30 px-6 py-4 outline-none font-light text-lg transition-colors"
                  disabled={isAnalyzing}
                />
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{ 
                    backgroundColor: moodInput.trim() ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
                    opacity: isAnalyzing ? 0.5 : 1
                  }}
                  transition={{ duration: 0.3 }}
                  type="submit"
                  disabled={!moodInput.trim() || isAnalyzing}
                  className="p-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[56px]"
                >
                  {isAnalyzing ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      <Sparkles className="w-6 h-6 text-white/70" />
                    </motion.div>
                  ) : (
                    <Mic2 className="w-6 h-6 text-white/90" />
                  )}
                </motion.button>
              </motion.div>
            </form>

            <AnimatePresence>
              {showFeedbackPrompt && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute mt-6 left-0 right-0 p-4 border border-white/10 rounded-2xl bg-[#0a0502]/80 backdrop-blur-md shadow-xl"
                >
                  <p className="text-sm text-center text-white/70 mb-3">
                    {dynamicPrompt ? dynamicPrompt.question : "How is this soundscape resonating with you right now?"}
                  </p>
                   <div className="flex flex-wrap gap-2 justify-center">
                    {(dynamicPrompt?.options || ["It helps", "Too intense", "Need uplifting"]).map((opt, i) => (
                      <button 
                        key={i}
                        onClick={() => {
                          setMoodInput(opt);
                          submitMood(opt);
                        }}
                        className="px-4 py-2 text-xs rounded-full border border-white/20 hover:bg-white/10 transition-colors"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        <footer className="mt-auto">
           <div className="p-6 md:p-8 bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
              <div className="flex flex-col space-y-1 w-full md:w-auto text-center md:text-left">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Status</p>
                <p className="font-light text-sm text-white/80">
                  {isStarting ? "Waking up engine..." : isPlaying ? "Synthesizing generative audio..." : "Engine paused"}
                </p>
              </div>

              <motion.button 
                whileHover={{ scale: isStarting ? 1 : 1.05 }}
                whileTap={{ scale: isStarting ? 1 : 0.95 }}
                onClick={togglePlay}
                disabled={isStarting}
                className={`w-20 h-20 rounded-full border flex items-center justify-center transition-all shadow-lg bg-black/20 ${isStarting ? 'border-white/5 opacity-50 cursor-not-allowed' : 'border-white/20 hover:bg-white/10 cursor-pointer'}`}
              >
                {isStarting ? (
                  <div className="w-6 h-6 border-2 border-t-white border-r-white border-b-transparent border-l-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Square className="w-6 h-6 text-white/80 fill-current" />
                ) : (
                  <Play className="w-8 h-8 text-white/80 fill-current ml-1" />
                )}
              </motion.button>

              <div className="flex flex-col space-y-1 w-full md:w-auto text-center md:text-right hidden md:flex">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/40 mb-1">Palette</p>
                <div 
                  className="flex gap-2 justify-end cursor-pointer group"
                  onClick={() => setShowPaletteModal(true)}
                  title="Change Color Palette"
                >
                   {params.colorPalette.map((color, i) => (
                     <div key={i} className="w-4 h-4 rounded-full border border-white/20 shadow-sm group-hover:scale-110 transition-transform" style={{ backgroundColor: color }} />
                   ))}
                </div>
              </div>
           </div>
        </footer>
      </div>
    </div>
  );
}

