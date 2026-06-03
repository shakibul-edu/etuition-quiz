export type Question = {
  id: string;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  subject: string;
  class: string;
  createdAt: number;
};

export type SubjectProgress = {
  level: number;
  totalScore: number;
};

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  className: string;
  school: string;
  createdAt: number;
  updatedAt: number;
  progress?: Record<string, SubjectProgress>;
  scores?: Record<string, number>;
};

export type QuizState = 'start' | 'playing' | 'result';
