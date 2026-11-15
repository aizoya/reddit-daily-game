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
      <div className="aspect-square w-[44%] max-w-56 shrink-0">
        <CityMap puzzle={puzzle} order={[]} label="Today's city" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="font-meter text-xs whitespace-nowrap text-mute">
          #{puzzleNumber(date)} · {shortDate(date)}
        </p>
        <h1 className="text-2xl leading-none font-black tracking-tight whitespace-nowrap text-cab uppercase sm:text-3xl">
          One Fare
        </h1>
        <p className="text-[13px] leading-[18px] text-white sm:text-sm sm:leading-5">
          Seven fares. One tank. Plan the shift that earns the most.
        </p>
        <button
          type="button"
          className="mt-1 h-11 self-start rounded-full bg-cab px-5 text-base font-extrabold whitespace-nowrap text-ink active:bg-cab-deep"
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
