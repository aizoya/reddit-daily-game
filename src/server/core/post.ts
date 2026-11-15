import { reddit, redis } from '@devvit/web/server';
import {
  puzzleNumber,
  shortDate,
  themeFor,
  todayUtc,
} from '../../shared/onefare';
import { claim, release } from './store';

const postTitle = (date: string): string => {
  const theme = themeFor(date);
  const lead = theme.name ? `${theme.name}. ` : '';
  return `One Fare #${puzzleNumber(date)} (${shortDate(date)}): ${lead}${theme.blurb} Best shift wins.`;
};

const postKey = (date: string): string => `post:${date}`;
const postClaimKey = (date: string): string => `postclaim:${date}`;
const stickyKey = (postId: string): string => `sticky:${postId}`;
const stickyClaimKey = (postId: string): string => `stickyclaim:${postId}`;

const STICKY_TEXT =
  'Scores go here. Tap “Post my result” on your receipt to add yours as a reply. ' +
  'Routes are hidden behind spoiler tags, so open them only after you have played.';

// Reddit asks for score comments to live under one stickied comment, so the main thread
// stays free for real discussion. Returns that comment's id, creating it once per post.
type PostId = `t3_${string}`;
type CommentId = `t1_${string}`;

const isCommentId = (value: string): value is CommentId =>
  value.startsWith('t1_');

export const ensureScoreThread = async (postId: PostId): Promise<CommentId> => {
  const existing = await redis.get(stickyKey(postId));
  if (existing && isCommentId(existing)) return existing;
  if (!(await claim(stickyClaimKey(postId)))) {
    // Another request is creating it right now.
    throw new Error('Score thread is being created, try again');
  }
  try {
    const comment = await reddit.submitComment({
      id: postId,
      text: STICKY_TEXT,
    });
    await redis.set(stickyKey(postId), comment.id);
    try {
      await comment.distinguish(true);
    } catch (error) {
      // Not being able to pin is not fatal: replies still group under this comment.
      console.error('Could not sticky the score thread:', error);
    }
    return comment.id;
  } catch (error) {
    await release(stickyClaimKey(postId));
    throw error;
  }
};

// One post per day. Returns the existing post id when today's shift is already up.
// The claim makes the check-and-create atomic, so the scheduler, the install trigger and
// the moderator menu cannot create two posts for the same date.
export const ensureDailyPost = async (
  date: string = todayUtc()
): Promise<{ id: string; created: boolean }> => {
  const existing = await redis.get(postKey(date));
  if (existing) return { id: existing, created: false };
  if (!(await claim(postClaimKey(date)))) {
    throw new Error(`The post for ${date} is already being created`);
  }
  try {
    const post = await reddit.submitCustomPost({
      title: postTitle(date),
      entry: 'default',
      postData: { date },
    });
    await redis.set(postKey(date), post.id);
    try {
      await ensureScoreThread(post.id);
    } catch (error) {
      console.error('Could not create the score thread:', error);
    }
    return { id: post.id, created: true };
  } catch (error) {
    await release(postClaimKey(date));
    throw error;
  }
};
