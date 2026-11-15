# Devpost submission draft: One Fare

Draft only. Franklyn reviews, edits and submits. Deadline: December 8, 2026, 6:00pm PST.
Facts below are true as of 2026-11-15; update anything that changes before submitting.

## Still needed before submitting

- [ ] A public subreddit for the game, with the app installed and at least a few daily posts
- [ ] App listing link from developers.reddit.com (requires `devvit upload`; the app may stay private)
- [ ] Demo post link: a public post running the game
- [ ] Reddit review if the "post my result" comment permission is kept
- [ ] Optional developer survey
- [ ] Judge access: the rules allow a private uploaded app, but judges must be able to reach a working
      demo post. Either use a public demo subreddit or follow the rules' admin-access alternative. Confirm
      which on the official rules page before submitting.
- [ ] Decide when to submit the app for Reddit review. "Post my result" and Join stay hidden from everyone
      but the app owner until a reviewed version is approved (`USER_ACTIONS_APPROVED` in
      `src/server/core/config.ts`).
- [ ] Check the official rules page for anything this draft misses

## Short description (one line)

A daily rideshare route puzzle: seven fares, one tank of fuel, one best shift. Everyone gets the same city.

## What it does

Every day One Fare posts a new city. You are a driver with one tank of fuel and more ride requests than
you can take. Tap fares in the order you would drive them; each fare only pays if you can finish the
drop-off. When you end the shift you get a receipt: what you earned, the best possible shift, how you
compare with everyone else who drove that city, and your streak.

The week has a rhythm. Quiet Monday has six fares, Payday Friday has big tippers, Long Haul Saturday has
eight fares and a bigger tank, and Low Tank Sunday gives you far less fuel.

## Why it belongs on Reddit

- One city per day, shared by everyone, so the comment thread is about the same puzzle
- An opt-in "Post my result" reply in a stickied score thread, with the route behind a spoiler tag, so
  people can compare lines without ruining the puzzle and the main thread stays free for discussion
- Each post keeps its own date, so old posts stay playable
- The feed card shows today's map before you tap, and your own route and score after you finish

## How it maps to the judging criteria

- **Delightful UX:** playable in seconds from the feed card; one hint line; the cab drives your route when
  the shift ends
- **Polish:** mobile-first layout checked at phone sizes; server re-scores every shift; reduced-motion respected
- **Reddit-y:** shared daily city, spoiler-tagged routes in comments, community comparison on the receipt
- **Daily content:** a new generated city every day, a weekly rhythm of themes, streaks, countdown to the next city

## How it was built

Devvit Web with React, TypeScript, Tailwind and Hono. The puzzle generator, scoring and an exact solver are
pure TypeScript shared by client and server, with unit tests. Redis stores each player's shift, a per-day
earnings histogram and streaks. A scheduled task posts the new city once a day.

## Demo video outline (about 60 seconds)

1. Feed: the post card with today's map and theme (5s)
2. Tap Start shift, plan three or four fares, show the fuel gauge emptying and a fare being refused (20s)
3. End shift: cab drives the route, receipt prints (10s)
4. Show best route (5s)
5. Post my result, then the comment thread with spoiler-tagged routes (10s)
6. Next day's post with a different theme and the streak at 2 (10s)
