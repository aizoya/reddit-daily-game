// Pure helpers for community stats and streaks, kept apart from Redis so they can be unit-tested.
import type { DayStats, Streak } from './api';

// Kept local (not imported) so this file runs under Node's type stripping in unit tests.
const dayAfter = (date: string): string =>
  new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);

// The histogram maps an earnings amount (as a string) to how many drivers earned exactly that.
export const SPREAD_LABELS = ['<50%', '50%+', '70%+', '90%+', 'Best'];

// Which band of the best possible earnings a shift falls in. Matches the rating thresholds.
export const spreadBand = (earnings: number, bestEarnings: number): number => {
  if (bestEarnings <= 0 || earnings >= bestEarnings) return 4;
  const share = earnings / bestEarnings;
  if (share >= 0.9) return 3;
  if (share >= 0.7) return 2;
  if (share >= 0.5) return 1;
  return 0;
};

export const computeDayStats = (
  histogram: Record<string, string>,
  earnings: number,
  bestEarnings: number
): DayStats => {
  let players = 0;
  let below = 0;
  let perfect = 0;
  const spread = [0, 0, 0, 0, 0];
  for (const [amount, raw] of Object.entries(histogram)) {
    const value = Number(amount);
    const count = Number(raw);
    if (!Number.isFinite(value) || !Number.isFinite(count) || count <= 0) {
      continue;
    }
    players += count;
    if (value < earnings) below += count;
    if (value >= bestEarnings) perfect += count;
    const band = spreadBand(value, bestEarnings);
    spread[band] = (spread[band] ?? 0) + count;
  }
  if (players === 0) return { players: 0, beat: 0, perfect: 0, spread };
  return {
    players,
    beat: Math.round((below / players) * 100),
    perfect: Math.round((perfect / players) * 100),
    spread,
  };
};

export type StreakRecord = {
  lastDate: string | undefined;
  current: number;
  best: number;
};

// A streak grows when the player finishes the shift for the day after their last one.
// Dates on or before the last counted day never move it, so archive posts cannot rewind it.
export const nextStreak = (previous: StreakRecord, date: string): StreakRecord => {
  if (previous.lastDate !== undefined && date <= previous.lastDate) {
    return previous;
  }
  const continues =
    previous.lastDate !== undefined && dayAfter(previous.lastDate) === date;
  const current = continues ? previous.current + 1 : 1;
  return {
    lastDate: date,
    current,
    best: Math.max(previous.best, current),
  };
};

// What to show today: a streak is only alive if its last day was today or yesterday.
export const toStreak = (record: StreakRecord, today: string): Streak => {
  const alive =
    record.lastDate !== undefined &&
    (record.lastDate === today || dayAfter(record.lastDate) === today);
  return { current: alive ? record.current : 0, best: record.best };
};

const toCount = (value: string | undefined): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
};

export const parseStreakRecord = (
  fields: Record<string, string>
): StreakRecord => ({
  lastDate: fields['lastDate'],
  current: toCount(fields['current']),
  best: toCount(fields['best']),
});

// Only accept a short list of small whole numbers from the client.
export const parseOrder = (value: unknown): number[] | undefined => {
  if (!Array.isArray(value) || value.length > 16) return undefined;
  const order: number[] = [];
  for (const item of value) {
    if (typeof item !== 'number' || !Number.isInteger(item)) return undefined;
    if (item < 1 || item > 99) return undefined;
    order.push(item);
  }
  return order;
};
