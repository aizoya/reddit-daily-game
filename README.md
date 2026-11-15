# One Fare

One Fare is a daily route puzzle for Reddit. Every day the app posts a new city. You are a driver with
one tank of fuel and more ride requests than you can take. Tap the fares in the order you would drive
them. A fare only pays if you have the fuel to finish the drop-off. When you end the shift you get a
receipt: what you earned, the best possible shift for that city, how you compare with everyone else who
drove it, and your streak.

It is for any community that wants a quick shared daily puzzle. One shift takes about a minute.

## How to play

1. Open the day's One Fare post and tap **Start shift**.
2. On the map, a circle is a pickup and a square with the same letter is its drop-off.
3. Tap fares in the order you want to drive them. The fuel gauge shows what is left, and each fare shows
   what it would cost from where you are. Tap a fare again to drop it.
4. Tap **End shift**. You get one scored shift per city, so this is final.
5. On the receipt you can see the best route, and compare your result with other drivers.

The week has a rhythm: Quiet Monday (six fares), Payday Friday (bigger tips), Long Haul Saturday (eight
fares and a bigger tank) and Low Tank Sunday (far less fuel). Other days have seven fares.

## What the app does on Reddit

- **Posts once a day.** A scheduled task creates the day's post shortly after midnight UTC. Moderators can
  also create it from the subreddit menu with **Post today's One Fare**. There is never more than one post
  per date.
- **Keeps a score thread.** Each post gets one stickied comment from the app. Results are posted as replies
  to it, so the main comment section stays free for discussion.
- **Posting a result is optional.** After a shift, a player can tap **Post my result**. A confirmation
  explains that a public comment will be posted from their own account, showing their username and score,
  with the route behind a spoiler tag. Nothing is posted without that second tap, and each player can post
  once per city. They can delete the comment on Reddit like any other.
- **Joining is optional.** A separate **Join** button subscribes the player to the community from their own
  account. It is never required to play.
- Posting and joining are only offered once Reddit has approved the app (before that, only to the app owner
  for testing). Until then players get a **Copy result** button instead.

## Data the app stores

Stored in the app's Redis for the subreddit it is installed in:

- Each player's finished shift for a date (the fares they completed), keyed by their Reddit user ID
- Each player's streak
- Whether a player has posted a result for a date, and whether they joined through the app
- A per-day count of how many players earned each amount (no user IDs)

Player records expire automatically 30 days after they were last written. Nothing is sent to any service
outside Reddit.

## Setup for moderators

Install the app and it creates the first post. No configuration is needed. To post manually, use
**Post today's One Fare** in the subreddit's mod menu.

## For developers

- `npm run dev`: playtest on Reddit (run `npm run login` first)
- `npm run test:unit`, `npm run test:types`, `npm run lint`, `npm run build`
- `CLAUDE.md` describes the layout and working rules; `docs/SUBMISSION.md` is the hackathon submission draft

Built on Reddit's `devvit-template-react` (BSD-3-Clause, see `LICENSE`). Questions or problems: open an
issue on this repository or message the moderators of the community where you found the game.
