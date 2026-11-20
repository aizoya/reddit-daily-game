import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { ensureDailyPost } from '../core/post';
import { countPlayers } from '../core/store';
import { addDays, shortDate, todayUtc } from '../../shared/onefare';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await ensureDailyPost();
    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to create post' }, 400);
  }
});

// A quick moderator check that real players are getting through: how many drivers finished
// each of the last seven cities in this subreddit. Reads only the anonymous per-day counts.
menu.post('/player-counts', async (c) => {
  try {
    const today = todayUtc();
    const dates = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
    const counts = await Promise.all(dates.map((date) => countPlayers(date)));
    const line = dates
      .map((date, i) => `${shortDate(date)}: ${counts[i] ?? 0}`)
      .join(' · ');
    return c.json<UiResponse>({ showToast: `Drivers per day. ${line}` }, 200);
  } catch (error) {
    console.error(`Error reading player counts: ${error}`);
    return c.json<UiResponse>({ showToast: 'Could not read player counts' }, 400);
  }
});
