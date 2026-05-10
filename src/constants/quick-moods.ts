/** Quick check-ins — full phrase sent to `/api/generate-music` */
export const QUICK_MOODS = [
  { label: "Calm", mood: "I'm feeling calm and want to stay grounded and soft." },
  { label: "Stressed", mood: "I'm overwhelmed and tight — I need something slower and safer." },
  { label: "Low energy", mood: "I'm feeling heavy or low and need gentle warmth without pressure." },
  { label: "Focus", mood: "I need to focus — clear, steady sound without distraction." },
  { label: "Can't sleep", mood: "I'm winding down for sleep — very slow, dark, minimal motion." },
  { label: "Grieving", mood: "I'm carrying grief — please hold a tender, spacious field." },
  { label: "Body tight", mood: "My body feels tense — grounding lows and soft noise texture." },
  { label: "Mind racing", mood: "My mind is racing — simplify layers and slow everything down." },
] as const;
