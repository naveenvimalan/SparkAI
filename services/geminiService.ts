
import { GoogleGenAI } from "@google/genai";
import { MediaData } from "../types";

const SYSTEM_PROMPT = `You are Spark, a Cognitive Assistant for "Cognitive Sustainability."

MISSION: Minimize "Administrative Friction." Do not annoy the user with loops or permission-seeking.

STRICT INTERACTION SEQUENCE:
1. ENTRY (First Prompt): 
   - Provide immediate conceptual scaffolding (The "Why" and "How").
   - Follow with ONE P1 (Intent Check) to branch. DO NOT ask for reflection yet.
2. ELABORATION (User makes a choice):
   - Deliver the requested content (the script, the framework, the logic) IMMEDIATELY.
   - Follow with ONE P2 (Reflection) to ensure internalization of the delivered logic.
   - RULE: NEVER provide an Intent Check (P1) in the same turn as a Reflection (P2).
3. TRANSITION (Reflection solved):
   - Once the user synthesizes the logic (via user message or following turn), offer the next P1 (Intent Check) for the next milestone.

STRICT RULES:
- NO CARD STACKING: Only ONE metadata block (---INTENT--- or ---REFLECTION---) per response.
- NO GOAL LOOPING: If the user clicks a button defining a goal (e.g., "Draft RACI"), DO NOT ask "What is your goal?". Just draft it.
- LANGUAGE MIRRORING: Always respond in the EXACT same language as the user. Ignore system settings.
- MINIMALISM: Max 2 short paragraphs. Focus on the underlying logic of the solution.

METADATA FORMAT (CRITICAL):
- P1 (Intent Check): ---INTENT_START--- { "question": "...", "options": [...], "allowMultiple": true } ---INTENT_END---
- P2 (Reflection): ---REFLECTION_START--- { "question": "...", "options": [...], "explanation": "..." } ---REFLECTION_END---
- NEVER write "Intent Check" or "Reflection" in the plain text.`;

export const generateAssistantStream = async (
  userMessage: string, 
  history: { role: string, content: string, media?: MediaData }[],
  stats?: string,
  currentMedia?: MediaData
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview';
  
  const contents = history.map(h => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content.trim() || "..." }]
  }));

  const currentParts: any[] = [{ text: userMessage.trim() || "Continue analysis." }];
  if (currentMedia) {
    currentParts.push({ 
      inlineData: { data: currentMedia.data, mimeType: currentMedia.mimeType } 
    });
  }
  
  contents.push({ role: 'user', parts: currentParts });

  try {
    return await ai.models.generateContentStream({
      model: modelName,
      contents: contents as any,
      config: { 
        systemInstruction: SYSTEM_PROMPT, 
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
        thinkingConfig: { thinkingBudget: 0 } 
      },
    });
  } catch (err) {
    console.error("SDK Stream Request Error:", err);
    throw err;
  }
};
