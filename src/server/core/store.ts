import { redis } from '@devvit/web/server';
import type { DayStats, SavedShift } from '../../shared/api';
import {
  evaluatePlan,
  generatePuzzle,
  todayUtc,
  type Puzzle,
} from '../../shared/onefare';
import {
  computeDayStats,
  nextStreak,
  parseOrder,
  parseStreakRecord,
  toStreak,
} from '../../shared/stats';
import { PLAYER_DATA_TTL_SECONDS } from './config';

const shiftKey = (date: string, userId: string): string =>
  `shift:${date}:${userId}`;
const histogramKey = (date: string): string => `hist:${date}`;
const streakKey = (userId: string): string => `streak:${userId}`;
const commentedKey = (date: string, userId: string): string =>
  `commented:${date}:${userId}`;
const joinedKey = (userId: string): string => `joined:${userId}`;

// An atomic "first caller wins" claim. incrBy is a single Redis command, so two
// simultaneous requests can never both see 1.
export const claim = async (key: string): Promise<boolean> =>
  (await redis.incrBy(key, 1)) === 1;

export const release = async (key: string): Promise<void> => {
  await redis.del(key);
};

const expireSoon = async (key: string): Promise<void> => {
  try {
    await redis.expire(key, PLAYER_DATA_TTL_SECONDS);
  } catch (error) {
    // Expiry is housekeeping; never fail a player's request over it.
    console.error(`Could not set expiry on ${key}:`, error);
  }
};

export const hasJoined = async (
  userId: string | undefined
): Promise<boolean> =>
  userId ? Boolean(await redis.get(joinedKey(userId))) : false;

export const markJoined = async (userId: string): Promise<void> => {
  await redis.set(joinedKey(userId), '1');
  await expireSoon(joinedKey(userId));
};

// Claims the one comment a player may post for a shift. Returns false if already claimed.
export const claimComment = async (
  date: string,
  userId: string
): Promise<boolean> => {
  const key = commentedKey(date, userId);
  const won = await claim(key);
  if (won) await expireSoon(key);
  return won;
};

export const releaseComment = (date: string, userId: string): Promise<void> =>
  release(commentedKey(date, userId));

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
    streak: toStreak(parseStreakRecord(streakFields), todayUtc()),
    saved: true,
    commented: Boolean(commented),
  };
};

// The first finished shift of the day is the one that counts. The plan is always re-scored
// on the server, so a client cannot report earnings it did not drive.
//
// The shift, the community count and the streak are written in one Redis transaction that
// watches the player's keys: either all three land or none do, and a second simultaneous
// request loses the race and is handed the shift that won.
export const submitShift = async (
  date: string,
  userId: string | undefined,
  order: number[]
): Promise<SavedShift> => {
  const puzzle = generatePuzzle(date);
  const result = evaluatePlan(puzzle, order);

  if (!userId) {
    return {
      result,
      stats: await dayStats(puzzle, result.earnings),
      streak: { current: 0, best: 0 },
      saved: false,
      commented: false,
    };
  }

  const key = shiftKey(date, userId);
  const txn = await redis.watch(key, streakKey(userId));

  const existing = await loadShift(date, userId);
  if (existing) {
    await txn.unwatch();
    return existing;
  }

  const previous = parseStreakRecord(await redis.hGetAll(streakKey(userId)));
  // Only today's city moves the streak; older posts can be played without touching it.
  const today = todayUtc();
  const streak = date === today ? nextStreak(previous, date) : previous;

  try {
    await txn.multi();
    await txn.set(key, JSON.stringify(result.completed));
    await txn.hIncrBy(histogramKey(date), String(result.earnings), 1);
    if (streak !== previous) {
      await txn.hSet(streakKey(userId), {
        lastDate: date,
        current: String(streak.current),
        best: String(streak.best),
      });
    }
    await txn.exec();
  } catch (error) {
    console.error('Shift transaction did not commit:', error);
  }

  // Whatever happened above, the stored shift is the truth: ours if we won, the other
  // request's if we lost the race, nothing if the write failed outright.
  const saved = await loadShift(date, userId);
  if (saved === null) throw new Error('Shift was not saved');

  await Promise.all([expireSoon(key), expireSoon(streakKey(userId))]);
  return saved;
};
