// One Fare: daily rideshare route puzzle. Pure game rules, shared by client and server.
// Everything here is deterministic from the date string, so every player gets the same city.

export type Cell = { x: number; y: number };

export type Fare = {
  id: number;
  pickup: Cell;
  dropoff: Cell;
  payout: number;
};

export type Puzzle = {
  date: string;
  width: number;
  height: number;
  start: Cell;
  fuel: number;
  fares: Fare[];
  best: PlanResult;
};

export type PlanResult = {
  order: number[];
  completed: number[];
  earnings: number;
  fuelUsed: number;
};

export const GRID_WIDTH = 7;
export const GRID_HEIGHT = 7;
export const FARE_COUNT = 7;
const BASE_FUEL = 24;
const MAX_ATTEMPTS = 50;

// Small, well-known 32-bit generators. Math.random() must never be used for puzzle content.
const hashString = (text: string): number => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const distance = (a: Cell, b: Cell): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const sameCell = (a: Cell, b: Cell): boolean => a.x === b.x && a.y === b.y;

// Drive the fares in the given order. A fare only pays if the car can finish the drop-off;
// the shift ends at the first fare the remaining fuel cannot complete.
export const evaluatePlan = (
  puzzle: Pick<Puzzle, 'start' | 'fuel' | 'fares'>,
  order: readonly number[]
): PlanResult => {
  const byId = new Map(puzzle.fares.map((fare) => [fare.id, fare]));
  const seen = new Set<number>();
  const completed: number[] = [];
  let position = puzzle.start;
  let fuelUsed = 0;
  let earnings = 0;

  for (const id of order) {
    const fare = byId.get(id);
    if (fare === undefined || seen.has(id)) break;
    seen.add(id);
    const cost =
      distance(position, fare.pickup) + distance(fare.pickup, fare.dropoff);
    if (fuelUsed + cost > puzzle.fuel) break;
    fuelUsed += cost;
    earnings += fare.payout;
    position = fare.dropoff;
    completed.push(id);
  }

  return { order: [...order], completed, earnings, fuelUsed };
};

// Exhaustive search. With 7 fares this is at most a few thousand branches.
export const solve = (
  puzzle: Pick<Puzzle, 'start' | 'fuel' | 'fares'>
): PlanResult => {
  let bestOrder: number[] = [];
  let bestEarnings = 0;
  let bestFuel = 0;
  const used = new Set<number>();
  const current: number[] = [];

  const visit = (position: Cell, fuelUsed: number, earnings: number): void => {
    if (
      earnings > bestEarnings ||
      (earnings === bestEarnings && fuelUsed < bestFuel)
    ) {
      bestEarnings = earnings;
      bestFuel = fuelUsed;
      bestOrder = [...current];
    }
    for (const fare of puzzle.fares) {
      if (used.has(fare.id)) continue;
      const cost =
        distance(position, fare.pickup) + distance(fare.pickup, fare.dropoff);
      if (fuelUsed + cost > puzzle.fuel) continue;
      used.add(fare.id);
      current.push(fare.id);
      visit(fare.dropoff, fuelUsed + cost, earnings + fare.payout);
      current.pop();
      used.delete(fare.id);
    }
  };

  visit(puzzle.start, 0, 0);
  return evaluatePlan(puzzle, bestOrder);
};

const buildCandidate = (
  date: string,
  attempt: number
): Omit<Puzzle, 'best'> => {
  const random = mulberry32(hashString(`one-fare:${date}:${attempt}`));
  const pick = (limit: number): number => Math.floor(random() * limit);
  const taken: Cell[] = [];

  const freeCell = (): Cell => {
    for (;;) {
      const cell = { x: pick(GRID_WIDTH), y: pick(GRID_HEIGHT) };
      if (!taken.some((other) => sameCell(other, cell))) {
        taken.push(cell);
        return cell;
      }
    }
  };

  const start = freeCell();
  const fares: Fare[] = [];
  for (let id = 1; id <= FARE_COUNT; id++) {
    const pickup = freeCell();
    let dropoff = freeCell();
    while (distance(pickup, dropoff) < 2) {
      taken.pop();
      dropoff = freeCell();
    }
    // Longer rides pay more, plus a tip so the best route is not just "longest rides first".
    const payout = 3 + distance(pickup, dropoff) * 2 + pick(7);
    fares.push({ id, pickup, dropoff, payout });
  }

  return {
    date,
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
    start,
    fuel: BASE_FUEL + pick(5),
    fares,
  };
};

