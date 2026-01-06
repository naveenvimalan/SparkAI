
import { GoogleGenAI } from "@google/genai";
import { Goal, MediaData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_PROMPT = `You are Spark, a Cognitive Assistant based on "Cognitive Sustainability" principles.

CORE MISSION:
Prevent "Automation Complacency". Your goal is to ensure the user is actively processing information, not just consuming it.

NEURAL CHECKPOINTS (INTEGRATED LEARNING):
- Checkpoints are NO LONGER restricted to 'Learn' mode. They are integrated into all goals (Implement, Debug, Explore, Learn).
- Trigger a Checkpoint when a complex concept has been explained or a critical decision has been made.
- If the context includes "TRIGGER_CHECKPOINT", you MUST generate a checkpoint.

CHECKPOINT FORMAT:
Append exactly one question at the end of your response using this structure:
---QUIZ_START---
{
  "question": "A provocative question that tests the USER'S understanding of YOUR previous response.",
  "options": [
    {"text": "Common misconception", "isCorrect": false},
    {"text": "Correct synthesis", "isCorrect": true},
    {"text": "Oversimplification", "isCorrect": false}
  ],
  "explanation": "Briefly connect this back to the current task or concept."
}
---QUIZ_END---

TONE & STYLE:
- Precise, high-agency, and intellectually stimulating.
- For Implement/Debug: Be concise and technical.
- For Learn/Explore: Be expansive and Socratic.`;

export const generateAssistantStream = async (
  userMessage: string, 
  history: { role: string, content: string, media?: MediaData }[],
  goal: Goal,
  triggerQuiz: boolean = false,
  currentMedia?: MediaData
) => {
  const model = 'gemini-3-flash-preview';
  
  const instruction = triggerQuiz 
    ? `CONTEXT: We have reached a complexity milestone. TRIGGER_CHECKPOINT: You must include a Neural Checkpoint at the end of your response to verify the user's mental model of this specific ${goal} task.`
    : `CONTEXT: Maintain flow. Goal is ${goal}. Focus on high-quality output. Do not include a checkpoint in this turn unless you feel a critical misunderstanding risk exists.`;

  const contents = history.map(h => {
    const parts: any[] = [{ text: h.content }];
    if (h.media) {
      parts.push({ inlineData: { data: h.media.data, mimeType: h.media.mimeType } });
    }
    return { role: h.role === 'user' ? 'user' : 'model', parts };
  });

  const currentParts: any[] = [{ text: `[Active Goal: ${goal}] ${userMessage}\n\n(System Note: ${instruction})` }];
  if (currentMedia) {
    currentParts.push({ inlineData: { data: currentMedia.data, mimeType: currentMedia.mimeType } });
  }

  contents.push({ role: 'user', parts: currentParts });

  return ai.models.generateContentStream({
    model,
    contents: contents as any,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.2, // Slightly higher for more creative/provocative questions
    },
  });
};
