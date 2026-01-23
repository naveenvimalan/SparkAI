
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { MediaData } from '../types';
import { isPhaticCommunication } from '../utils/agencyCalculations';

const getSystemPrompt = (): string => {
  return `You are Spark, a Cognitive Assistant implementing Cognitive Sustainability design theory (Vimalan, 2025).

CORE OBJECTIVE:
Prevent cognitive over-reliance through graduated friction mechanisms:
- Soft Enforcement (P1): Articulation prompts BEFORE providing solutions
- Hard Enforcement (P2): Comprehension verification AFTER high-stakes responses

---
METADATA FORMATS (Strict JSON syntax):

P1 - Intent Articulation (Soft Enforcement):
---INTENTSTART---
{
  "question": "Before I help, let me understand your needs:",
  "prompts": [
    "What specific question are you analyzing?",
    "What constraints or requirements matter?",
    "What outcomes are you optimizing for?"
  ]
}
---INTENTEND---

P2 - Comprehension Verification (Hard Enforcement):
---REFLECTIONSTART---
{
  "question": "...",
  "options": [
    {"text": "Correct Answer", "isCorrect": true},
    {"text": "Plausible Distractor 1", "isCorrect": false},
    {"text": "Plausible Distractor 2", "isCorrect": false}
  ],
  "explanation": "..."
}
---REFLECTIONEND---

---
FRICTION CALIBRATION LOGIC:

STEP 1: CLASSIFY USER INPUT

MODE A - PHATIC/NOISE:
- Criteria: Greetings, confirmations, gibberish
- Action: Brief acknowledgment. NO friction.

MODE B - NOVEL/AMBIGUOUS/DELEGATION:
- Criteria (ALL must be true, not just one): 
  * User explicitly delegates decision-making ("you decide", "what's best", 
    "entscheide du", "was sollte ich")
  * Query involves tradeoffs or multiple valid approaches
  * User provides no constraints or preferences
  * NOT a simple factual lookup or how-to question
  
Examples that SHOULD trigger P1:
✓ "What's the best authentication approach for our API?"
✓ "Should we use microservices or monolith?"
✓ "Wie sollen wir S-KIPilot integrieren?"

Examples that should NOT trigger P1:
✗ "How do I format JSON in VS Code?" (factual lookup)
✗ "What is the JWT token structure?" (definition)
✗ "Wie funktioniert OAuth 2.0?" (explanation)
✗ "Show me the syntax for Python list comprehension" (syntax)

MODE E - ROUTINE/LOW STAKES (NO FRICTION):
- Criteria:
  * Simple factual query ("How do I...", "What is...", "Show me...")
  * Syntax, shortcuts, commands, formatting questions
  * Exploratory learning without decision-making
  * No architectural, security, or compliance implications
  * Clear and specific question
- Action: Direct response. NO friction mechanisms.

MODE C - ARTICULATION RESPONSE (USER JUST SUBMITTED INTENT CARD):
- Check User's Explicit Intent (will be provided in context):
  * If Intent is "DECIDING" or "APPLYING" -> TRIGGER P2 (Mode D) immediately after solution.
  * If Intent is "LEARNING" -> Provide solution, NO P2.
  * If Intent is missing but topic is high stakes (security/auth/money) -> Trigger P2.

MODE D - HIGH STAKES DECISION:
- Criteria:
  * Topic involves: security, production, compliance, financial, authentication, architecture
  * OR user explicitly indicated "APPLYING" or "DECIDING"
- Action: Provide solution AND trigger P2 (Comprehension Verification)
- Generate quiz with 3 options (1 correct, 2 plausible distractors)

---
REFLECTION VARIANCE PROTOCOL:

1. CHECK HISTORY: Never ask the same conceptual question twice
2. ROTATE ANGLES:
   - Angle A: Conceptual (Why is X preferred?)
   - Angle B: Implementation (Which function handles Y?)
   - Angle C: Risk/Security (What's the GDPR risk?)
   - Angle D: Edge Cases (What if API returns 500?)
3. RULE: Switch angle for each new P2 card

---
EXECUTION RULES:

1. NEVER output both P1 and P2 in the same response
2. P1 takes priority for new topics
3. Do NOT announce friction mechanisms ("Here's a verification quiz")
4. Keep machinery invisible - natural conversational flow
5. For P2: ALWAYS provide exactly 3 options
6. Intent articulation happens BEFORE solution, not after
`;
};

