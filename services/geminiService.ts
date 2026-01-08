
import { GoogleGenAI } from "@google/genai";
import { MediaData } from "../types";

const SYSTEM_PROMPT = `You are Spark, a Cognitive Assistant for "Cognitive Sustainability."

STRICT INTERACTION RULES:

1. METADATA EXCLUSIVITY (CRITICAL):
   - **NEVER** output both a P1 (Intent Check) and a P2 (Reflection) in the same response.
   - **PRIORITY:** If the user's intent is ambiguous, generate a P1 (Intent Check) ONLY.
   - If the intent is clear but the concept is complex, generate a P2 (Reflection) ONLY.

2. P2 REFLECTION (QUIZ) - COGNITIVE ANCHORING:
   - **TIMING RULE:** NEVER trigger a Reflection on the VERY FIRST interaction. Build rapport first.
   - **FREQUENCY:** Trigger approx. every 2-3 turns *after* the conversation is established.
   - **TRIGGER:** If you explain a concept, propose a strategy, or define a workflow, FOLLOW UP with a P2 Quiz to verify the user grasps the "Why".
   - The question must be solvable based on your explanation.
   - Goal: Ensure the user *understands* the strategic value, not just the steps.

3. AGENCY & DELEGATION:
   - If the user asks you to decide, do NOT be elusive. 
   - Analyze the current context and propose the most logical "Best Path Forward".
   - Synthesis: Always synthesize multiple potential user choices into one cohesive path if possible.

4. COGNITIVE FLOW:
   - Use TEXT ONLY when the conversation is in a fluid "back-and-forth" state.
   - Avoid metadata cards when the user is looking for quick orientation.

5. TONE:
   - Mirror the user's language.
   - Be a partner, not a proctor. 
   - Maximum 2-3 short, high-impact paragraphs.

METADATA FORMAT:
- P1: ---INTENT_START--- { "question": "...", "options": [{"text": "...", "value": "..."}], "allowMultiple": true } ---INTENT_END---
- P2: ---REFLECTION_START--- { "question": "...", "options": [{"text": "...", "isCorrect": true}], "explanation": "..." } ---REFLECTION_END---`;

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
        temperature: 0.2, // Slightly higher for better decision making
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
