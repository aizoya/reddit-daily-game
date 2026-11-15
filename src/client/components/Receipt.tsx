import { useEffect, useState } from 'react';
import type { SavedShift } from '../../shared/api';
import type { Puzzle } from '../../shared/onefare';
import { SPREAD_LABELS, spreadBand } from '../../shared/stats';
import {
  RATING_LABEL,
  fareLetter,
  formatCountdown,
  minutesToNextCity,
  puzzleNumber,
  rate,
  shortDate,
  todayUtc,
} from '../../shared/onefare';

// How today's drivers are spread across the earnings bands, with the player's band inked in.
const CrowdChart = ({ spread, mine }: { spread: number[]; mine: number }) => {
  const tallest = Math.max(1, ...spread);
  return (
    <div
      className="mt-3 mb-2 flex items-end justify-center gap-2"
      role="img"
      aria-label={`How drivers did today: ${spread
        .map((count, index) => `${SPREAD_LABELS[index] ?? ''} ${count}`)
        .join(', ')}`}
    >
      {spread.map((count, index) => (
        <div key={index} className="flex w-11 flex-col items-center gap-1">
          <span className="text-[10px] leading-none opacity-70">{count}</span>
          <span
            className={`w-full rounded-t-sm ${index === mine ? 'bg-ink' : 'bg-ink/25'}`}
            style={{ height: `${4 + Math.round((count / tallest) * 34)}px` }}
          />
          <span
            className={`text-[10px] leading-none ${index === mine ? 'font-bold' : 'opacity-70'}`}
          >
            {index === mine ? 'You' : SPREAD_LABELS[index]}
          </span>
        </div>
      ))}
    </div>
  );
};

// Re-reads the clock once a minute so the countdown stays honest without a busy timer.
const useNextCity = (date: string): string => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  return date === todayUtc(now)
    ? `New city in ${formatCountdown(minutesToNextCity(now))}.`
    : 'A newer city is waiting in the latest post.';
};

type ReceiptProps = {
  puzzle: Puzzle;
  shift: SavedShift;
  showingBest: boolean;
  onToggleBest: () => void;
  onCopy: () => void;
  username: string | null;
  onPost: () => Promise<void>;
  subreddit: string | null;
  joined: boolean;
  onJoin: () => Promise<void>;
  // False until Reddit approves the app (except for the owner): then only Copy is offered.
  userActions: boolean;
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline gap-2">
    <span>{label}</span>
    <span className="flex-1 translate-y-[-3px] border-b border-dotted border-ink/40" />
    <span className="tabular-nums">{value}</span>
  </div>
);