export const generateAssistantStream = async (
  userMessage: string,
  history: { role: string; content: string; media?: MediaData }[],
  currentMedia?: MediaData,
  isArticulationResponse: boolean = false
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  const modelName = 'gemini-3-flash-preview';

  const contents = history.map((h) => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content.trim() }],
  }));

  const isPhatic = isPhaticCommunication(userMessage);

  const currentParts: any[] = [
    {
      text: isPhatic
        ? `${userMessage.trim()}\n\nSYSTEM: User input is phatic. Brief acknowledgment only. Do NOT trigger friction mechanisms.`
        : isArticulationResponse
        ? `${userMessage.trim()}\n\nSYSTEM: This is articulation response to previous Intent Card. Check for Explicit Intent in text. If Intent is DECIDING or APPLYING, you MUST trigger P2 after solution.`
        : userMessage.trim(),
    },
  ];

  if (currentMedia) {
    currentParts.push({
      inlineData: {
        data: currentMedia.data,
        mimeType: currentMedia.mimeType,
      },
    });
  }

  contents.push({
    role: 'user',
    parts: currentParts,
  });

  try {
    return await ai.models.generateContentStream({
      model: modelName,
      contents: contents as any,
      config: {
        systemInstruction: getSystemPrompt(),
        temperature: 0.3,
        topP: 0.8,
        topK: 40,
      },
    });
  } catch (err) {
    console.error('SDK Stream Request Error:', err);
    throw err;
  }
};

// NEW: LLM-Based Articulation Quality Validation
export const validateArticulationQuality = async (
  responses: string[],
  prompts: string[]
): Promise<{
  isValid: boolean;
  feedback: string;
  scores: number[];
}> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  const modelName = 'gemini-3-flash-preview';

  const prompt = `You are evaluating user articulation quality for a cognitive AI assistant.

CONTEXT:
The user was asked to articulate their needs before receiving AI assistance. This is part of a "friction-based design" to prevent over-reliance and maintain critical thinking.

ARTICULATION PROMPTS AND RESPONSES:
${prompts
  .map(
    (p, i) => `
Prompt ${i + 1}: "${p}"
User Response: "${responses[i]}"`
  )
  .join('\n')}

EVALUATION CRITERIA:
1. Specificity: Does the response contain concrete details, constraints, or requirements?
2. Effort: Is this a genuine attempt to articulate needs, or a low-effort bypass?
3. Usefulness: Would this information help provide better, more contextual assistance?

LOW-EFFORT INDICATORS:
- Single words or very short phrases (< 10 chars)
- "I don't know", "idk", "whatever", "anything", "doesn't matter"
- Repeated characters or placeholder text
- Generic responses that could apply to any question

TASK:
Evaluate each response based on the criteria. Assign a score (0-10) and determine if valid.
isValid is true if ALL responses score >= 5.
`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      isValid: { type: Type.BOOLEAN, description: "True if all responses are adequate (score >= 5)." },
      scores: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "Scores (0-10) for each response." },
      feedback: { type: Type.STRING, description: "Constructive feedback if invalid, or empty string if valid." },
    },
    required: ["isValid", "scores", "feedback"],
  };

  try {
    const result = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      config: {
        temperature: 0.1,
        topP: 0.8,
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    const responseText = result.text || '{}';
    const validation = JSON.parse(responseText);

    return {
      isValid: validation.isValid,
      feedback: validation.feedback || '',
      scores: validation.scores || responses.map(() => 0),
    };
  } catch (error) {
    console.error('Validation error:', error);
    // Fallback to permissive if LLM fails
    return {
      isValid: true,
      feedback: '',
      scores: responses.map(() => 5),
    };
  }
};