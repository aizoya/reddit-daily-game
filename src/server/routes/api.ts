import { Hono } from 'hono';
import { context, reddit } from '@devvit/web/server';
import type {
  CommentResponse,
  ErrorResponse,
  InitResponse,
  SubmitResponse,
} from '../../shared/api';
import {
  commentText,
  dateFromPostData,
  generatePuzzle,
  todayUtc,
} from '../../shared/onefare';
import { parseOrder } from '../../shared/stats';
import {
  countPlayers,
  loadShift,
  markCommented,
  submitShift,
} from '../core/store';

export const api = new Hono();

// Each post carries its own date, so an old post always replays its own shift.
const currentDate = (): string =>
  dateFromPostData(context.postData) ?? todayUtc();

api.get('/init', async (c) => {
  try {
    const date = currentDate();
    const [username, shift, players] = await Promise.all([
      reddit.getCurrentUsername(),
      loadShift(date, context.userId),
      countPlayers(date),
    ]);
    return c.json<InitResponse>({
      type: 'init',
      date,
      username: username ?? null,
      players,
      shift,
    });
  } catch (error) {
    console.error('API init error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Could not load today’s shift' },
      500
    );
  }
});

api.post('/submit', async (c) => {
  try {
    const body: unknown = await c.req.json();
    const order =
      typeof body === 'object' && body !== null
        ? parseOrder(Reflect.get(body, 'order'))
        : undefined;
    if (order === undefined) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Invalid shift plan' },
        400
      );
    }
    const date = currentDate();
    const shift = await submitShift(date, context.userId, order);
    return c.json<SubmitResponse>({ type: 'submit', date, shift });
  } catch (error) {
    console.error('API submit error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Could not save your shift' },
      500
    );
  }
});

// Posts the player's saved result as a comment from their own account. Only ever called
// from an explicit button press, and the text is built here from the stored shift, so a
// client cannot post arbitrary text. One comment per player per shift.
api.post('/comment', async (c) => {
  try {
    const { postId, userId } = context;
    if (!postId || !userId) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Log in to post your result' },
        401
      );
    }
    const date = currentDate();
    const shift = await loadShift(date, userId);
    if (shift === null) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Finish the shift first' },
        400
      );
    }
    if (!shift.commented) {
      await reddit.submitComment({
        id: postId,
        text: commentText(generatePuzzle(date), shift.result),
        runAs: 'USER',
      });
      await markCommented(date, userId);
    }
    return c.json<CommentResponse>({ type: 'comment', commented: true });
  } catch (error) {
    console.error('API comment error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Could not post your comment' },
      500
    );
  }
});
