# One Fare

A daily rideshare route puzzle for Reddit, built on Devvit Web. Everyone gets the same city each day:
seven fares, one tank of fuel. Plan the shift that earns the most, then compare with the day's best.

AIZOYA's entry for Reddit's Game of the Day Hackathon (Devpost, closes December 8, 2026).

## Status

- Game rules and exact solver: written, unit-tested locally.
- Client and server: still the stock Reddit React template.
- Not yet playtested on Reddit, not uploaded, not published.

## Commands

- `npm run dev`: playtest on Reddit (needs `npm run login` first)
- `npm run test:unit`: game-rule tests
- `npm run test:types`, `npm run lint`, `npm run build`

Started from Reddit's `devvit-template-react` (BSD-3-Clause, see `LICENSE`).
