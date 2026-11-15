import { Hono } from 'hono';
import type { TaskResponse } from '@devvit/web/server';
import { ensureDailyPost } from '../core/post';

export const scheduler = new Hono();

// Runs once a day (see devvit.json). Safe to run twice: the post is only created once per date.
scheduler.post('/daily-post', async (c) => {
  try {
    const post = await ensureDailyPost();
    console.log(`Daily post ${post.id} ${post.created ? 'created' : 'already existed'}`);
    return c.json<TaskResponse>({ status: 'ok' }, 200);
  } catch (error) {
    console.error(`Daily post failed: ${error}`);
    return c.json({ status: 'error' }, 500);
  }
});
