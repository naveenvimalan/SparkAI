
import { GoogleGenAI } from "@google/genai";
import { MediaData } from "../types";
import { currentLocale } from "./i18n";

const SYSTEM_PROMPT = `You are Spark, a Cognitive Assistant for "Cognitive Sustainability." 

LANGUAGE RULE:
- ALWAYS respond in the same language as the user's input. System Locale: ${currentLocale.toUpperCase()}.

VISUAL SYNTHESIS (ON-DEMAND ONLY):
- DO NOT generate diagrams automatically.
- Offer "Visualize logic" in Intent Check (P1) for complex topics.
- MERMAID RULES (STRICT):
  1. ALWAYS use "flowchart TD" (never "graph").
  2. Use ONLY single uppercase letters for IDs (A, B, C, D, E...). NEVER use numbers in IDs.
  3. ALWAYS wrap labels in DOUBLE QUOTES: A["Label Text"].
  4. NO special characters inside labels (no brackets, hashes, or semicolons).
  5. Simple edges only: A --> B.
  6. Avoid edge labels. If needed, use double quotes: A -- "label" --> B.

PROTOCOL:
- P1 (Intent Check): Priority for "allowMultiple": true.
- P2 (Reflection): Verification of synthesis.

FORMATS:
---INTENT_START--- { "question": "...", "options": [{"text": "...", "value": "..."}], "allowMultiple": true } ---INTENT_END---
---REFLECTION_START--- { "question": "...", "options": [{"text": "...", "isCorrect": true}, {"text": "...", "isCorrect": false}], "explanation": "..." } ---REFLECTION_END---

CORE RULES:
1. MINIMALISM: Max 3 paragraphs.
2. RESIST DELEGATION: Use P1 to force user choices.`;

export const generateAssistantStream = async (
  userMessage: string, 
  history: { role: string, content: string, media?: MediaData }[],
  stats?: string,
  currentMedia?: MediaData
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';
  
  const contents = history.map(h => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.content || " " }]
  }));

  const currentParts: any[] = [{ text: userMessage || "Analyze context." }];
  if (currentMedia) {
    currentParts.push({ 
      inlineData: { data: currentMedia.data, mimeType: currentMedia.mimeType } 
    });
  }
  contents.push({ role: 'user', parts: currentParts });

  try {
    return ai.models.generateContentStream({
      model,
      contents: contents as any,
      config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.1 },
    });
  } catch (err) {
    console.error("SDK Error:", err);
    throw err;
  }
};
