# One Fare — AIZOYA entry for Reddit's Game of the Day Hackathon

Daily rideshare route puzzle on Devvit Web. Devpost deadline: December 8, 2026, 6:00pm PST.
Devvit app name: `aizoya-daily`. Read `AGENTS.md` for the Devvit platform rules; they apply in full.

## Working rules (AIZOYA OS 2.6)

- Inspect the repo, README, package manifest, lockfile and current branch before changing anything. Reuse what is there.
- Work on a branch and open a pull request. Never push to `main`.
- Report source code, local tests, CI, playtest and published as separate states. One is never proof of another.
- Ask Franklyn before spending, deploying, publishing, changing access, accepting terms, or making the final submission.
- Franklyn handles passwords, verification codes, identity checks and signatures. Never put secrets in the repo or a handoff.

## What judges score

Delightful UX, Polish, Reddit-y, Daily Content. They explicitly mark down "AI slop", heavy Reddit theming
(karma, Snoo), trivia, clones and long instructions. Aim for: play within seconds, one clear result card,
streaks, and a reason to comment.

## Layout

- `src/shared/onefare.ts`: pure game rules (seeded daily puzzle, plan scoring, exact solver, dates). No Devvit imports.
- `src/shared/stats.ts`: community stats, streak and input-validation helpers. No runtime relative imports, so it runs under Node type stripping.
- `src/shared/*.test.ts`: unit tests, run with `npm run test:unit` (no install needed). Excluded from tsc and eslint.
- `src/client/game.tsx`: the playable screen. `components/CityMap.tsx` (SVG map), `components/Receipt.tsx` (result card), `hooks/useShift.ts` (API).
- `src/client/splash.tsx`: the inline feed view. Keep it light.
- `src/server/core/store.ts`: Redis (shift per user per date, earnings histogram per date, streak per user). `core/post.ts`: one post per date.
- `src/server/routes`: `api` (init, submit), `menu`, `triggers`, `scheduler` (daily post, cron in `devvit.json`, UTC).

## Checks

`npm run test:types`, `npm run lint`, `npm run test:unit`, `npm run build`. CI runs all four on every push.
For `claude/*` branches CI also force-pushes the built client to `preview/<branch>`; see `tools/preview/README.md`
for serving and screenshotting it. A preview screenshot is not a Reddit playtest.
There is no `package-lock.json` yet; generate and commit one from the first machine that can run `npm install`.

## Not done yet

- No playtest on Reddit, no upload, no publish.
- Devvit Journeys instrumentation (judges ask for it) needs the `@devvit/analytics` package.
- Difficulty tuning, a how-to-play first-run hint on the map, sound/haptics, and a subreddit subscribe prompt on the receipt.
