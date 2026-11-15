// The live shift store: the storage rules from shiftStore.ts wired to Devvit's Redis.
import { redis } from '@devvit/web/server';
import { evaluatePlan, generatePuzzle, todayUtc } from '../../shared/onefare';
import {
  computeDayStats,
  nextStreak,
  parseOrder,
  parseStreakRecord,
  toStreak,
} from '../../shared/stats';
import { PLAYER_DATA_TTL_SECONDS } from './config';
import { createShiftStore } from './shiftStore';

export const {
  claim,
  release,
  hasJoined,
  markJoined,
  claimComment,
  releaseComment,
  countPlayers,
  loadShift,
  submitShift,
} = createShiftStore(
  redis,
  {
    generatePuzzle,
    evaluatePlan,
    todayUtc: () => todayUtc(),
    computeDayStats,
    nextStreak,
    parseOrder,
    parseStreakRecord,
    toStreak,
  },
  PLAYER_DATA_TTL_SECONDS
);
