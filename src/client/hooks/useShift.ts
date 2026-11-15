import { useCallback, useEffect, useState } from 'react';
import { context } from '@devvit/web/client';
import type {
  InitResponse,
  SavedShift,
  SubmitRequest,
  SubmitResponse,
} from '../../shared/api';
import { dateFromPostData, todayUtc } from '../../shared/onefare';

type ShiftState = {
  date: string;
  // 'loading' only blocks the result, never the board: the puzzle is built from the date alone.
  status: 'loading' | 'ready' | 'offline';
  username: string | null;
  subreddit: string | null;
  joined: boolean;
  userActions: boolean;
  players: number;
  shift: SavedShift | null;
  submitting: boolean;
};

const isInit = (value: unknown): value is InitResponse =>
  typeof value === 'object' &&
  value !== null &&
  Reflect.get(value, 'type') === 'init';

const isSubmit = (value: unknown): value is SubmitResponse =>
  typeof value === 'object' &&
  value !== null &&
  Reflect.get(value, 'type') === 'submit';

export const useShift = () => {
  const [state, setState] = useState<ShiftState>(() => ({
    date: dateFromPostData(context.postData) ?? todayUtc(),
    status: 'loading',
    username: null,
    subreddit: null,
    joined: false,
    userActions: false,
    players: 0,
    shift: null,
    submitting: false,
  }));

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const res = await fetch('/api/init');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: unknown = await res.json();
        if (!isInit(data)) throw new Error('Unexpected response');
        if (!active) return;
        setState((prev) => ({
          ...prev,
          date: data.date,
          status: 'ready',
          username: data.username,
          subreddit: data.subreddit,
          joined: data.joined,
          userActions: data.userActions,
          players: Math.max(prev.players, data.players),
          // A slow first load must never wipe a shift the player has just finished.
          shift: prev.shift ?? data.shift,
        }));
      } catch (err) {
        console.error('Failed to load shift', err);
        if (active) setState((prev) => ({ ...prev, status: 'offline' }));
      }
    };
    void init();
    return () => {
      active = false;
    };
  }, []);

  const submit = useCallback(async (order: number[]): Promise<boolean> => {
    setState((prev) => ({ ...prev, submitting: true }));
    try {
      const body: SubmitRequest = { order };
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json();
      if (!isSubmit(data)) throw new Error('Unexpected response');
      setState((prev) => ({
        ...prev,
        submitting: false,
        shift: data.shift,
        players: data.shift.stats.players,
      }));
      return true;
    } catch (err) {
      console.error('Failed to submit shift', err);
      setState((prev) => ({ ...prev, submitting: false }));
      return false;
    }
  }, []);

  // Posting is a separate, explicit choice: this only runs from the confirm button.
  const postComment = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState((prev) =>
        prev.shift === null
          ? prev
          : { ...prev, shift: { ...prev.shift, commented: true } }
      );
      return true;
    } catch (err) {
      console.error('Failed to post comment', err);
      return false;
    }
  }, []);

  // Joining is its own explicit choice, separate from playing and from posting.
  const join = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState((prev) => ({ ...prev, joined: true }));
      return true;
    } catch (err) {
      console.error('Failed to join', err);
      return false;
    }
  }, []);

  return { ...state, submit, postComment, join };
};
