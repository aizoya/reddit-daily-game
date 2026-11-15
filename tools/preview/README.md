# Local preview of a built client

For checking the screens outside Reddit. This is a mock: it proves layout and client logic, not the Devvit server.

1. Get a build: `npm run build` locally, or fetch the `preview/<branch>` branch that CI publishes for `claude/*` branches.
2. Serve it: `node --experimental-strip-types tools/preview/server.mjs <path-to-dist/client> <repo-root> 2026-11-15`
3. Open `http://localhost:4173/game.html` or `/splash.html`. Outside Reddit the page needs
   `globalThis.devvit = { context: { postData: { date: '2026-11-15' } } }` set before load
   (for example with Playwright's `add_init_script`).
