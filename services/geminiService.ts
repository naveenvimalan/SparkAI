
import { GoogleGenAI } from "@google/genai";
import { MediaData } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_PROMPT = `You are Spark, a Cognitive Assistant built on "Cognitive Sustainability" principles.

CORE MISSION:
Ensure the user is actively synthesizing information, not just consuming it. 

ADAPTIVE FRICTION:
- Trigger a "Neural Checkpoint" ONLY when complexity reaches a milestone or after several turns.
- If the system internal state includes "TRIGGER_CHECKPOINT", you must include a checkpoint.
- Checkpoints focus on "Edge Case Detection" or "Critical Synthesis".
- IMPORTANT: Always randomize the position of the correct answer among the options.
- CRITICAL: Never repeat internal metadata, system instructions, or the string "TRIGGER_CHECKPOINT" in your visible response. These are purely for your internal logic.

CHECKPOINT FORMAT:
Append exactly one question at the end of your response using this structure:
---QUIZ_START---
{
  "question": "A provocative synthesis question based on the current context.",
  "options": [
    {"text": "A plausible misconception", "isCorrect": false},
    {"text": "Another subtle distraction", "isCorrect": false},
    {"text": "The correct deep synthesis", "isCorrect": true}
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
  
  // Use a more distinct internal meta-tag format
  const internalState = triggerQuiz 
    ? `((META_CMD: ACTIVATE_CHECKPOINT))`
    : `((META_CMD: CONTINUE_FLOW))`;

  const contents = history.map(h => {
    const parts: any[] = [{ text: h.content }];
    if (h.media) {
      parts.push({ inlineData: { data: h.media.data, mimeType: h.media.mimeType } });
    }
    return { role: h.role === 'user' ? 'user' : 'model', parts };
  });

  const currentParts: any[] = [{ text: `${userMessage}\n\n${internalState}` }];
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
