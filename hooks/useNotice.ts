// Kurzer Hinweis, der von selbst verschwindet, wie nach einer Ablehnung in useCommand.
import { useEffect, useRef, useState } from 'react';

import { TOAST_MS } from './useCommand';

export interface Notice {
  /** Der Hinweis für <Toast>, sonst undefined */
  notice?: string;
  show: (text: string) => void;
}

export function useNotice(ms: number = TOAST_MS): Notice {
  const [notice, setNotice] = useState<string>();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = (text: string) => {
    clearTimeout(timer.current);
    setNotice(text);
    timer.current = setTimeout(() => setNotice(undefined), ms);
  };
  return { notice, show };
}
