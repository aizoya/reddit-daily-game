import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluatePlan, generatePuzzle } from '../../shared/onefare.ts';
import {
  computeDayStats,
  nextStreak,
  parseOrder,
  parseStreakRecord,
  toStreak,
} from '../../shared/stats.ts';
import { createShiftStore } from './shiftStore.ts';

// An in-memory Redis with just enough behaviour to exercise the store: every call yields
// once so concurrent requests interleave, WATCH detects a changed key at EXEC, and
// individual commands can be made to fail.
const fakeRedis = (options: { conflict?: 'throw' | 'null'; fail?: string[] } = {}) => {
  const strings = new Map<string, string>();
  const hashes = new Map<string, Map<string, string>>();
  const versions = new Map<string, number>();
  const failing = new Set(options.fail ?? []);
  const tick = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
  const bump = (key: string): void => {
    versions.set(key, (versions.get(key) ?? 0) + 1);
  };
  const guard = (name: string): void => {
    if (failing.has(name)) throw new Error(`${name} failed`);
  };
  const hash = (key: string): Map<string, string> => {
    let found = hashes.get(key);
    if (!found) {
      found = new Map();
      hashes.set(key, found);
    }
    return found;
  };
  const ops = {
    set: (key: string, value: string): void => {
      strings.set(key, value);
      bump(key);
    },
    hSet: (key: string, fields: Record<string, string>): void => {
      for (const [field, value] of Object.entries(fields)) hash(key).set(field, value);
      bump(key);
    },
    hIncrBy: (key: string, field: string, value: number): void => {
      hash(key).set(field, String(Number(hash(key).get(field) ?? 0) + value));
      bump(key);
    },
  };
  const redis = {
    strings,
    hashes,
    failing,
    async get(key: string) {
      await tick();
      return strings.get(key);
    },
    async set(key: string, value: string) {
      await tick();
      guard('set');
      ops.set(key, value);
    },
    async del(key: string) {
      await tick();
      strings.delete(key);
      bump(key);
    },
    async incrBy(key: string, value: number) {
      await tick();
      const next = Number(strings.get(key) ?? 0) + value;
      ops.set(key, String(next));
      return next;
    },
    async expire() {
      await tick();
    },
    async hGetAll(key: string) {
      await tick();
      return Object.fromEntries(hash(key));
    },
    async hSet(key: string, fields: Record<string, string>) {
      await tick();
      guard('hSet');
      ops.hSet(key, fields);
    },
    async hIncrBy(key: string, field: string, value: number) {
      await tick();
      guard('hIncrBy');
      ops.hIncrBy(key, field, value);
    },
    async watch(...keys: string[]) {
      await tick();
      guard('watch');
      const seen = new Map(keys.map((key) => [key, versions.get(key) ?? 0]));
      const queue: (() => void)[] = [];
      return {
        async multi() {
          await tick();
        },
        async set(key: string, value: string) {
          guard('txn.set');
          queue.push(() => ops.set(key, value));
        },
        async hIncrBy(key: string, field: string, value: number) {
          guard('txn.hIncrBy');
          queue.push(() => ops.hIncrBy(key, field, value));
        },
        async hSet(key: string, fields: Record<string, string>) {
          queue.push(() => ops.hSet(key, fields));
        },
        async exec() {
          await tick();
          guard('txn.exec');
          for (const [key, version] of seen) {
            if ((versions.get(key) ?? 0) !== version) {
              if (options.conflict === 'null') return null;
              throw new Error('watched key changed');
            }
          }
          for (const run of queue) run();
          return [];
        },
        async unwatch() {
          await tick();
        },
      };
    },
  };
  return redis;
};

const TODAY = '2026-11-18';
const rules = {
  generatePuzzle,
  evaluatePlan,
  todayUtc: () => TODAY,
  computeDayStats,
  nextStreak,
  parseOrder,
  parseStreakRecord,
  toStreak,
};
const puzzle = generatePuzzle(TODAY);
const best = puzzle.best.completed;
const weak = best.slice(0, 1);
const totalPlayers = (redis: ReturnType<typeof fakeRedis>, date: string): number =>
  [...(redis.hashes.get(`hist:${date}`)?.values() ?? [])].reduce(
    (sum, count) => sum + Number(count),
    0
  );

// Silence the store's expected error logging during failure tests.
const quiet = async <T>(run: () => Promise<T>): Promise<T> => {
  const original = console.error;
  console.error = () => {};
  try {
    return await run();
  } finally {
    console.error = original;
  }
};

for (const conflict of ['throw', 'null'] as const) {
  test(`two simultaneous submissions count one player once (conflict: ${conflict})`, async () => {
    const redis = fakeRedis({ conflict });
    const store = createShiftStore(redis, rules, 60);
    const [a, b] = await quiet(() =>
      Promise.all([
        store.submitShift(TODAY, 't2_ann', best),
        store.submitShift(TODAY, 't2_ann', weak),
      ])
    );
    assert.deepEqual(a.result, b.result, 'both requests see the same shift');
    assert.equal(totalPlayers(redis, TODAY), 1);
    assert.equal(a.stats.players, 1);
    assert.equal(a.streak.current, 1);
    const stored = await store.loadShift(TODAY, 't2_ann');
    assert.deepEqual(stored?.result, a.result);
  });
}

