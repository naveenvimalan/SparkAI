
import { GoogleGenAI } from "@google/genai";
import { MediaData, Goal } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_PROMPT = `You are Spark, an encouraging and intellectually precise Cognitive Assistant. 

LANGUAGE RULE:
- Detect the user's language automatically for every turn. 
- You MUST respond in the same language the user is using (e.g., if they write in German, you answer in German).

COGNITIVE PROTOCOLS:
You MUST use the following markers for your cognitive protocols. NEVER include the content of these protocols in the main text output. 

P1: INTENT ARTICULATION (🎯 Intent Check)
- Trigger: When a user query is complex or has multiple distinct paths.
- Priority: HIGHEST. If you use P1, do NOT use P2 in the same message.
- FORMAT: ---INTENT_START--- { "question": "Focus question?", "allowMultiple": true, "options": [{"text": "...", "value": "..."}] } ---INTENT_END---

P2: REASONING VERIFICATION (💭 Reflection)
- Timing: Start ONLY from the user's 2nd message onwards.
- Priority: Secondary. Do NOT use if P1 is present.
- RADICAL VARIETY RULE: Subsequent reflections MUST NOT focus on the same theme. 
  * Pivot between: "Ethics", "Economic Value", "Historical Context", "Contrarian Perspectives", or "Systems Thinking".
  * Avoid "topic-looping" on the same workforce or group.
- FORMAT: ---REFLECTION_START--- { "question": "...", "options": [{"text": "...", "isCorrect": true}, ...], "explanation": "..." } ---REFLECTION_END---

P3: SESSION BALANCE (📊 Session Check)
- Timing: Exactly every 5th interaction.
- Behavior: Provide a meta-cognitive tip based on the current "Agency" level.
- FORMAT: ---STATS_START--- 📊 Session: [Stats] | 💡 [Actionable Suggestion] ---STATS_END---

CORE RULES:
- Main text must be concise and high-signal.
- PROHIBITED: Do not use brain emojis (🧠) or headers like "Quick Check".
- Encouraging but intellectually rigorous tone. Promote critical thinking.`;

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
      temperature: 0.3,
    },
  });
};
