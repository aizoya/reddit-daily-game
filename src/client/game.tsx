import './index.css';

import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { showToast } from '@devvit/web/client';
import { CityMap } from './components/CityMap';
import { Receipt } from './components/Receipt';
import { useShift } from './hooks/useShift';
import { fareColor } from './palette';
import type { Cell, Fare, Puzzle } from '../shared/onefare';
import {
  distance,
  evaluatePlan,
  fareLetter,
  generatePuzzle,
  puzzleNumber,
  shareLine,
  shortDate,
} from '../shared/onefare';

const fareCost = (from: Cell, fare: Fare): number =>
  distance(from, fare.pickup) + distance(fare.pickup, fare.dropoff);

const positionAfter = (puzzle: Puzzle, order: readonly number[]): Cell => {
  const lastId = order[order.length - 1];
  const last = puzzle.fares.find((fare) => fare.id === lastId);
  return last === undefined ? puzzle.start : last.dropoff;
};

const FuelGauge = ({ used, total }: { used: number; total: number }) => (
  <div
    className="flex h-3 gap-[2px]"
    role="meter"
    aria-label="Fuel left"
    aria-valuemin={0}
    aria-valuemax={total}
    aria-valuenow={total - used}
  >
    {Array.from({ length: total }, (_, index) => (
      <span
        key={index}
        className={`flex-1 rounded-[2px] ${index < total - used ? 'bg-cab' : 'bg-line'}`}
      />
    ))}
  </div>
);

type FareChipProps = {
  fare: Fare;
  step: number | undefined;
  cost: number;
  blocked: boolean;
  onPick: (id: number) => void;
};

const FareChip = ({ fare, step, cost, blocked, onPick }: FareChipProps) => {
  const picked = step !== undefined;
  return (
    <button
      type="button"
      onClick={() => onPick(fare.id)}
      aria-pressed={picked}
      aria-label={`Fare ${fareLetter(fare.id)}, pays $${fare.payout}, ${
        picked ? `stop ${step}` : `${cost} fuel`
      }`}
      className={`flex h-12 items-center gap-1.5 rounded-xl border px-1.5 text-left transition-opacity ${
        picked ? 'border-cab bg-block' : 'border-line bg-asphalt'
      } ${blocked ? 'opacity-40' : ''}`}
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-night"
        style={{ backgroundColor: fareColor(fare.id) }}
      >
        {fareLetter(fare.id)}
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="font-meter text-[15px] font-bold text-white">
          ${fare.payout}
        </span>
        <span className="text-[11px] whitespace-nowrap text-mute">
          {picked ? `stop ${step}` : `${cost} fuel`}
        </span>
      </span>
    </button>
  );
};

export const App = () => {
  const { date, shift, username, submitting, submit, postComment } =
    useShift();
  const puzzle = useMemo(() => generatePuzzle(date), [date]);
  const [order, setOrder] = useState<number[]>([]);
  const [showingBest, setShowingBest] = useState(false);

  const live = evaluatePlan(puzzle, order);
  const fuelLeft = puzzle.fuel - live.fuelUsed;
  const position = positionAfter(puzzle, order);
  const blocked = new Set(
    puzzle.fares
      .filter(
        (fare) =>
          !order.includes(fare.id) && fareCost(position, fare) > fuelLeft
      )
      .map((fare) => fare.id)
  );

  const pick = (id: number): void => {
    if (order.includes(id)) {
      // Dropping a stop can change what the later stops cost, so re-check the rest.
      const without = order.filter((other) => other !== id);
      setOrder(evaluatePlan(puzzle, without).completed);
      return;
    }
    if (blocked.has(id)) {
      showToast(`Not enough fuel left for fare ${fareLetter(id)}`);
      return;
    }
    setOrder([...order, id]);
  };

  const endShift = async (): Promise<void> => {
    const ok = await submit(order);
    if (!ok) showToast('Could not save your shift. Try again.');
  };

  const copyResult = async (): Promise<void> => {
    if (shift === null) return;
    const line = shareLine(
      puzzle.date,
      shift.result.earnings,
      puzzle.best.earnings,
      shift.result.fuelUsed,
      puzzle.fuel
    );
    try {
      await navigator.clipboard.writeText(line);
      showToast('Result copied. Paste it in the comments.');
    } catch {
      showToast(line);
    }
  };

  const header = (
    <header className="flex items-baseline justify-between">
      <h1 className="text-lg font-black tracking-tight text-cab uppercase">
        One Fare
      </h1>
      <p className="font-meter text-xs text-mute">
        #{puzzleNumber(puzzle.date)} · {shortDate(puzzle.date)}
      </p>
    </header>
  );

  if (shift !== null) {
    const shown = showingBest ? puzzle.best.completed : shift.result.completed;
    return (
      <main className="mx-auto flex h-full max-w-md flex-col gap-3 overflow-y-auto p-3">
        {header}
        <div className="mx-auto aspect-square w-full max-w-[min(100%,40vh)] shrink-0">
          <CityMap
            puzzle={puzzle}
            order={shown}
            drive
            label={showingBest ? 'The best route today' : 'Your route today'}
          />
        </div>
        <Receipt
          puzzle={puzzle}
          shift={shift}
          showingBest={showingBest}
          onToggleBest={() => setShowingBest((value) => !value)}
          onCopy={() => void copyResult()}
          username={username}
          onPost={async () => {
            const ok = await postComment();
            showToast(
              ok
                ? 'Posted to the comments.'
                : 'Could not post your comment. Try again.'
            );
          }}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex h-full max-w-md flex-col gap-2 p-3">
      {header}
      <p className="min-h-12 text-[13px] leading-4 text-mute">
        {order.length === 0
          ? 'Tap fares in the order you would drive them: circle is the pickup, square is the drop-off. A fare only pays if you have the fuel to finish it.'
          : `${order.length} ${order.length === 1 ? 'fare' : 'fares'} planned. Tap a fare again to drop it.`}
      </p>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="aspect-square h-full max-w-full">
          <CityMap
            puzzle={puzzle}
            order={order}
            blocked={blocked}
            onPick={pick}
            label="Today's city. Circles are pickups, squares are drop-offs."
          />
        </div>
      </div>
      <div className="flex items-end justify-between font-meter">
        <p className="text-[13px] text-mute">
          Fuel <span className="font-bold text-white">{fuelLeft}</span> of{' '}
          {puzzle.fuel}
        </p>
        <p className="text-[13px] text-mute">
          Earned <span className="text-lg font-bold text-cab">${live.earnings}</span>
        </p>
      </div>
      <FuelGauge used={live.fuelUsed} total={puzzle.fuel} />
      <div className="grid grid-cols-4 gap-2">
        {puzzle.fares.map((fare) => {
          const index = order.indexOf(fare.id);
          return (
            <FareChip
              key={fare.id}
              fare={fare}
              step={index >= 0 ? index + 1 : undefined}
              cost={fareCost(position, fare)}
              blocked={blocked.has(fare.id)}
              onPick={pick}
            />
          );
        })}
        <button
          type="button"
          onClick={() => setOrder([])}
          disabled={order.length === 0}
          className="h-12 rounded-xl border border-line text-sm font-semibold text-mute disabled:opacity-40"
        >
          Clear
        </button>
      </div>
      <button
        type="button"
        onClick={() => void endShift()}
        disabled={order.length === 0 || submitting}
        className="h-12 shrink-0 rounded-full bg-cab text-base font-extrabold text-ink active:bg-cab-deep disabled:opacity-40"
      >
        {submitting ? 'Clocking out…' : 'End shift'}
      </button>
    </main>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
