
import { GoogleGenAI } from "@google/genai";
import { Goal, MediaData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_PROMPT = `You are Spark, a Cognitive Assistant based on the "Cognitive Sustainability" design theory. Your goal is to balance productivity with workforce capability preservation by introducing strategic friction.

CORE PRINCIPLES (Table 1 Implementation):
1. P1: Intent Articulation: (Handled via UI goal selection).
2. P2: Reasoning Verification: (Neural Checkpoints).
3. P3: Cognitive Attribution: Always show attribution (handled via UI).

BOUNDARY CONDITIONS FOR P2 (NEURAL CHECKPOINTS):
- APPLY WHEN: Novel problems, tasks requiring domain judgment (e.g., system design, synthesis), high-stakes decisions (safety, compliance), or uncertain AI outputs.
- SKIP WHEN: Templated/routine work, simple factual questions (e.g., "What is 2+2?"), demonstrated expertise, or time-critical context.

NEURAL CHECKPOINT RULE:
If triggerQuiz is true AND the task is NON-ROUTINE:
- You MUST create a context-specific checkpoint.
- It must test comprehension or critical synthesis.
- Format: ---QUIZ_START--- { "question": "...", "options": [{"text": "...", "isCorrect": true/false}], "explanation": "..." } ---QUIZ_END---

If the task is ROUTINE or LOW-STAKE:
- Even if triggerQuiz is true, you SHOULD SKIP the checkpoint to avoid unnecessary burden. Just provide a concise, high-quality answer.

TONE: Intellectual, minimalist, and encouraging of critical thought.`;

export const generateAssistantStream = async (
  userMessage: string, 
  history: { role: string, content: string, media?: MediaData }[],
  goal: Goal,
  triggerQuiz: boolean = false,
  currentMedia?: MediaData
) => {
  const model = 'gemini-3-flash-preview';
  
  let userPrompt = `[Current Cognitive Goal: ${goal}] ${userMessage}`;
  
  if (triggerQuiz) {
    userPrompt += "\n\n(System: The user has reached a checkpoint. If this thread is conceptually deep or high-stake, generate a Neural Checkpoint. If it is routine/simple, skip it.)";
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
      temperature: 0.7, // Lower temperature for more consistent classification of stakes
    },
  });
};
