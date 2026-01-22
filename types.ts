
export interface QuizOption {
  text: string;
  isCorrect: boolean;
}

export interface Quiz {
  question: string;
  options: QuizOption[];
  explanation: string;
}

export interface IntentCheck {
  question: string;
  prompts: string[]; // Array of prompts for articulation
}

export interface MediaData {
  data: string; // base64
  mimeType: string;
  name?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  quizData?: Quiz;
  intentData?: IntentCheck;
  media?: MediaData;
  isArticulation?: boolean; // Marks articulation responses
  awaitingArticulation?: boolean; // Marks messages waiting for articulation
  articulationScore?: number; // Average score from validation (0-10)
}

export interface QuizPerformance {
  quizId: string;
  question: string;
  attempts: number;
  timestamp: number;
  score: number;
}

export interface SessionStats {
  totalQueries: number;
  articulationCount: number;
  articulationQuality: { high: number; medium: number; low: number };
  comprehensionRate: number;
  delegationCount: number;
  sparks: number;
  quizHistory: QuizPerformance[];
  articulationDetails: string[];
}

export enum AppState {
  INITIAL = 'INITIAL',
  CHATTING = 'CHATTING',
}
