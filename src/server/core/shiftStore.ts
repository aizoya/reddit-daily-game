// The storage rules for shifts, written against small interfaces instead of the Devvit
// Redis client, so the same code runs in unit tests with an in-memory fake.
// This file must not have runtime relative imports: tests load it with Node's type stripping.
import type { DayStats, SavedShift, Streak } from '../../shared/api';
import type { PlanResult, Puzzle } from '../../shared/onefare';
import type { StreakRecord } from '../../shared/stats';

export type TxLike = {
  multi(): Promise<unknown>;
  set(key: string, value: string): Promise<unknown>;
  hIncrBy(key: string, field: string, value: number): Promise<unknown>;
  hSet(key: string, fields: Record<string, string>): Promise<unknown>;
  exec(): Promise<unknown>;
  unwatch(): Promise<unknown>;
};

export type RedisLike = {
  get(key: string): Promise<string | undefined | null>;
  set(key: string, value: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
  incrBy(key: string, value: number): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
  hGetAll(key: string): Promise<Record<string, string>>;
  hSet(key: string, fields: Record<string, string>): Promise<unknown>;
  hIncrBy(key: string, field: string, value: number): Promise<unknown>;
  watch(...keys: string[]): Promise<TxLike>;
};

// The pure game and stats functions the store needs, passed in by the caller.
export type Rules = {
  generatePuzzle(date: string): Puzzle;
  evaluatePlan(puzzle: Puzzle, order: readonly number[]): PlanResult;
  todayUtc(): string;
  computeDayStats(
    histogram: Record<string, string>,
    earnings: number,
    bestEarnings: number
  ): DayStats;
  nextStreak(previous: StreakRecord, date: string): StreakRecord;
  parseOrder(value: unknown): number[] | undefined;
  parseStreakRecord(fields: Record<string, string>): StreakRecord;
  toStreak(record: StreakRecord, today: string): Streak;
};

export const createShiftStore = (
  redis: RedisLike,
  rules: Rules,
  ttlSeconds: number
) => {
  const shiftKey = (date: string, userId: string): string =>
    `shift:${date}:${userId}`;
  const shiftClaimKey = (date: string, userId: string): string =>
    `shiftclaim:${date}:${userId}`;
  const histogramKey = (date: string): string => `hist:${date}`;
  const streakKey = (userId: string): string => `streak:${userId}`;
  const commentedKey = (date: string, userId: string): string =>
    `commented:${date}:${userId}`;
  const joinedKey = (userId: string): string => `joined:${userId}`;

  // An atomic "first caller wins" claim. incrBy is a single Redis command, so two
  // simultaneous requests can never both see 1.
  const claim = async (key: string): Promise<boolean> =>
    (await redis.incrBy(key, 1)) === 1;

  const release = async (key: string): Promise<void> => {
    await redis.del(key);
  };

  const expireSoon = async (key: string): Promise<void> => {
    try {
      await redis.expire(key, ttlSeconds);
    } catch (error) {
      // Expiry is housekeeping; never fail a player's request over it.
      console.error(`Could not set expiry on ${key}:`, error);
    }
  };

  const hasJoined = async (userId: string | undefined): Promise<boolean> =>
    userId ? Boolean(await redis.get(joinedKey(userId))) : false;

  const markJoined = async (userId: string): Promise<void> => {
    await redis.set(joinedKey(userId), '1');
    await expireSoon(joinedKey(userId));
  };

  // Claims the one comment a player may post for a shift. False if already claimed.
  const claimComment = async (
    date: string,
    userId: string
  ): Promise<boolean> => {
    const key = commentedKey(date, userId);
    const won = await claim(key);
    if (won) await expireSoon(key);
    return won;
  };

  const releaseComment = (date: string, userId: string): Promise<void> =>
    release(commentedKey(date, userId));

  const dayStats = async (
    puzzle: Puzzle,
    earnings: number
  ): Promise<DayStats> => {
    const histogram = await redis.hGetAll(histogramKey(puzzle.date));
    return rules.computeDayStats(histogram, earnings, puzzle.best.earnings);
  };

  const countPlayers = async (date: string): Promise<number> => {
    const histogram = await redis.hGetAll(histogramKey(date));
    return rules.computeDayStats(histogram, 0, 0).players;
  };

  const readOrder = async (
    date: string,
    userId: string
  ): Promise<number[] | undefined> => {
    const raw = await redis.get(shiftKey(date, userId));
    if (!raw) return undefined;
    try {
      const parsed: unknown = JSON.parse(raw);
      return rules.parseOrder(parsed);
    } catch {
      return undefined;
    }
  };

  const loadShift = async (
    date: string,
    userId: string | undefined
  ): Promise<SavedShift | null> => {
    if (!userId) return null;
    const order = await readOrder(date, userId);
    if (order === undefined) return null;
    const puzzle = rules.generatePuzzle(date);
    const result = rules.evaluatePlan(puzzle, order);
    const [stats, streakFields, commented] = await Promise.all([
      dayStats(puzzle, result.earnings),
      redis.hGetAll(streakKey(userId)),
      redis.get(commentedKey(date, userId)),
    ]);
    return {
      result,
      stats,
      streak: rules.toStreak(
        rules.parseStreakRecord(streakFields),
        rules.todayUtc()
      ),
      saved: true,
      commented: Boolean(commented),
    };
  };

  // The first finished shift of the day is the one that counts. The plan is always
  // re-scored on the server, so a client cannot report earnings it did not drive.
  //
  // The shift, the community count and the streak are written in one Redis transaction
  // that watches the player's keys: either all three land or none do, and a second
  // simultaneous request loses the race and is handed the shift that won.
  const submitShift = async (
    date: string,
    userId: string | undefined,
    order: number[]
  ): Promise<SavedShift> => {
    const puzzle = rules.generatePuzzle(date);
    const result = rules.evaluatePlan(puzzle, order);

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

    const previous = rules.parseStreakRecord(
      await redis.hGetAll(streakKey(userId))
    );
    // Only today's city moves the streak; older posts can be played without touching it.
    const streak =
      date === rules.todayUtc() ? rules.nextStreak(previous, date) : previous;
    const streakFields = {
      lastDate: date,
      current: String(streak.current),
      best: String(streak.best),
    };

    try {
      await txn.multi();
      await txn.set(key, JSON.stringify(result.completed));
      await txn.hIncrBy(histogramKey(date), String(result.earnings), 1);
      if (streak !== previous) await txn.hSet(streakKey(userId), streakFields);
      await txn.exec();
    } catch (error) {
      console.error('Shift transaction did not commit:', error);
    }

    // Whatever happened above, the stored shift is the truth: ours if we won, the other
    // request's if we lost the race, nothing if the transaction did not commit.
    let saved = await loadShift(date, userId);

    if (saved === null && (await claim(shiftClaimKey(date, userId)))) {
      // Fallback if the transaction could not commit at all: a single-winner claim, then
      // plain writes, shift first. Not all-or-nothing (a failure after the first write
      // leaves the shift saved but uncounted), but it can never count one player twice.
      console.error('Falling back to claimed writes for', key);
      try {
        await redis.set(key, JSON.stringify(result.completed));
      } catch (error) {
        // Nothing was written, so give the claim back and let a retry start clean.
        await release(shiftClaimKey(date, userId));
        throw error;
      }
      await redis.hIncrBy(histogramKey(date), String(result.earnings), 1);
      if (streak !== previous) {
        await redis.hSet(streakKey(userId), streakFields);
      }
      await expireSoon(shiftClaimKey(date, userId));
      saved = await loadShift(date, userId);
    }
    if (saved === null) throw new Error('Shift was not saved');

    await Promise.all([expireSoon(key), expireSoon(streakKey(userId))]);
    return saved;
  };

  return {
    claim,
    release,
    hasJoined,
    markJoined,
    claimComment,
    releaseComment,
    countPlayers,
    loadShift,
    submitShift,
  };
};
