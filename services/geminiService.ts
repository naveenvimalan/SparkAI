
import { GoogleGenAI } from "@google/genai";
import { Goal, MediaData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_PROMPT = `You are CogSustain, a Cognitive Assistant focusing on mental agency and multimodal synthesis.

ADAPTATION:
- Learn: Conceptual, analogies, deep. Use uploaded images/docs to create visual mental models.
- Implement: Practical, code, steps. Extract data from docs/images for execution.
- Debug: Guiding, "what did you try?", problem-solving. Analyze screenshots for errors.
- Explore: Wide perspective, what-if. Connect doc contents to broader themes.

QUIZ RULE:
If the user's turn count indicates a checkpoint (provided in prompt), you MUST generate a Quiz based on the conversation AND any uploaded documents/images to verify deep processing.
Format: ---QUIZ_START--- { "question": "...", "options": [{"text": "...", "isCorrect": true/false}], "explanation": "..." } ---QUIZ_END---

GENERAL TONE:
Markdown-heavy, intellectual, encouraging. Citations from provided files are highly encouraged.`;

export const generateAssistantResponse = async (
  userMessage: string, 
  history: { role: string, content: string, media?: MediaData }[],
  goal: Goal,
  triggerQuiz: boolean = false,
  currentMedia?: MediaData
) => {
  const model = 'gemini-3-flash-preview';
  
  let userPrompt = `Current Goal: ${goal}. User Input: ${userMessage}`;
  if (triggerQuiz) {
    userPrompt += "\n\nCRITICAL: This is a Neural Checkpoint. Include a 3-choice multiple-choice quiz based on the context (including any uploaded documents/images) using the specified JSON format.";
  }

  // Map history to parts, including historical media if available
  const contents = history.map(h => {
    const parts: any[] = [{ text: h.content }];
    if (h.media) {
      parts.push({
        inlineData: {
          data: h.media.data,
          mimeType: h.media.mimeType
        }
      });
    }
    return {
      role: h.role === 'user' ? 'user' : 'model',
      parts
    };
  });

  // Add the current prompt and current media
  const currentParts: any[] = [{ text: userPrompt }];
  if (currentMedia) {
    currentParts.push({
      inlineData: {
        data: currentMedia.data,
        mimeType: currentMedia.mimeType
      }
    });
  }

  contents.push({
    role: 'user',
    parts: currentParts
  });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: contents as any,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I encountered a synchronization error while processing the multimodal input. Let's try to re-establish our cognitive link.";
  }
};
