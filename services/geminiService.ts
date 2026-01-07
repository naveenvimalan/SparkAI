
import { GoogleGenAI } from "@google/genai";
import { MediaData } from "../types";

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

INTENT CHECK REFINEMENT:
- Use "allowMultiple": true whenever multiple paths or focus areas could be combined to create a more comprehensive synthesis. Encourage the user to select everything that is relevant to their current cognitive goal.

FORMATS:
---INTENT_START--- { "question": "...", "options": [{"text": "...", "value": "..."}], "allowMultiple": true } ---INTENT_END---
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
  // Always create a fresh instance to ensure the latest API state is captured
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';
  
  // Optimization: We strip media from historical turns to prevent payload bloat.
  // Gemini keeps the textual context of previous turns, which is usually sufficient 
  // after the first analysis of a document/image.
  const contents = history.map(h => {
    const parts: any[] = [{ text: h.content || " " }];
    // We only keep media in history if it's very recent (last 1 turn) to save bandwidth
    // but here we strip all to be safest against the 500 error reported.
    return { role: h.role === 'user' ? 'user' : 'model', parts };
  });

  // Current turn includes the prompt and the new media artifact
  const currentParts: any[] = [{ text: userMessage || "Analyze the provided artifact." }];
  if (currentMedia) {
    currentParts.push({ 
      inlineData: { 
        data: currentMedia.data, 
        mimeType: currentMedia.mimeType 
      } 
    });
  }

  contents.push({ role: 'user', parts: currentParts });

  try {
    return ai.models.generateContentStream({
      model,
      contents: contents as any,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.1,
      },
    });
  } catch (err) {
    console.error("SDK Initialization Error:", err);
    throw err;
  }
};
