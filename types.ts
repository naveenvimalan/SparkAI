
// Goal type defining the primary user intent for the session
export type Goal = 'Learn' | 'Implement' | 'Debug' | 'Explore';

export interface QuizOption {
  text: string;
  isCorrect: boolean;
}

export interface Quiz {
  question: string;
  options: QuizOption[];
  explanation: string;
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
  isQuiz?: boolean;
  quizData?: Quiz;
  isSystemReport?: boolean;
  media?: MediaData;
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
  CHATTING = 'CHATTING',
}
