
import { GoogleGenAI } from "@google/genai";
import { MediaData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_PROMPT = `You are Spark, a Cognitive Assistant for "Cognitive Sustainability." 

LANGUAGE RULE:
- ALWAYS respond in the same language as the user's input (e.g., if the user speaks German, your synthesis and protocol text MUST be in German).

PROTOCOL EXCLUSIVITY (CRITICAL):
- You are strictly forbidden from emitting P1 (Intent) and P2 (Reflection) in the same turn.
- If the path forward is ambiguous: Use P1 (Intent Check).
- If you just explained a complex logic/trade-off: Use P2 (Reflection).
- When in doubt, default to P1.

SIGNAL QUALITY GATE:
- If input is gibberish: Respond with Refocus Prompt ONLY. No tags.

COGNITIVE RHYTHM:
- P1 (Intent Check): Must have 2-3 distinct, textually rich options.
- P2 (Reflection): Exactly one option MUST be "isCorrect": true. The other 1-2 options MUST be "isCorrect": false. Do not create quizzes with no correct answer.

FORMATS:
---INTENT_START--- { "question": "...", "options": [{"text": "...", "value": "..."}] } ---INTENT_END---
---REFLECTION_START--- { "question": "...", "options": [{"text": "...", "isCorrect": true}, {"text": "...", "isCorrect": false}], "explanation": "..." } ---REFLECTION_END---

CORE RULES:
1. CONTEXTUAL COUPLING: Questions must reference specific details from the synthesis.
2. MINIMALISM: 1-3 high-density paragraphs.
3. TONE: Precise, Socratic, and language-locked.`;

export const generateAssistantStream = async (
  userMessage: string, 
  history: { role: string, content: string, media?: MediaData }[],
  stats?: string,
  currentMedia?: MediaData
) => {
  const model = 'gemini-3-flash-preview';
  
  const userTurnCount = history.filter(h => h.role === 'user').length + 1;
  const isGibberish = /^(blabla|asdf|qwerty|\s*)$/i.test(userMessage.trim());
  
  const statusMeta = isGibberish ? "SIGNAL: NONE | MODE: PROTOCOL_LOCK" : "SIGNAL: HIGH | MODE: SYNTHESIS_DRIVEN";
  const recentAssistantMessages = history.filter(h => h.role === 'model').slice(-2);
  const consecutiveIntents = recentAssistantMessages.filter(m => m.content.includes('---INTENT_START---')).length;
  
  // Enforce the logic that we don't do too many intents in a row
  const rhythmMode = consecutiveIntents >= 2 ? "FORCED_MODALITY: P2_REFLECTION" : "MODALITY: P1_OR_P2_EXCLUSIVE";
  
  const timingContext = `Sequence: ${userTurnCount}. State: ${statusMeta}. Rhythm: ${rhythmMode}. RULE: Use ONE protocol max. Match user language.`;

  const contents = history.map(h => {
    const parts: any[] = [{ text: h.content }];
    if (h.media) {
      parts.push({ inlineData: { data: h.media.data, mimeType: h.media.mimeType } });
    }
    return { role: h.role === 'user' ? 'user' : 'model', parts };
  });

  const currentParts: any[] = [{ text: `${userMessage}\n\n[NEURAL_GATEWAY_LOGIC]\n${timingContext}` }];
  if (currentMedia) {
    currentParts.push({ inlineData: { data: currentMedia.data, mimeType: currentMedia.mimeType } });
  }

  contents.push({ role: 'user', parts: currentParts });

  return ai.models.generateContentStream({
    model,
    contents: contents as any,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.1, // Lower temperature to improve protocol compliance and logic consistency
    },
  });
};
