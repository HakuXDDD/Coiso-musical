export interface NoteEvent {
  id: string;
  midi: number;
  noteName: string;
  stringIndex: number;
  time: number;
  duration: number;
  hit: boolean;
  missed: boolean;
}

export type Judgement = "perfect" | "good" | "miss";

export interface JudgementEvent {
  stringIndex: number;
  judgement: Judgement;
  createdAt: number;
}

export type GameStatus = "idle" | "playing" | "paused";

export type PlaybackSpeed = 0.5 | 0.75 | 1;

/** Tolerância de afinação para acerto via microfone, em semitons. */
export type PitchTolerance = 0 | 1;

export interface GameStats {
  score: number;
  combo: number;
  maxCombo: number;
  perfect: number;
  good: number;
  miss: number;
  accuracy: number;
}
