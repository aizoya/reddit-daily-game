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

- `src/shared/onefare.ts`: pure game rules (seeded daily puzzle, plan scoring, exact solver). No Devvit imports.
- `src/shared/onefare.test.ts`: unit tests, run with `npm run test:unit` (Node type stripping, no install needed).
- `src/client`, `src/server`: still the unmodified Reddit React template.

## Checks

`npm run test:types`, `npm run lint`, `npm run test:unit`, `npm run build`. CI runs all four on every push.
There is no `package-lock.json` yet; generate and commit one from the first machine that can run `npm install`.
