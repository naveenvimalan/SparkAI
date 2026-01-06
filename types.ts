
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
  goal?: Goal;
}

export interface SessionStats {
  questions: number;
  responses: number;
  userWords: number;
  aiWords: number;
  agency: number;
  sparks: number;
}

export enum AppState {
  INITIAL = 'INITIAL',
  SELECTING_GOAL = 'SELECTING_GOAL',
  CHATTING = 'CHATTING',
}

export type Goal = 'Learn' | 'Implement' | 'Debug' | 'Explore';
