import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2];
const game = await import(process.argv[3] + '/src/shared/onefare.ts');
const stats = await import(process.argv[3] + '/src/shared/stats.ts');
const date = process.argv[4] ?? '2026-11-15';
const hist = { '20': '14', '25': '22', '31': '40', '36': '51', '40': '30' };
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.map': 'application/json' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/init') {
    res.setHeader('content-type', 'application/json');
    let shift = null;
    if (process.argv[5] === 'done') {
      const puzzle = game.generatePuzzle(date);
      const result = game.evaluatePlan(puzzle, puzzle.best.completed.slice(0, 2));
      shift = { result, stats: stats.computeDayStats(hist, result.earnings, puzzle.best.earnings), streak: { current: 3, best: 5 }, saved: true, commented: false };
    }
    return res.end(JSON.stringify({ type: 'init', date, username: 'tester', subreddit: 'onefare', joined: false, userActions: process.argv[6] !== 'noactions', canJoin: false, players: 157, shift }));
  }
  if (url.pathname === '/api/join') {
    res.setHeader('content-type', 'application/json');
    return res.end(JSON.stringify({ type: 'join', joined: true }));
  }
  if (url.pathname === '/api/comment') {
    res.setHeader('content-type', 'application/json');
    return res.end(JSON.stringify({ type: 'comment', commented: true }));
  }
  if (url.pathname === '/api/submit') {
    let body = ''; for await (const c of req) body += c;
    const order = stats.parseOrder(JSON.parse(body).order) ?? [];
    const puzzle = game.generatePuzzle(date);
    const result = game.evaluatePlan(puzzle, order);
    const h = { ...hist, [String(puzzle.best.earnings)]: '19' };
    h[String(result.earnings)] = String(Number(h[String(result.earnings)] ?? 0) + 1);
    res.setHeader('content-type', 'application/json');
    return res.end(JSON.stringify({ type: 'submit', date, shift: { result, stats: stats.computeDayStats(h, result.earnings, puzzle.best.earnings), streak: { current: 3, best: 5 }, saved: true, commented: false } }));
  }
  const file = path.join(root, path.normalize(url.pathname === '/' ? '/game.html' : url.pathname));
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.statusCode = 404; return res.end('nf'); }
  res.setHeader('content-type', types[path.extname(file)] ?? 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(4173, () => console.log('up'));
