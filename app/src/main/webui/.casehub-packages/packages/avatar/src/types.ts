export interface VisemeFrame {
  viseme: string;
  startMs: number;
  endMs: number;
  weight?: number;
}

export interface PlaybackItem {
  audio: AudioBuffer;
  timeline: VisemeFrame[] | null;
}

export interface ConversationTurn {
  role: 'user' | 'avatar';
  text: string;
  status: 'partial' | 'final';
}

export interface AvatarConfig {
  wsUrl?: string;
  avatarUrl: string;
  body?: 'M' | 'F';
  mood?: string;
  cameraView?: 'head' | 'upper' | 'full';
  cameraRotate?: boolean;
  cameraZoom?: boolean;
  cameraPan?: boolean;
  lipsyncLang?: string;
}

export type AvatarMessage =
  | { type: 'start'; sampleRate: number; llmModel?: string; ttsModel?: string }
  | { type: 'stop' }
  | { type: 'text'; text: string; llmModel?: string; ttsModel?: string }
  | { type: 'partial'; text: string }
  | { type: 'transcript'; text: string }
  | { type: 'response'; text: string }
  | { type: 'phonemes'; data: VisemeFrame[] }
  | { type: 'timing'; cleanupMs: number; llmMs: number; ttsMs: number; totalMs: number }
  | { type: 'error'; message: string };
