import { Hono } from 'hono';
import { context, reddit } from '@devvit/web/server';
import type {
  CommentResponse,
  ErrorResponse,
  InitResponse,
  JoinResponse,
  SubmitResponse,
} from '../../shared/api';
import {
  commentText,
  dateFromPostData,
  generatePuzzle,
  todayUtc,
} from '../../shared/onefare';
import { parseOrder } from '../../shared/stats';
import { canJoinAsUser, canUseUserActions } from '../core/config';
import { ensureScoreThread } from '../core/post';
import {
  claimComment,
  countPlayers,
  hasJoined,
  loadShift,
  markJoined,
  releaseComment,
  submitShift,
} from '../core/store';

export const api = new Hono();

// Each post carries its own date, so an old post always replays its own shift.
const currentDate = (): string =>
  dateFromPostData(context.postData) ?? todayUtc();

api.get('/init', async (c) => {
  try {
    const date = currentDate();
    const [username, shift, players, joined] = await Promise.all([
      reddit.getCurrentUsername(),
      loadShift(date, context.userId),
      countPlayers(date),
      hasJoined(context.userId),
    ]);
    return c.json<InitResponse>({
      type: 'init',
      date,
      username: username ?? null,
      subreddit: context.subredditName ?? null,
      joined,
      userActions: canUseUserActions(username),
      canJoin: canJoinAsUser(),
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

// Posts the player's saved result from their own account, as a reply under the post's
// stickied score thread (Reddit's required pattern for score comments). Only ever called
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
    if (!canUseUserActions(await reddit.getCurrentUsername())) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Posting results is not available yet' },
        403
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
    // Claim first, post second: two taps can never produce two comments.
    if (await claimComment(date, userId)) {
      try {
        const threadId = await ensureScoreThread(postId);
        await reddit.submitComment({
          id: threadId,
          text: commentText(generatePuzzle(date), shift.result),
          runAs: 'USER',
        });
      } catch (error) {
        await releaseComment(date, userId);
        throw error;
      }
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

// Joins the player to this community from their own account. Only ever called from the
// explicit Join button on the receipt; never required to play.
api.post('/join', async (c) => {
  try {
    const { userId } = context;
    if (!userId) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Log in to join' },
        401
      );
    }
    if (!canJoinAsUser()) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Joining is not available yet' },
        403
      );
    }
    await reddit.subscribeToCurrentSubreddit();
    await markJoined(userId);
    return c.json<JoinResponse>({ type: 'join', joined: true });
  } catch (error) {
    console.error('API join error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Could not join the community' },
      500
    );
  }
});
