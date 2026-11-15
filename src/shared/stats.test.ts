import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  computeDayStats,
  nextStreak,
  parseOrder,
  parseStreakRecord,
  spreadBand,
  toStreak,
} from './stats.ts';

test('day stats from a histogram', () => {
  const histogram = { '46': '2', '41': '5', '30': '3', junk: '4', '20': '-1' };
  // 46 is the best; 41 is 89% (70%+ band); 30 is 65% (50%+ band).
  assert.deepEqual(computeDayStats(histogram, 41, 46), {
    players: 10,
    beat: 30,
    perfect: 20,
    spread: [0, 3, 5, 0, 2],
  });
  assert.deepEqual(computeDayStats(histogram, 46, 46), {
    players: 10,
    beat: 80,
    perfect: 20,
    spread: [0, 3, 5, 0, 2],
  });
  assert.deepEqual(computeDayStats({}, 10, 46), {
    players: 0,
    beat: 0,
    perfect: 0,
    spread: [0, 0, 0, 0, 0],
  });
});

test('streaks grow on consecutive days and reset after a gap', () => {
  const start = { lastDate: undefined, current: 0, best: 0 };
  const day1 = nextStreak(start, '2026-11-30');
  assert.deepEqual(day1, { lastDate: '2026-11-30', current: 1, best: 1 });
  const day2 = nextStreak(day1, '2026-12-01');
  assert.deepEqual(day2, { lastDate: '2026-12-01', current: 2, best: 2 });
  assert.equal(nextStreak(day2, '2026-12-01'), day2);
  // Finishing an older post never rewinds or changes the streak.
  assert.equal(nextStreak(day2, '2026-11-20'), day2);
  const gap = nextStreak(day2, '2026-12-04');
  assert.deepEqual(gap, { lastDate: '2026-12-04', current: 1, best: 2 });
});

test('stored streak fields are parsed defensively', () => {
  assert.deepEqual(
    parseStreakRecord({ lastDate: '2026-11-15', current: '3', best: '7' }),
    { lastDate: '2026-11-15', current: 3, best: 7 }
  );
  assert.deepEqual(parseStreakRecord({ current: 'x', best: '-2' }), {
    lastDate: undefined,
    current: 0,
    best: 0,
  });
});

test('client plans are validated', () => {
  assert.deepEqual(parseOrder([3, 1, 7]), [3, 1, 7]);
  assert.deepEqual(parseOrder([]), []);
  assert.equal(parseOrder('3,1'), undefined);
  assert.equal(parseOrder([1, '2']), undefined);
  assert.equal(parseOrder([1.5]), undefined);
  assert.equal(parseOrder([0]), undefined);
  assert.equal(parseOrder(Array.from({ length: 17 }, () => 1)), undefined);
});

test('spread bands line up with the rating thresholds', () => {
  assert.equal(spreadBand(60, 60), 4);
  assert.equal(spreadBand(54, 60), 3);
  assert.equal(spreadBand(53, 60), 2);
  assert.equal(spreadBand(42, 60), 2);
  assert.equal(spreadBand(41, 60), 1);
  assert.equal(spreadBand(30, 60), 1);
  assert.equal(spreadBand(29, 60), 0);
  assert.equal(spreadBand(0, 0), 4);
});

test('a streak only shows while it is alive', () => {
  const record = { lastDate: '2026-12-01', current: 4, best: 6 };
  assert.deepEqual(toStreak(record, '2026-12-01'), { current: 4, best: 6 });
  assert.deepEqual(toStreak(record, '2026-12-02'), { current: 4, best: 6 });
  assert.deepEqual(toStreak(record, '2026-12-03'), { current: 0, best: 6 });
  assert.deepEqual(
    toStreak({ lastDate: undefined, current: 0, best: 0 }, '2026-12-03'),
    { current: 0, best: 0 }
  );
});
