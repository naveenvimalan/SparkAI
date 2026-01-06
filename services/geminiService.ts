
import { GoogleGenAI } from "@google/genai";
import { Goal, MediaData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_PROMPT = `You are Spark, a premium minimalist Cognitive Assistant. You facilitate deep synthesis and intentional processing.

ADAPTATION:
- Learn: Use analogies, metaphors, and mental models.
- Implement: Practical execution, code, and structured steps.
- Debug: Be a guide. Ask "What happened exactly?" and lead toward the fix.
- Explore: Connect distant ideas, challenge status quo.

NEURAL CHECKPOINT RULE:
If triggerQuiz is true, you MUST create a unique, context-specific checkpoint.
- The quiz MUST be derived directly from the information we just discussed.
- It must test comprehension or critical synthesis, not just recall.
- NEVER repeat a quiz. NEVER use generic templates.
Format: ---QUIZ_START--- { "question": "...", "options": [{"text": "...", "isCorrect": true/false}], "explanation": "..." } ---QUIZ_END---

TONE: Clean, sophisticated, high-end, and intellectual. No fluff or boilerplate pleasantries.`;

export const generateAssistantStream = async (
  userMessage: string, 
  history: { role: string, content: string, media?: MediaData }[],
  goal: Goal,
  triggerQuiz: boolean = false,
  currentMedia?: MediaData
) => {
  const model = 'gemini-3-flash-preview';
  
  let userPrompt = `[Goal: ${goal}] ${userMessage}`;
  if (triggerQuiz) {
    userPrompt += "\n\n(System: This response REQUIRES a Neural Checkpoint. Generate a context-linked 3-choice quiz based on our current thread.)";
  }

  const contents = history.map(h => {
    const parts: any[] = [{ text: h.content }];
    if (h.media) {
      parts.push({ inlineData: { data: h.media.data, mimeType: h.media.mimeType } });
    }
    return { role: h.role === 'user' ? 'user' : 'model', parts };
  });

  const currentParts: any[] = [{ text: userPrompt }];
  if (currentMedia) {
    currentParts.push({ inlineData: { data: currentMedia.data, mimeType: currentMedia.mimeType } });
  }

  contents.push({ role: 'user', parts: currentParts });

  return ai.models.generateContentStream({
    model,
    contents: contents as any,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.85,
    },
  });
};