// A good daily puzzle forces a real choice: the best shift completes some fares, never all.
const isWellFormed = (best: PlanResult): boolean =>
  best.completed.length >= 3 && best.completed.length <= FARE_COUNT - 2;

export const generatePuzzle = (date: string): Puzzle => {
  let fallback: Puzzle | undefined;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = buildCandidate(date, attempt);
    const puzzle = { ...candidate, best: solve(candidate) };
    if (isWellFormed(puzzle.best)) return puzzle;
    fallback ??= puzzle;
  }
  if (fallback === undefined) throw new Error('No puzzle generated');
  return fallback;
};

export type Rating = 'perfect' | 'great' | 'good' | 'rough';

export const rate = (earnings: number, bestEarnings: number): Rating => {
  if (bestEarnings <= 0 || earnings >= bestEarnings) return 'perfect';
  const share = earnings / bestEarnings;
  if (share >= 0.9) return 'great';
  if (share >= 0.7) return 'good';
  return 'rough';
};

// --- Daily numbering -------------------------------------------------------

export const LAUNCH_DATE = '2026-11-15';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isDateString = (value: unknown): value is string =>
  typeof value === 'string' &&
  DATE_PATTERN.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export const todayUtc = (now: Date = new Date()): string =>
  now.toISOString().slice(0, 10);

export const addDays = (date: string, days: number): string => {
  const time = Date.parse(`${date}T00:00:00Z`) + days * 86400000;
  return new Date(time).toISOString().slice(0, 10);
};

// Shift #1 is the launch date. Earlier dates still get a positive number so nothing breaks.
export const puzzleNumber = (date: string): number => {
  const days = Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${LAUNCH_DATE}T00:00:00Z`)) /
      86400000
  );
  return Math.max(1, days + 1);
};

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const shortDate = (date: string): string => {
  const month = MONTHS[Number(date.slice(5, 7)) - 1] ?? '';
  return `${month} ${Number(date.slice(8, 10))}`;
};

// Post data arrives as loose JSON. Pull the date out without trusting its shape.
export const dateFromPostData = (data: unknown): string | undefined => {
  if (typeof data !== 'object' || data === null) return undefined;
  const value: unknown = Reflect.get(data, 'date');
  return isDateString(value) ? value : undefined;
};

export const fareLetter = (id: number): string =>
  String.fromCharCode(64 + Math.max(1, Math.min(26, id)));

export const RATING_LABEL: Record<Rating, string> = {
  perfect: 'Perfect shift',
  great: 'Great shift',
  good: 'Solid shift',
  rough: 'Rough night',
};

// One line a player can paste into the comments.
export const shareLine = (
  date: string,
  earnings: number,
  bestEarnings: number,
  fuelUsed: number,
  fuel: number
): string =>
  `One Fare #${puzzleNumber(date)}: $${earnings} of $${bestEarnings}, ${fuelUsed}/${fuel} fuel`;

// Minutes until the next UTC day starts, which is when the next city is posted.
export const minutesToNextCity = (now: Date = new Date()): number => {
  const next = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  );
  return Math.max(1, Math.ceil((next - now.getTime()) / 60000));
};

export const formatCountdown = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
};

// The comment a player can choose to post. The route sits behind Reddit spoiler tags
// so the thread can argue lines without ruining the puzzle for people still playing.
export const commentText = (puzzle: Puzzle, result: PlanResult): string => {
  const line = shareLine(
    puzzle.date,
    result.earnings,
    puzzle.best.earnings,
    result.fuelUsed,
    puzzle.fuel
  );
  if (result.completed.length === 0) return line;
  const route = result.completed.map(fareLetter).join(' → ');
  return `${line}\n\nMy route: >!${route}!<`;
};
