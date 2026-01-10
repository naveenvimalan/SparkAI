
export interface QuizOption {
  text: string;
  isCorrect: boolean;
}

export interface Quiz {
  question: string;
  options: QuizOption[];
  explanation: string;
}

export interface ChoiceOption {
  text: string;
  value: string;
}

export interface IntentCheck {
  question: string;
  options: ChoiceOption[];
  allowMultiple?: boolean;
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
  stats?: string;
  media?: MediaData;
  isIntentDecision?: boolean;
}

export type FrictionLevel = 'low' | 'medium' | 'high';

export interface QuizPerformance {
  quizId: string;
  question: string;
  attempts: number;      // Total attempts until correct (including the correct one)
  timestamp: number;
  score: number;         // 12 (1st try), 9 (2nd try), 6 (3rd+ try)
}

export interface SessionStats {
  questions: number;
  responses: number;
  intentDecisions: number;
  quizAttempts: number; // Legacy: Global clicks
  agency: number;
  sparks: number;
  intentLog: string[];
  verifiedInsights: string[];
  frictionLevel: FrictionLevel;
  quizHistory: QuizPerformance[]; // New: Granular history
}

export enum AppState {
  INITIAL = 'INITIAL',
  CHATTING = 'CHATTING',
}
