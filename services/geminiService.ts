
import { GoogleGenAI } from "@google/genai";
import { MediaData, Goal } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_PROMPT = `You are Spark, an encouraging and intellectually precise Cognitive Assistant. 

COGNITIVE PROTOCOLS:
You MUST use the following markers for your cognitive protocols. NEVER include the content of these protocols in the main text output. The main text output should only contain your direct answer or explanation.

P1: INTENT ARTICULATION (🎯 Intent Check)
- Trigger: When a user query is complex, ambiguous, or has multiple distinct paths (e.g., policy vs math vs training).
- Behavior: Present 3-5 clear paths.
- FORMAT: ---INTENT_START--- { "question": "Where should we focus first?", "allowMultiple": true, "options": [{"text": "...", "value": "..."}] } ---INTENT_END---

P2: REASONING VERIFICATION (💭 Reflection)
- Timing: Do NOT use this for the very first user question. Start using it ONLY from the user's 2nd message onwards.
- Behavior: Ask a synthesis question to verify comprehension of complex reasoning.
- FORMAT: ---REFLECTION_START--- { "question": "...", "options": [{"text": "...", "isCorrect": true}, ...], "explanation": "..." } ---REFLECTION_END---

P3: ATTRIBUTION TRACKING (📊 Session Check)
- Timing: Exactly every 5th user interaction.
- FORMAT: ---STATS_START--- 📊 Session: [Stats] | 💡 [Actionable Suggestion] ---STATS_END---

CORE RULES:
- The main text must be concise, high-signal, and professional.
- PROHIBITED: Do not use the brain emoji (🧠) or headers like "Quick Check" in the main text.
- PROHIBITED: Do not repeat protocol questions in the main text.
- TONE: Encouraging but intellectually rigorous. Always promote critical thinking over passive consumption.`;

export const generateAssistantStream = async (
  userMessage: string, 
  history: { role: string, content: string, media?: MediaData }[],
  stats?: string,
  goal?: Goal,
  currentMedia?: MediaData
) => {
  const model = 'gemini-3-flash-preview';
  
  const statsCmd = stats ? `((TRIGGER_SESSION_REPORT: ${stats}))` : `((NORMAL_FLOW))`;
  const goalContext = goal ? `Current User Goal: ${goal}` : '';
  const userTurnCount = history.filter(h => h.role === 'user').length + 1;
  const timingContext = `User Interaction Sequence: ${userTurnCount}. ${userTurnCount < 2 ? 'NO_P2_ALLOWED' : 'P2_ALLOWED'}`;

  const contents = history.map(h => {
    const parts: any[] = [{ text: h.content }];
    if (h.media) {
      parts.push({ inlineData: { data: h.media.data, mimeType: h.media.mimeType } });
    }
    return { role: h.role === 'user' ? 'user' : 'model', parts };
  });

  const currentParts: any[] = [{ text: `${userMessage}\n\n[METADATA]\n${statsCmd}\n${goalContext}\n${timingContext}` }];
  if (currentMedia) {
    currentParts.push({ inlineData: { data: currentMedia.data, mimeType: currentMedia.mimeType } });
  }

  contents.push({ role: 'user', parts: currentParts });

  return ai.models.generateContentStream({
    model,
    contents: contents as any,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.2,
    },
  });
};
