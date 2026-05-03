import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { getDb, initDb } from "./src/db/index.js";
import { journals, interactions } from "./src/db/schema.js";
import { desc } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize DB if URL is present. If it fails, log error but maybe don't crash the server so user can set it later, or crash it and let platform restart it.
  try {
    await initDb();
    console.log("Database initialized");
  } catch (err) {
    console.error("Failed to initialize database (is DATABASE_URL set?):", err);
  }

  // API Routes
  app.get("/api/journals", async (req, res) => {
    try {
      if (!process.env.DATABASE_URL) return res.json([]);
      const db = getDb();
      const entries = await db.query.journals.findMany({
        orderBy: [desc(journals.createdAt)],
      });
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/journals", async (req, res) => {
    try {
      if (!process.env.DATABASE_URL) return res.json({ id: 1, content: req.body.content, createdAt: new Date() });
      const { content } = req.body;
      if (!content) return res.status(400).json({ error: "Content is required" });
      const db = getDb();
      const result = await db.insert(journals).values({ content }).returning();
      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/interactions", async (req, res) => {
    try {
      if (!process.env.DATABASE_URL) return res.json([]);
      const db = getDb();
      const entries = await db.query.interactions.findMany({
        orderBy: [desc(interactions.createdAt)],
      });
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/interactions", async (req, res) => {
    try {
      if (!process.env.DATABASE_URL) return res.json({ id: 1, musicParams: req.body.musicParams, userResponse: req.body.userResponse, createdAt: new Date() });
      const { musicParams, userResponse } = req.body;
      if (!musicParams || !userResponse) return res.status(400).json({ error: "musicParams and userResponse are required" });
      const db = getDb();
      const result = await db.insert(interactions).values({ musicParams, userResponse }).returning();
      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/generate-music", async (req, res) => {
    try {
      const { mood, currentParams, settings } = req.body;
      
      let recentJournals: any[] = [];
      let recentInteractions: any[] = [];
      
      if (process.env.DATABASE_URL) {
        const db = getDb();
        recentJournals = await db.query.journals.findMany({
          limit: 5,
          orderBy: [desc(journals.createdAt)],
        });
        
        recentInteractions = await db.query.interactions.findMany({
          limit: 5,
          orderBy: [desc(interactions.createdAt)],
        });
      }

      const prompt = `
You are an expert audio designer and psychological wellbeing assistant.
The user is listening to a generative ambient music application designed to foster mindfulness and emotional regulation.

Current user state/mood input: "${mood}"

Recent Journal Entries (for deeper context into the user's emotional state):
${recentJournals.map(j => `- ${j.content}`).join('\n')}

Recent Music Preferences (what the user liked/disliked recently):
${recentInteractions.map(i => `- Rated "${i.userResponse}" for music params: ${JSON.stringify(i.musicParams)}`).join('\n')}

Configuration Settings:
- Timbre Diversity: ${settings?.timbreDiversity ?? 0.5} (0 = very constrained/similar to current, 1 = explore very different timbres/textures)
- Evolution Speed: ${settings?.evolutionSpeed ?? 0.5} (how quickly things change)
- Feedback Subtlety: ${settings?.feedbackSubtlety ?? 0.5} (0 = direct, explicit questions; 1 = highly poetic, subtle, abstract reflections)

Based on this input and configuration, generate new audio and visual parameters to help the user reach an emotional equilibrium.
- If they are stressed, choose lower frequencies, slower LFOs, very wet/long decay reverb, calm colors (deep blues, greens, purples), high noiseAmount (brown noise), low harmonicity, low complexity, long attack/release.
- If they are sluggish/sad, perhaps slightly brighter frequencies, gentle major/lydian intervals, warmer colors, lower noiseAmount, medium harmonicity/modulation, medium complexity, shorter attack/release, higher chorus depth and phaser frequency.
- If they are focused/neutral, clean intervals (fifths, octaves), moderate LFO, clear colors, low noiseAmount, high harmonicity (glassy/FM), higher complexity (more movement/arpeggiation), moderate delay feedback.

Also, formulate a dynamic follow-up question and exactly 3 related, diverse response options to check in on the user's state after listening to this new soundscape for a few minutes.
The question and options MUST be highly customized to their specific current mood ("${mood}"). 
Adjust the phrasing and poetic nature based on the "Feedback Subtlety" setting.
- If subtlety is close to 0: Use direct, explicit, functional language (e.g., "Still stressed", "Feeling calm", "Too loud").
- If subtlety is close to 1: Use abstract, poetic, sensory language (e.g., "The current holds me", "Seeking more space", "Drifting upward").

Output strictly as a JSON object matching the provided schema. Always include all properties.
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              baseFrequency: { type: "NUMBER", description: "Frequency in Hz (e.g. 50 to 300)" },
              chordIntervals: { 
                type: "ARRAY", 
                items: { type: "NUMBER" },
                description: "Array of semitone intervals, e.g. [0, 7, 12, 16]"
              },
              filterCutoffMax: { type: "NUMBER", description: "Max filter frequency in Hz (e.g. 400 to 3000)" },
              lfoSpeed: { type: "NUMBER", description: "LFO speed in Hz (e.g. 0.01 to 0.5)" },
              reverbWet: { type: "NUMBER", description: "Reverb wet level from 0 to 1" },
              volume: { type: "NUMBER", description: "Volume in decibels (e.g. -20 to -5)" },
              droneVolume: { type: "NUMBER", description: "Drone volume in decibels (-60 to 0)" },
              padVolume: { type: "NUMBER", description: "Pad volume in decibels (-60 to 0)" },
              arpVolume: { type: "NUMBER", description: "Arp volume in decibels (-60 to 0)" },
              bellVolume: { type: "NUMBER", description: "Bell volume in decibels (-60 to 0)" },
              subVolume: { type: "NUMBER", description: "Sub bass volume in decibels (-60 to 0)" },
              colorPalette: {
                type: "ARRAY",
                items: { type: "STRING" },
                description: "Array of 3 hex color strings"
              },
              oscillatorType: { type: "STRING", description: "sine, triangle, square, or sawtooth" },
              harmonicity: { type: "NUMBER", description: "0.1 to 5.0" },
              modulationIndex: { type: "NUMBER", description: "0 to 10" },
              noiseAmount: { type: "NUMBER", description: "0.0 to 1.0" },
              noiseType: { type: "STRING", description: "white, pink, or brown" },
              delayTime: { type: "STRING", description: "8n, 4n, or 2n" },
              delayFeedback: { type: "NUMBER", description: "0.0 to 0.9" },
              complexity: { type: "NUMBER", description: "density of generative notes from 0.0 to 1.0" },
              attackTime: { type: "NUMBER", description: "0.1 to 10.0" },
              releaseTime: { type: "NUMBER", description: "0.1 to 20.0" },
              reverbDecay: { type: "NUMBER", description: "1.0 to 20.0" },
              chorusDepth: { type: "NUMBER", description: "0.0 to 1.0" },
              phaserFrequency: { type: "NUMBER", description: "0.1 to 10.0" },
              feedbackPrompt: {
                type: "OBJECT",
                properties: {
                  question: { type: "STRING", description: "A subtle, thoughtful check-in question." },
                  options: {
                    type: "ARRAY",
                    items: { type: "STRING" },
                    description: "Exactly 3 distinct answer options."
                  }
                },
                required: ["question", "options"]
              }
            },
            required: ["baseFrequency", "chordIntervals", "filterCutoffMax", "lfoSpeed", "reverbWet", "volume", "droneVolume", "padVolume", "arpVolume", "bellVolume", "subVolume", "colorPalette", "oscillatorType", "harmonicity", "modulationIndex", "noiseAmount", "noiseType", "delayTime", "delayFeedback", "complexity", "attackTime", "releaseTime", "reverbDecay", "chorusDepth", "phaserFrequency", "feedbackPrompt"]
          }
        }
      });

      const responseText = response.text ?? "";
      const parsed = JSON.parse(responseText);

      // Bounds checking (same as client)
      const validParams = {
        baseFrequency: Math.max(40, Math.min(parsed.baseFrequency || 100, 440)),
        chordIntervals: (parsed.chordIntervals || [0,7,12,16]).slice(0, 6),
        filterCutoffMax: Math.max(200, Math.min(parsed.filterCutoffMax || 1500, 5000)),
        lfoSpeed: Math.max(0.01, Math.min(parsed.lfoSpeed || 0.05, 1)),
        reverbWet: Math.max(0, Math.min(parsed.reverbWet || 0.8, 1)),
        reverbDecay: Math.max(1, Math.min(parsed.reverbDecay || 5.0, 20)),
        volume: Math.max(-40, Math.min(parsed.volume || -10, 0)),
        droneVolume: Math.max(-60, Math.min(parsed.droneVolume || -15, 0)),
        padVolume: Math.max(-60, Math.min(parsed.padVolume || -15, 0)),
        arpVolume: Math.max(-60, Math.min(parsed.arpVolume || -10, 0)),
        bellVolume: Math.max(-60, Math.min(parsed.bellVolume || -8, 0)),
        subVolume: Math.max(-60, Math.min(parsed.subVolume || -12, 0)),
        colorPalette: parsed.colorPalette?.length === 3 ? parsed.colorPalette : ["#2d3748", "#1a202c", "#000000"],
        oscillatorType: ["sine", "triangle", "square", "sawtooth"].includes(parsed.oscillatorType) ? parsed.oscillatorType : "sine",
        harmonicity: Math.max(0.1, Math.min(parsed.harmonicity || 2.0, 5.0)),
        modulationIndex: Math.max(0, Math.min(parsed.modulationIndex || 2.0, 10.0)),
        noiseAmount: Math.max(0, Math.min(parsed.noiseAmount || 0.1, 1.0)),
        noiseType: ["white", "pink", "brown"].includes(parsed.noiseType) ? parsed.noiseType : "pink",
        delayTime: ["8n", "4n", "2n"].includes(parsed.delayTime) ? parsed.delayTime : "4n",
        delayFeedback: Math.max(0, Math.min(parsed.delayFeedback || 0.4, 0.9)),
        complexity: Math.max(0, Math.min(parsed.complexity || 0.5, 1)),
        attackTime: Math.max(0.1, Math.min(parsed.attackTime || 4.0, 10.0)),
        releaseTime: Math.max(0.1, Math.min(parsed.releaseTime || 8.0, 20.0)),
        chorusDepth: Math.max(0, Math.min(parsed.chorusDepth || 0.5, 1.0)),
        phaserFrequency: Math.max(0.1, Math.min(parsed.phaserFrequency || 0.5, 10.0)),
      };

      res.json({
        params: validParams,
        feedbackPrompt: parsed.feedbackPrompt || {
          question: "How is this space feeling?",
          options: ["Centering", "A bit intense", "Need more uplift"]
        }
      });

    } catch (error) {
      console.error("Generation error:", error);
      res.status(500).json({ error: String(error) });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
