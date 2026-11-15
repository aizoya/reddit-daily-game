import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CityMap } from './components/CityMap';
import {
  dateFromPostData,
  generatePuzzle,
  puzzleNumber,
  shortDate,
  todayUtc,
} from '../shared/onefare';

export const Splash = () => {
  const date = dateFromPostData(context.postData) ?? todayUtc();
  const puzzle = generatePuzzle(date);
  return (
    <main className="flex h-full items-center justify-center gap-4 p-4">
      <div className="aspect-square h-full max-h-56 shrink-0">
        <CityMap puzzle={puzzle} order={[]} label="Today's city" />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="font-meter text-xs text-mute">
          #{puzzleNumber(date)} · {shortDate(date)}
        </p>
        <h1 className="text-3xl leading-none font-black tracking-tight text-cab uppercase">
          One Fare
        </h1>
        <p className="text-sm leading-5 text-white">
          Seven fares. One tank of fuel. Plan the shift that earns the most.
        </p>
        <button
          type="button"
          className="mt-1 h-11 self-start rounded-full bg-cab px-6 text-base font-extrabold text-ink active:bg-cab-deep"
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
        >
          Start shift
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
