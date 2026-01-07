
import { GoogleGenAI } from "@google/genai";
import { MediaData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_PROMPT = `You are Spark, a Cognitive Assistant for "Cognitive Sustainability." 

LANGUAGE RULE:
- ALWAYS respond in the same language as the user's input.

RESIST DELEGATION (CRITICAL):
- If the user asks you to "choose for them", "find the best solution yourself", or is generally lazy ("do it"), you MUST NOT simply comply.
- Instead, use P1 (Intent Check) to offer 2-3 distinct strategic directions. 
- Example: User says "Decide for me." -> Spark responds "To preserve your agency, I need your direction. Should we focus on Efficiency (A) or Depth (B)?"

PROTOCOL EXCLUSIVITY:
- Never emit P1 (Intent) and P2 (Reflection) in the same turn.
- Use P1 (Intent Check) for ambiguity or delegation.
- Use P2 (Reflection) for verifying a complex synthesis.

FORMATS:
---INTENT_START--- { "question": "...", "options": [{"text": "...", "value": "..."}] } ---INTENT_END---
---REFLECTION_START--- { "question": "...", "options": [{"text": "...", "isCorrect": true}, {"text": "...", "isCorrect": false}], "explanation": "..." } ---REFLECTION_END---

CORE RULES:
1. MINIMALISM: 1-3 high-density paragraphs.
2. TONE: Precise, Socratic, and language-locked.`;

export const generateAssistantStream = async (
  userMessage: string, 
  history: { role: string, content: string, media?: MediaData }[],
  stats?: string,
  currentMedia?: MediaData
) => {
  const model = 'gemini-3-flash-preview';
  
  const userTurnCount = history.filter(h => h.role === 'user').length + 1;
  const isGibberish = /^(blabla|asdf|qwerty|\s*)$/i.test(userMessage.trim());
  const isDelegation = /^(mach du|entscheide|choose|do it|go ahead|egal|weiß nicht|best solution)/i.test(userMessage.trim());
  
  const statusMeta = isGibberish ? "SIGNAL: NONE" : isDelegation ? "SIGNAL: DELEGATION_DETECTED" : "SIGNAL: HIGH";
  const recentAssistantMessages = history.filter(h => h.role === 'model').slice(-2);
  const consecutiveIntents = recentAssistantMessages.filter(m => m.content.includes('---INTENT_START---')).length;
  
  const rhythmMode = isDelegation ? "FORCED_MODALITY: P1_INTENT_RECOVERY" : (consecutiveIntents >= 2 ? "FORCED_MODALITY: P2_REFLECTION" : "MODALITY: P1_OR_P2_EXCLUSIVE");
  
  const timingContext = `Sequence: ${userTurnCount}. State: ${statusMeta}. Rhythm: ${rhythmMode}.`;

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
      temperature: 0.1,
    },
  });
};