test('five simultaneous taps still count once', async () => {
  const redis = fakeRedis();
  const store = createShiftStore(redis, rules, 60);
  const results = await quiet(() =>
    Promise.all(
      [best, weak, best, weak, best].map((order) =>
        store.submitShift(TODAY, 't2_ann', order)
      )
    )
  );
  assert.equal(totalPlayers(redis, TODAY), 1);
  for (const result of results) assert.deepEqual(result.result, results[0]?.result);
});

test('a second submission returns the first and changes nothing', async () => {
  const redis = fakeRedis();
  const store = createShiftStore(redis, rules, 60);
  const first = await store.submitShift(TODAY, 't2_ann', weak);
  const second = await store.submitShift(TODAY, 't2_ann', best);
  assert.deepEqual(second.result, first.result);
  assert.equal(totalPlayers(redis, TODAY), 1);
});

test('different players each count once and compare correctly', async () => {
  const redis = fakeRedis();
  const store = createShiftStore(redis, rules, 60);
  await Promise.all([
    store.submitShift(TODAY, 't2_ann', weak),
    store.submitShift(TODAY, 't2_bo', weak),
    store.submitShift(TODAY, 't2_cy', best),
  ]);
  assert.equal(totalPlayers(redis, TODAY), 3);
  const top = await store.loadShift(TODAY, 't2_cy');
  assert.equal(top?.stats.players, 3);
  assert.equal(top?.stats.beat, 67);
  assert.equal(top?.stats.perfect, 33);
});

test('a failed transaction saves nothing, and a retry then saves everything', async () => {
  const redis = fakeRedis({ fail: ['txn.exec', 'set'] });
  const store = createShiftStore(redis, rules, 60);
  await quiet(() =>
    assert.rejects(store.submitShift(TODAY, 't2_ann', best))
  );
  assert.equal(await store.loadShift(TODAY, 't2_ann'), null);
  assert.equal(totalPlayers(redis, TODAY), 0);
  assert.equal(redis.hashes.get('streak:t2_ann')?.size ?? 0, 0);

  redis.failing.clear();
  const retry = await store.submitShift(TODAY, 't2_ann', best);
  assert.equal(retry.saved, true);
  assert.equal(totalPlayers(redis, TODAY), 1);
  assert.equal(retry.streak.current, 1);
});

test('if transactions are unavailable the claimed fallback still saves once', async () => {
  const redis = fakeRedis({ fail: ['txn.exec'] });
  const store = createShiftStore(redis, rules, 60);
  const [a, b] = await quiet(() =>
    Promise.allSettled([
      store.submitShift(TODAY, 't2_ann', best),
      store.submitShift(TODAY, 't2_ann', weak),
    ])
  );
  assert.equal(totalPlayers(redis, TODAY), 1);
  assert.ok(a.status === 'fulfilled' || b.status === 'fulfilled');
  assert.notEqual(await store.loadShift(TODAY, 't2_ann'), null);
});

test('archive posts never move the streak; today extends it', async () => {
  const redis = fakeRedis();
  const store = createShiftStore(redis, rules, 60);
  await redis.hSet('streak:t2_ann', {
    lastDate: '2026-11-17',
    current: '3',
    best: '5',
  });
  const old = await store.submitShift('2026-11-16', 't2_ann', [1]);
  assert.equal(old.streak.current, 3, 'old post leaves the streak alone');
  assert.equal(redis.hashes.get('streak:t2_ann')?.get('lastDate'), '2026-11-17');
  const today = await store.submitShift(TODAY, 't2_ann', best);
  assert.equal(today.streak.current, 4);
  assert.equal(today.streak.best, 5);
});

test('logged-out players are scored but never stored', async () => {
  const redis = fakeRedis();
  const store = createShiftStore(redis, rules, 60);
  const result = await store.submitShift(TODAY, undefined, best);
  assert.equal(result.saved, false);
  assert.equal(result.result.earnings, puzzle.best.earnings);
  assert.equal(totalPlayers(redis, TODAY), 0);
  assert.equal(redis.strings.size, 0);
});

test('a comment can be claimed once, and again after a release', async () => {
  const redis = fakeRedis();
  const store = createShiftStore(redis, rules, 60);
  const claims = await Promise.all([
    store.claimComment(TODAY, 't2_ann'),
    store.claimComment(TODAY, 't2_ann'),
    store.claimComment(TODAY, 't2_ann'),
  ]);
  assert.equal(claims.filter(Boolean).length, 1);
  await store.releaseComment(TODAY, 't2_ann');
  assert.equal(await store.claimComment(TODAY, 't2_ann'), true);
});

test('with transactions down and a failed first write, a retry still saves once', async () => {
  const redis = fakeRedis({ fail: ['txn.exec', 'set'] });
  const store = createShiftStore(redis, rules, 60);
  await quiet(() => assert.rejects(store.submitShift(TODAY, 't2_ann', best)));
  redis.failing.delete('set');
  const retry = await quiet(() => store.submitShift(TODAY, 't2_ann', best));
  assert.equal(retry.saved, true);
  assert.equal(totalPlayers(redis, TODAY), 1);
});