export const Receipt = ({
  puzzle,
  shift,
  showingBest,
  onToggleBest,
  onCopy,
  username,
  onPost,
  subreddit,
  joined,
  onJoin,
  userActions,
}: ReceiptProps) => {
  const canAct = shift.saved && userActions;
  const [joining, setJoining] = useState(false);
  const confirmJoin = async (): Promise<void> => {
    setJoining(true);
    await onJoin();
    setJoining(false);
  };
  const [confirming, setConfirming] = useState(false);
  const [posting, setPosting] = useState(false);
  const confirmPost = async (): Promise<void> => {
    setPosting(true);
    await onPost();
    setPosting(false);
    setConfirming(false);
  };
  const { result, stats, streak } = shift;
  const best = puzzle.best.earnings;
  const rating = rate(result.earnings, best);
  const left = best - result.earnings;
  const nextCity = useNextCity(puzzle.date);
  const fares = result.completed.flatMap((id) => {
    const fare = puzzle.fares.find((candidate) => candidate.id === id);
    return fare === undefined ? [] : [fare];
  });

  let crowd = 'First driver on the road today.';
  if (stats.players > 1) {
    crowd =
      rating === 'perfect'
        ? `${stats.perfect}% of ${stats.players} drivers found the best shift.`
        : `You out-earned ${stats.beat}% of ${stats.players} drivers.`;
  }

  return (
    <section
      className="receipt-in mx-auto w-full max-w-sm font-meter text-ink"
      aria-label="Shift receipt"
    >
      <div className="rounded-t-md bg-paper px-4 pt-3 pb-2 text-[13px] leading-6">
        <div className="flex justify-between text-[11px] tracking-widest uppercase opacity-70">
          <span>
            One Fare #{puzzleNumber(puzzle.date)}
            {puzzle.theme.name ? ` · ${puzzle.theme.name}` : ''}
          </span>
          <span>{shortDate(puzzle.date)}</span>
        </div>
        <h2 className="mt-1 text-center text-xl font-bold tracking-tight">
          {RATING_LABEL[rating]}
        </h2>
        <div className="mt-2 border-t border-dashed border-ink/50 pt-2">
          {fares.length === 0 ? (
            <p className="text-center opacity-70">No fares completed.</p>
          ) : (
            fares.map((fare) => (
              <Row
                key={fare.id}
                label={`Fare ${fareLetter(fare.id)}`}
                value={`$${fare.payout}`}
              />
            ))
          )}
        </div>
        <div className="mt-2 border-t border-dashed border-ink/50 pt-2 font-bold">
          <Row label="You earned" value={`$${result.earnings}`} />
          <Row label="Best possible" value={`$${best}`} />
        </div>
        <Row label="Fuel used" value={`${result.fuelUsed} of ${puzzle.fuel}`} />
        <p className="mt-2 text-center text-[12px] leading-5">
          {left > 0 ? `$${left} left on the street. ` : ''}
          {crowd}
        </p>
        {stats.players >= 3 ? (
          <CrowdChart spread={stats.spread} mine={spreadBand(result.earnings, best)} />
        ) : null}
        {shift.saved && streak.current > 0 ? (
          <p className="text-center text-[12px] leading-5">
            Streak: {streak.current} {streak.current === 1 ? 'day' : 'days'}
            {streak.best > streak.current ? ` (best ${streak.best})` : ''}
          </p>
        ) : null}
        {!shift.saved ? (
          <p className="text-center text-[12px] leading-5 opacity-70">
            Log in to save your shift and keep a streak.
          </p>
        ) : null}
      </div>
      <div className="receipt-edge" />
      {confirming ? (
        <div className="mt-3 rounded-2xl border border-line bg-asphalt p-3 font-sans">
          <p className="text-[13px] leading-5 text-white">
            This posts a public comment from your Reddit account
            {username ? ` (u/${username})` : ''}, as a reply in this post’s
            score thread. It shows your username and score, with your route
            hidden behind a spoiler tag. You can delete it on Reddit any time.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={posting}
              className="h-11 flex-1 rounded-full border border-line text-sm font-semibold text-white disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmPost()}
              disabled={posting}
              className="h-11 flex-1 rounded-full bg-cab text-sm font-bold text-ink active:bg-cab-deep disabled:opacity-40"
            >
              {posting ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-2 font-sans">
          <button
            type="button"
            onClick={onToggleBest}
            aria-pressed={showingBest}
            className="h-11 flex-1 rounded-full border border-line bg-asphalt text-sm font-semibold text-white active:bg-block"
          >
            {showingBest ? 'Show my route' : 'Show best route'}
          </button>
          {canAct ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={shift.commented}
              className="h-11 flex-1 rounded-full bg-cab text-sm font-bold text-ink active:bg-cab-deep disabled:opacity-50"
            >
              {shift.commented ? 'Result posted' : 'Post my result'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onCopy}
              className="h-11 flex-1 rounded-full bg-cab text-sm font-bold text-ink active:bg-cab-deep"
            >
              Copy result
            </button>
          )}
        </div>
      )}
      <p className="mt-2 text-center font-sans text-xs text-mute">
        Think there was a better line? Argue your route in the comments.{' '}
        {nextCity}
      </p>
      {canAct && !confirming && !joined ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-line bg-asphalt p-3 font-sans">
          <p className="min-w-0 flex-1 text-[12px] leading-4 text-mute">
            Want tomorrow’s city in your feed? This joins{' '}
            {subreddit ? `r/${subreddit}` : 'this community'} from your
            account.
          </p>
          <button
            type="button"
            onClick={() => void confirmJoin()}
            disabled={joining}
            className="h-10 shrink-0 rounded-full border border-cab px-4 text-sm font-bold text-cab disabled:opacity-40"
          >
            {joining ? 'Joining…' : 'Join'}
          </button>
        </div>
      ) : null}
      {canAct && !confirming ? (
        <button
          type="button"
          onClick={onCopy}
          className="mx-auto mt-1 block h-9 px-3 font-sans text-xs font-semibold text-mute underline underline-offset-2"
        >
          Copy result instead
        </button>
      ) : null}
    </section>
  );
};
