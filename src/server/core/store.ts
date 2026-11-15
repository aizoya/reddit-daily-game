import { redis } from '@devvit/web/server';
import type { DayStats, SavedShift } from '../../shared/api';
import {
  evaluatePlan,
  generatePuzzle,
  type Puzzle,
} from '../../shared/onefare';
import {
  computeDayStats,
  nextStreak,
  parseOrder,
  parseStreakRecord,
  toStreak,
} from '../../shared/stats';

const shiftKey = (date: string, userId: string): string =>
  `shift:${date}:${userId}`;
const histogramKey = (date: string): string => `hist:${date}`;
const streakKey = (userId: string): string => `streak:${userId}`;
const commentedKey = (date: string, userId: string): string =>
  `commented:${date}:${userId}`;

const joinedKey = (userId: string): string => `joined:${userId}`;

export const hasJoined = async (
  userId: string | undefined
): Promise<boolean> =>
  userId ? Boolean(await redis.get(joinedKey(userId))) : false;

export const markJoined = async (userId: string): Promise<void> => {
  await redis.set(joinedKey(userId), '1');
};

export const markCommented = async (
  date: string,
  userId: string
): Promise<void> => {
  await redis.set(commentedKey(date, userId), '1');
};

const dayStats = async (
  puzzle: Puzzle,
  earnings: number
): Promise<DayStats> => {
  const histogram = await redis.hGetAll(histogramKey(puzzle.date));
  return computeDayStats(histogram, earnings, puzzle.best.earnings);
};

export const countPlayers = async (date: string): Promise<number> => {
  const histogram = await redis.hGetAll(histogramKey(date));
  return computeDayStats(histogram, 0, 0).players;
};

const readOrder = async (
  date: string,
  userId: string
): Promise<number[] | undefined> => {
  const raw = await redis.get(shiftKey(date, userId));
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parseOrder(parsed);
  } catch {
    return undefined;
  }
};

export const loadShift = async (
  date: string,
  userId: string | undefined
): Promise<SavedShift | null> => {
  if (!userId) return null;
  const order = await readOrder(date, userId);
  if (order === undefined) return null;
  const puzzle = generatePuzzle(date);
  const result = evaluatePlan(puzzle, order);
  const [stats, streakFields, commented] = await Promise.all([
    dayStats(puzzle, result.earnings),
    redis.hGetAll(streakKey(userId)),
    redis.get(commentedKey(date, userId)),
  ]);
  return {
    result,
    stats,
    streak: toStreak(parseStreakRecord(streakFields)),
    saved: true,
    commented: Boolean(commented),
  };
};

// The first finished shift of the day is the one that counts. The plan is always re-scored
// on the server, so a client cannot report earnings it did not drive.
export const submitShift = async (
  date: string,
  userId: string | undefined,
  order: number[]
): Promise<SavedShift> => {
  const puzzle = generatePuzzle(date);

  if (!userId) {
    const result = evaluatePlan(puzzle, order);
    return {
      result,
      stats: await dayStats(puzzle, result.earnings),
      streak: { current: 0, best: 0 },
      saved: false,
      commented: false,
    };
  }

  const existing = await loadShift(date, userId);
  if (existing) return existing;

  const result = evaluatePlan(puzzle, order);
  const previous = parseStreakRecord(await redis.hGetAll(streakKey(userId)));
  const streak = nextStreak(previous, date);

  await redis.set(shiftKey(date, userId), JSON.stringify(result.completed));
  await redis.hIncrBy(histogramKey(date), String(result.earnings), 1);
  await redis.hSet(streakKey(userId), {
    lastDate: date,
    current: String(streak.current),
    best: String(streak.best),
  });

  return {
    result,
    stats: await dayStats(puzzle, result.earnings),
    streak: toStreak(streak),
    saved: true,
    commented: false,
  };
};
