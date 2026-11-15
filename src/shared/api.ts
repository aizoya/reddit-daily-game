import type { PlanResult } from './onefare';

export type DayStats = {
  // How many drivers have finished this shift.
  players: number;
  // Share (0-100) of finished drivers who earned strictly less than this player.
  beat: number;
  // Share (0-100) of finished drivers who matched the best possible shift.
  perfect: number;
};

export type Streak = {
  current: number;
  best: number;
};

export type SavedShift = {
  result: PlanResult;
  stats: DayStats;
  streak: Streak;
  // False for logged-out players: the shift was scored but not stored.
  saved: boolean;
};

export type InitResponse = {
  type: 'init';
  date: string;
  username: string | null;
  players: number;
  shift: SavedShift | null;
};

export type SubmitRequest = {
  order: number[];
};

export type SubmitResponse = {
  type: 'submit';
  date: string;
  shift: SavedShift;
};

export type ErrorResponse = {
  status: 'error';
  message: string;
};
