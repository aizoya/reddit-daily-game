import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CityMap } from './components/CityMap';
import { useShift } from './hooks/useShift';
import {
  RATING_LABEL,
  rate,
  dateFromPostData,
  generatePuzzle,
  puzzleNumber,
  shortDate,
  todayUtc,
} from '../shared/onefare';

export const Splash = () => {
  const date = dateFromPostData(context.postData) ?? todayUtc();
  const puzzle = generatePuzzle(date);
  // The card works from the date alone; the saved shift and player count arrive a moment later.
  const { shift, players } = useShift();
  const done = shift !== null;
  let line = `${puzzle.theme.blurb} Plan the shift that earns the most.`;
  if (done) {
    const { earnings } = shift.result;
    line = `${RATING_LABEL[rate(earnings, puzzle.best.earnings)]}: you earned $${earnings} of $${puzzle.best.earnings}.`;
    if (shift.streak.current > 1) {
      line += ` Streak: ${shift.streak.current} days.`;
    }
  } else if (players > 1) {
    line += ` ${players} drivers have clocked out today.`;
  }
  return (
    <main className="flex h-full items-center justify-center gap-4 p-4 portrait:flex-col portrait:gap-5">
      <div className="aspect-square w-[44%] max-w-56 shrink-0 portrait:w-[78%] portrait:max-w-80">
        <CityMap
          puzzle={puzzle}
          order={done ? shift.result.completed : []}
          label={done ? 'Your route today' : "Today's city"}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 portrait:flex-none portrait:items-center portrait:text-center">
        <p className="font-meter text-xs whitespace-nowrap text-mute">
          #{puzzleNumber(date)} · {shortDate(date)}
        </p>
        <h1 className="text-2xl leading-none font-black tracking-tight whitespace-nowrap text-cab uppercase sm:text-3xl">
          One Fare
        </h1>
        {puzzle.theme.name ? (
          <p className="text-sm leading-none font-bold text-white">
            {puzzle.theme.name}
          </p>
        ) : null}
        <p className="text-[13px] leading-[18px] text-white sm:text-sm sm:leading-5">
          {line}
        </p>
        <button
          type="button"
          className="mt-1 h-11 self-start rounded-full bg-cab px-5 text-base font-extrabold whitespace-nowrap text-ink active:bg-cab-deep portrait:h-12 portrait:self-center portrait:px-8"
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
        >
          {done ? 'See your receipt' : 'Start shift'}
        </button>
      </div>
    </main>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
