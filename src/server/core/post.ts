import { reddit, redis } from '@devvit/web/server';
import {
  puzzleNumber,
  shortDate,
  themeFor,
  todayUtc,
} from '../../shared/onefare';

const postTitle = (date: string): string => {
  const theme = themeFor(date);
  const lead = theme.name ? `${theme.name}. ` : '';
  return `One Fare #${puzzleNumber(date)} (${shortDate(date)}): ${lead}${theme.blurb} Best shift wins.`;
};

const postKey = (date: string): string => `post:${date}`;

// One post per day. Returns the existing post id when today's shift is already up.
export const ensureDailyPost = async (
  date: string = todayUtc()
): Promise<{ id: string; created: boolean }> => {
  const existing = await redis.get(postKey(date));
  if (existing) return { id: existing, created: false };

  const post = await reddit.submitCustomPost({
    title: postTitle(date),
    entry: 'default',
    postData: { date },
  });
  await redis.set(postKey(date), post.id);
  return { id: post.id, created: true };
};
