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
- `src/server/core/shiftStore.ts`: the storage rules (shift per user per date, earnings histogram per date, streak per
  user, claims), written against small Redis-like interfaces with no runtime relative imports. `shiftStore.test.ts`
  runs them against an in-memory Redis, including simultaneous and failing requests. `store.ts` wires them to Devvit's
  Redis. `core/post.ts`: one post per date and its score thread.
- `src/server/routes`: `api` (init, submit, comment, join), `menu`, `triggers`, `scheduler` (daily post, cron in `devvit.json`, UTC).
- `src/server/core/config.ts`: `USER_ACTIONS_APPROVED` (false until Reddit approves a published version) and the owner
  username. While false, Post my result is offered to the owner only; everyone else gets Copy result. Join is hidden
  for everyone, owner included, because Reddit refuses SUBSCRIBE_TO_SUBREDDIT on an unapproved version.
- Moderator menu: "Post today's One Fare" and "One Fare: drivers per day" (anonymous per-day counts, last 7 days).
- User actions (`permissions.reddit.asUser` in `devvit.json`) follow Reddit's rules: explicit button, tell the player
  exactly what will appear and under which account, never gate play, keep each action separate. Score comments are
  posted as the player (`runAs: 'USER'`) as replies to one stickied app comment per post (`ensureScoreThread`).
- Saving a shift is one Redis transaction (`watch`/`multi`/`exec`) over the shift, the day histogram and the streak.
  One-time actions (daily post, score thread, comment) use an atomic `incrBy` claim, released if the action fails.
- Streaks move only when the player finishes today's city (UTC); archive posts never change them. A streak shows as
  0 once its last day is older than yesterday. Player keys expire after 30 days.

## Frozen puzzles

A date must always generate the same city, because posts and saved shifts refer to it. Weekday themes
(`WEEK` in `onefare.ts`) apply from `THEMES_START`. Never change generator numbers for dates that are
already public; add a new start date and table instead. `known dates still generate the same city`
guards this.

## Checks

`npm run test:types`, `npm run lint`, `npm run test:unit`, `npm run build`. CI runs all four on every push.
For `claude/*` branches CI also force-pushes the built client to `preview/<branch>`; see `tools/preview/README.md`
for serving and screenshotting it. A preview screenshot is not a Reddit playtest.
`package-lock.json` is committed and CI installs with `npm ci`; update the lockfile from the Codespace, not by hand.

## Submission

`docs/SUBMISSION.md` is the Devpost draft and checklist. Franklyn submits; never submit or publish for him.

## Known limits

- The best route is computed in the client, so a technical player can read it before playing. The crowd
  comparison is for fun and is not cheat-resistant; do not describe it as such.
- The transaction and claim logic is unit-tested against an in-memory Redis that imitates WATCH/EXEC. Devvit's real
  Redis may behave differently on a conflict, so it still needs a real multi-player playtest.
- If transactions are unavailable and a write fails midway through the fallback, a shift can be saved but not
  counted in the day's histogram (an undercount of one, never a double count).

## Not done yet

- Playtested on Reddit by the owner only (2026-11-15/16): automatic daily post, themes, play, save, receipt, streak of 2,
  stickied score thread and owner comment all worked. r/Onefare (public) runs private version 0.0.2. Not published.
- Not yet verified: any non-owner player; more than one player on a day.
- Playtests run from a GitHub Codespace on this repo (`npx devvit login --copy-paste`, then `npm run dev`); the authoring workspace cannot install packages.
- Devvit Journeys instrumentation (judges ask for it) needs the `@devvit/analytics` package.
- Sound/haptics. The Join button and comment posting use `asUser` permissions that Reddit reviews before publishing.
