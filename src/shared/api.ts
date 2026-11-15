import type { PlanResult } from './onefare';

export type DayStats = {
  // How many drivers have finished this shift.
  players: number;
  // Share (0-100) of finished drivers who earned strictly less than this player.
  beat: number;
  // Share (0-100) of finished drivers who matched the best possible shift.
  perfect: number;
  // How many drivers landed in each band of the best possible earnings:
  // under 50%, 50-69%, 70-89%, 90-99%, and 100%.
  spread: number[];
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
  // True once the player has chosen to post this result as a comment.
  commented: boolean;
};

export type InitResponse = {
  type: 'init';
  date: string;
  username: string | null;
  // The community this post lives in, for the join prompt.
  subreddit: string | null;
  // True once the player has joined through the game. Players who joined another way
  // may still see the prompt; joining twice is harmless.
  joined: boolean;
  // Whether this player may post a result or join through the game. Until Reddit approves
  // the app these act as the player only for the app owner, so they stay off for everyone else.
  userActions: boolean;
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

export type CommentResponse = {
  type: 'comment';
  commented: true;
};

export type JoinResponse = {
  type: 'join';
  joined: true;
};
