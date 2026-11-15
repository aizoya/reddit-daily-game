import { reddit, redis } from '@devvit/web/server';
import { puzzleNumber, shortDate, todayUtc } from '../../shared/onefare';

const postKey = (date: string): string => `post:${date}`;

// One post per day. Returns the existing post id when today's shift is already up.
export const ensureDailyPost = async (
  date: string = todayUtc()
): Promise<{ id: string; created: boolean }> => {
  const existing = await redis.get(postKey(date));
  if (existing) return { id: existing, created: false };

  const post = await reddit.submitCustomPost({
    title: `One Fare #${puzzleNumber(date)} (${shortDate(date)}): seven fares, one tank. Best shift wins.`,
    entry: 'default',
    postData: { date },
  });
  await redis.set(postKey(date), post.id);
  return { id: post.id, created: true };
};
