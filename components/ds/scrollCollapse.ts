// Antworten unten im Gespräch klappen beim Hochscrollen ein und kommen beim Herunterscrollen
// wieder (Entscheidung 38). Screen misst die Richtung, QuickReplies liest den Zustand.
import { createContext, useContext } from 'react';

export interface ScrollCollapse {
  /** Hochgescrollt: Antworten eingeklappt */
  collapsed: boolean;
  /** Antworten wieder zeigen und ans Ende des Gesprächs scrollen */
  expand: () => void;
}

export const ScrollCollapseContext = createContext<ScrollCollapse>({
  collapsed: false,
  expand: () => undefined,
});

export function useScrollCollapse(): ScrollCollapse {
  return useContext(ScrollCollapseContext);
}

/** Bewegung in px, ab der eine Richtung zählt. Kleines Zittern klappt nichts. */
export const SCROLL_STEP = 12;
/** So nah am Ende gilt man als unten: Dann sind die Antworten immer da. */
export const NEAR_END = 48;

/**
 * Neuer Zustand aus einer Scroll-Bewegung. Hoch (dy < 0), solange man nicht ganz unten ist,
 * klappt ein. Runter zeigt wieder, auch langsames Runterscrollen bis ans Ende. Ohne deutliche
 * Bewegung bleibt es, wie es ist: Klappt die Liste ein, wird der Inhalt höher, und der Browser
 * meldet ein Scrollen ohne Bewegung. Das darf sie nicht gleich wieder aufklappen.
 */
export function nextCollapsed(
  collapsed: boolean,
  move: { dy: number; fromEnd: number; canScroll: boolean },
): boolean {
  if (move.dy <= -SCROLL_STEP) return move.canScroll && move.fromEnd > NEAR_END ? true : collapsed;
  if (move.dy >= SCROLL_STEP) return false;
  if (move.dy > 0 && move.fromEnd <= NEAR_END) return false;
  return collapsed;
}
