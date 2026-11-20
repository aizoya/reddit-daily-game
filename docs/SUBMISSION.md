# Devpost submission draft: One Fare

Draft text for Devpost. The draft project on Devpost now holds this content; Franklyn submits.

- Hackathon: Reddit's Game of the Day Hackathon, https://redditgameofday2026.devpost.com/
- Submission deadline: Tuesday, December 8, 2026, 6:00 pm Pacific
- Judging: December 9 to December 16, 2026. The app must keep running and posting through December 16.
- Checked against the official rules page on 2026-11-20.

## Status as of 2026-11-20 (11:25 Pacific)

| Item | State | Evidence |
|---|---|---|
| Devpost registration | Registered. Draft project "One Fare" (submission 1313619), 4 of 5 steps saved. **Not submitted.** | Devpost in Franklyn's Chrome, 2026-11-20 |
| Devpost content | Name, pitch, story, 8 built-with tags, 3 try-it links, thumbnail, 5 captioned gallery images, video link, additional info. All re-read after saving. | Devpost edit pages, 2026-11-20 |
| Demo video | 35 s, public on the AIZOYA channel: https://www.youtube.com/watch?v=_WtP80zleRc | Cut from Franklyn's screen recording of Nov 20 |
| App uploaded | Private version 0.0.3, built from `main` at `fd75ea7` (PR #23); 30/30 unit tests and build passed first | Codespace terminal, 2026-11-20 |
| Public demo subreddit | r/Onefare, version 0.0.3 installed | Install output 2026-11-20 |
| Play on 0.0.3 | Franklyn played Nov 20 (#6, Payday Friday): plan, End shift, receipt, Post my result, "Result posted". No Join button shown. | Screen recording and screenshots, 2026-11-20 |
| Daily posts | Scheduler created posts on its own; #6 exists for Nov 20 | Server log 2026-11-16; Nov 20 recording |
| More than one player | Receipt for Nov 20 says "2 drivers", so a second shift was saved that day. Who played is unknown. Crowd chart (3+ players) not yet seen. | Nov 20 receipt |
| Logged-out access, member count | **Not verified.** Claude cannot reach reddit.com. | Franklyn to check |
| README for judges | Done, in the repo root | `README.md` |

## What Franklyn must do personally

1. **Check logged-out access.** Open r/Onefare and https://developers.reddit.com/apps/aizoya-daily in a
   private window. Earlier, logged-out mobile web users saw "Unreviewed Content" on r/Onefare.
2. **Check r/Onefare has fewer than 200 members**, and keep it under 200 until judging ends Dec 16.
3. **Get two or three people on other Reddit accounts to play** on the same day, then open the r/Onefare
   mod menu and tap **One Fare: drivers per day**. Three or more players makes the crowd chart appear.
4. **On submission day, swap the test link** on Devpost from the subreddit to that day's post.
5. **Submit on Devpost:** Submit step, tick the terms box, press Submit project, before Dec 8, 6:00 pm Pacific.
   The project stays editable until the deadline.
6. **Optional:** the developer satisfaction survey for the $200 feedback prize.

## Links for the form

- App listing: https://developers.reddit.com/apps/aizoya-daily
- Test subreddit: https://www.reddit.com/r/Onefare/
- Demo post: link to the most recent One Fare post in r/Onefare on submission day (open it, then copy the
  link). Pick a weekday post with at least a few scores in its thread.
- Public repository: https://github.com/aizoya/reddit-daily-game
- Video: https://www.youtube.com/watch?v=_WtP80zleRc

The rules ask for a public subreddit with fewer than 200 members, or the dr-admin-approve app installed.
r/Onefare is public; keep it under 200 members until judging ends.

## Project name

One Fare

## Elevator pitch (under 200 characters)

A daily rideshare route puzzle on Reddit. Everyone gets the same city: a handful of fares, one tank of
fuel. Plan the shift that earns the most, then compare routes.

## About the project

### Inspiration

Every driver on a shift faces the same question: which rides are worth the gas? We turned that into a
puzzle that takes a minute to play and gives everyone in a community the same city on the same day, so
the comments are about one shared problem.

### What it does

Every day One Fare posts a new city to its subreddit. You get a handful of ride requests and one tank of
fuel. Tap the fares in the order you would drive them; a fare only pays if you can finish the drop-off.
When you end the shift the cab drives your route and a receipt prints: what you earned, the best possible
shift for that city, how you compare with every other driver, and your streak.

- **A weekly rhythm.** Quiet Monday has six fares, Payday Friday has big tippers, Long Haul Saturday has
  eight fares and a bigger tank, and Low Tank Sunday gives you far less fuel.
- **One scored shift per city.** Everyone gets one attempt, so results are comparable.
- **The best route is revealed after you play,** and you can flip between yours and the best one.
- **A score thread.** Each post gets one stickied comment from the app; results go underneath it with the
  route hidden behind a spoiler tag, so the main thread stays free for route arguments.
- **The feed card changes after you play,** showing your route, score and streak right in the feed.
- **Old posts stay playable,** because each post carries its own date.

### How we built it

Devvit Web with React, TypeScript, Tailwind and Hono. The city generator, scoring and an exact solver are
pure TypeScript shared by client and server. Each date seeds the generator, so a city never changes once
posted, and a regression test pins known dates. The server re-scores every shift instead of trusting the
client. Redis stores each player's shift, an anonymous per-day earnings histogram and streaks; a shift,
its count and the streak are saved in one transaction so a double tap can never count a player twice. A
scheduled task posts the new city shortly after midnight UTC.

*(Franklyn: add a line here about AI assistance if you want to disclose it, for example "Built with
Claude Code as a coding partner.")*

### Challenges we ran into

- Making a puzzle that is not solved by an obvious rule. Across generated days, picking the best pay per
  fuel finds the best shift only on a minority of days, so most cities need real planning.
- Saving results safely when a player taps twice or two requests race, tested against an in-memory Redis.
- Following Reddit's rules for acting on a player's behalf: score comments go under a stickied thread,
  every action is explicit and optional, and those buttons stay off until the app is reviewed.

### Accomplishments that we're proud of

- A full daily loop running on Reddit: automatic posts, saved shifts, community comparison and streaks
- A city that is fixed forever once posted, and a receipt that reads well on a phone

### What we learned

Daily games live or die on the first ten seconds and on whether there is a reason to talk afterwards.

### What's next for One Fare

Rush hours and one-way streets as new day types, weekly recaps of the cleverest routes, and turning on
one-tap score posting and joining once the app passes Reddit review.

## Testing instructions for judges

1. Open r/Onefare and tap the newest One Fare post. Older posts are playable too.
2. Tap **Start shift**. Circles are pickups, squares with the same letter are drop-offs.
3. Tap fares in the order you would drive them, watching the fuel gauge, then tap **End shift**.
4. Each Reddit account gets one scored shift per city. To play again, open an older post.
5. "Post my result" is limited to the app owner until Reddit reviews the app; other players get
   **Copy result** and can paste it in the comments.

## Built with

devvit, reddit, react, typescript, tailwindcss, hono, vite, redis

## Demo video outline (under 60 seconds, record on a phone in the Reddit app)

1. The feed card with today's map and theme (5s)
2. Start shift, plan three or four fares, show the fuel gauge emptying and a fare being refused (20s)
3. End shift: the cab drives the route and the receipt prints (10s)
4. Show best route (5s)
5. The score thread under the post (10s)
6. A different weekday post showing another theme (10s)
