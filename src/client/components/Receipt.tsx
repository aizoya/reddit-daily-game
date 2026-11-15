import { useEffect, useState } from 'react';
import type { SavedShift } from '../../shared/api';
import type { Puzzle } from '../../shared/onefare';
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
}: ReceiptProps) => {
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
          <span>One Fare #{puzzleNumber(puzzle.date)}</span>
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
      <div className="mt-3 flex gap-2 font-sans">
        <button
          type="button"
          onClick={onToggleBest}
          aria-pressed={showingBest}
          className="h-11 flex-1 rounded-full border border-line bg-asphalt text-sm font-semibold text-white active:bg-block"
        >
          {showingBest ? 'Show my route' : 'Show best route'}
        </button>
        <button
          type="button"
          onClick={onCopy}
          className="h-11 flex-1 rounded-full bg-cab text-sm font-bold text-ink active:bg-cab-deep"
        >
          Copy result
        </button>
      </div>
      <p className="mt-2 text-center font-sans text-xs text-mute">
        Think there was a better line? Argue your route in the comments.{' '}
        {nextCity}
      </p>
    </section>
  );
};
