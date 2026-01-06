
import { GoogleGenAI } from "@google/genai";
import { MediaData } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_PROMPT = `You are Spark, a Cognitive Assistant built on "Cognitive Sustainability" principles.

CORE MISSION:
Your goal is to ensure the user is actively synthesizing information, not just consuming it. 

ADAPTIVE FRICTION:
- Trigger a "Neural Checkpoint" ONLY when complexity reaches a milestone or after several turns.
- If the system note includes "TRIGGER_CHECKPOINT", you must include a checkpoint.
- Checkpoints should focus on "Edge Case Detection" or "Critical Synthesis" rather than recall.

CHECKPOINT FORMAT:
Append exactly one question at the end of your response using this structure:
---QUIZ_START---
{
  "question": "A provocative synthesis question based on the current context.",
  "options": [
    {"text": "Misconception", "isCorrect": false},
    {"text": "Correct Deep Synthesis", "isCorrect": true},
    {"text": "Surface level answer", "isCorrect": false}
  ],
  "explanation": "Briefly explain the cognitive value of this specific synthesis point."
}
---QUIZ_END---

STYLE:
- Intellectual, precise, and high-agency.
- Avoid repeating the user's prompt. 
- Jump directly into high-level analysis.`;

export const generateAssistantStream = async (
  userMessage: string, 
  history: { role: string, content: string, media?: MediaData }[],
  triggerQuiz: boolean = false,
  currentMedia?: MediaData
) => {
  const model = 'gemini-3-flash-preview';
  
  const instruction = triggerQuiz 
    ? `[SYSTEM: Milestone reached. TRIGGER_CHECKPOINT: Include a Neural Checkpoint to verify deep synthesis.]`
    : `[SYSTEM: Maintain flow. Milestone not yet reached.]`;

  const contents = history.map(h => {
    const parts: any[] = [{ text: h.content }];
    if (h.media) {
      parts.push({ inlineData: { data: h.media.data, mimeType: h.media.mimeType } });
    }
    return { role: h.role === 'user' ? 'user' : 'model', parts };
  });

  const currentParts: any[] = [{ text: `${userMessage}\n\n${instruction}` }];
  if (currentMedia) {
    currentParts.push({ inlineData: { data: currentMedia.data, mimeType: currentMedia.mimeType } });
  }

  contents.push({ role: 'user', parts: currentParts });

  // Call generateContentStream directly with model and configuration
  return ai.models.generateContentStream({
    model,
    contents: contents as any,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.1,
    },
  });
};
