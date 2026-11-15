import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  FARE_COUNT,
  distance,
  evaluatePlan,
  generatePuzzle,
  rate,
  solve,
} from './onefare.ts';

const dates = Array.from({ length: 60 }, (_, i) => {
  const day = new Date(Date.UTC(2026, 10, 11 + i));
  return day.toISOString().slice(0, 10);
});

test('the same date always produces the same puzzle', () => {
  assert.deepEqual(generatePuzzle('2026-11-15'), generatePuzzle('2026-11-15'));
});

test('different dates produce different puzzles', () => {
  const a = generatePuzzle('2026-11-15');
  const b = generatePuzzle('2026-11-16');
  assert.notDeepEqual(a.fares, b.fares);
});

test('every hackathon-window puzzle is valid and forces a choice', () => {
  for (const date of dates) {
    const puzzle = generatePuzzle(date);
    assert.equal(puzzle.fares.length, FARE_COUNT, date);
    const cells = [
      puzzle.start,
      ...puzzle.fares.flatMap((f) => [f.pickup, f.dropoff]),
    ];
    const keys = new Set(cells.map((c) => `${c.x},${c.y}`));
    assert.equal(keys.size, cells.length, `${date}: overlapping cells`);
    for (const c of cells) {
      assert.ok(c.x >= 0 && c.x < puzzle.width, date);
      assert.ok(c.y >= 0 && c.y < puzzle.height, date);
    }
    assert.ok(puzzle.best.completed.length >= 3, `${date}: too few fares`);
    assert.ok(
      puzzle.best.completed.length <= FARE_COUNT - 2,
      `${date}: no real choice`
    );
    assert.ok(puzzle.best.fuelUsed <= puzzle.fuel, date);
  }
});

test('the solver is never beaten by a greedy driver', () => {
  for (const date of dates) {
    const puzzle = generatePuzzle(date);
    const byPayout = [...puzzle.fares]
      .sort((a, b) => b.payout - a.payout)
      .map((f) => f.id);
    const nearestFirst = [...puzzle.fares]
      .sort(
        (a, b) =>
          distance(puzzle.start, a.pickup) - distance(puzzle.start, b.pickup)
      )
      .map((f) => f.id);
    for (const order of [byPayout, nearestFirst]) {
      const result = evaluatePlan(puzzle, order);
      assert.ok(result.earnings <= puzzle.best.earnings, date);
    }
  }
});

test('greedy play is usually not optimal, so the puzzle has depth', () => {
  let beaten = 0;
  for (const date of dates) {
    const puzzle = generatePuzzle(date);
    const byPayout = [...puzzle.fares]
      .sort((a, b) => b.payout - a.payout)
      .map((f) => f.id);
    if (evaluatePlan(puzzle, byPayout).earnings < puzzle.best.earnings) {
      beaten++;
    }
  }
  assert.ok(beaten >= dates.length * 0.6, `only ${beaten}/${dates.length}`);
});

test('a plan stops at the first fare it cannot afford', () => {
  const puzzle = {
    start: { x: 0, y: 0 },
    fuel: 6,
    fares: [
      { id: 1, pickup: { x: 1, y: 0 }, dropoff: { x: 3, y: 0 }, payout: 10 },
      { id: 2, pickup: { x: 6, y: 6 }, dropoff: { x: 0, y: 6 }, payout: 50 },
      { id: 3, pickup: { x: 3, y: 1 }, dropoff: { x: 3, y: 3 }, payout: 8 },
    ],
  };
  const result = evaluatePlan(puzzle, [1, 2, 3]);
  assert.deepEqual(result.completed, [1]);
  assert.equal(result.earnings, 10);
  assert.equal(result.fuelUsed, 3);
  assert.deepEqual(solve(puzzle).completed, [1, 3]);
});

test('duplicate or unknown fares end the plan', () => {
  const puzzle = generatePuzzle('2026-11-15');
  const first = puzzle.best.completed[0];
  assert.ok(first !== undefined);
  assert.deepEqual(evaluatePlan(puzzle, [first, first]).completed, [first]);
  assert.deepEqual(evaluatePlan(puzzle, [999]).completed, []);
});

test('ratings', () => {
  assert.equal(rate(40, 40), 'perfect');
  assert.equal(rate(37, 40), 'great');
  assert.equal(rate(30, 40), 'good');
  assert.equal(rate(10, 40), 'rough');
});

test('dates, numbering and post data', async () => {
  const m = await import('./onefare.ts');
  assert.equal(m.puzzleNumber('2026-11-15'), 1);
  assert.equal(m.puzzleNumber('2026-12-08'), 24);
  assert.equal(m.puzzleNumber('2026-01-01'), 1);
  assert.equal(m.addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(m.addDays('2026-12-01', -1), '2026-11-30');
  assert.equal(m.shortDate('2026-12-08'), 'Dec 8');
  assert.equal(m.todayUtc(new Date('2026-11-15T23:59:59Z')), '2026-11-15');
  assert.equal(m.dateFromPostData({ date: '2026-11-20' }), '2026-11-20');
  assert.equal(m.dateFromPostData({ date: 'tomorrow' }), undefined);
  assert.equal(m.dateFromPostData({ date: 20261120 }), undefined);
  assert.equal(m.dateFromPostData(null), undefined);
  assert.equal(m.dateFromPostData(undefined), undefined);
  assert.equal(m.fareLetter(1), 'A');
  assert.equal(m.fareLetter(7), 'G');
  assert.equal(
    m.shareLine('2026-11-16', 41, 46, 22, 26),
    'One Fare #2: $41 of $46, 22/26 fuel'
  );
});

test('countdown to the next city', async () => {
  const m = await import('./onefare.ts');
  assert.equal(m.minutesToNextCity(new Date('2026-11-15T21:48:00Z')), 132);
  assert.equal(m.minutesToNextCity(new Date('2026-11-15T23:59:30Z')), 1);
  assert.equal(m.minutesToNextCity(new Date('2026-12-31T23:00:00Z')), 60);
  assert.equal(m.formatCountdown(132), '2h 12m');
  assert.equal(m.formatCountdown(60), '1h');
  assert.equal(m.formatCountdown(7), '7m');
});

test('comment text hides the route behind spoiler tags', async () => {
  const m = await import('./onefare.ts');
  const puzzle = m.generatePuzzle('2026-11-15');
  const result = m.evaluatePlan(puzzle, [1, 3]);
  assert.equal(
    m.commentText(puzzle, result),
    `One Fare #1: $${result.earnings} of $${puzzle.best.earnings}, ${result.fuelUsed}/${puzzle.fuel} fuel\n\nMy route: >!A → C!<`
  );
  const empty = m.evaluatePlan(puzzle, []);
  assert.ok(!m.commentText(puzzle, empty).includes('>!'));
});
