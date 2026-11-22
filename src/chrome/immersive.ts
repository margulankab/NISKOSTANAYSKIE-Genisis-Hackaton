import { useSyncExternalStore } from 'react';
import { readSettings } from '../menus/settings';

/** What the entry transition shows: the player's own words, the world title and a few build lines. */
export interface Warp {
  id: number;
  words: string;
  title: string;
  lines: string[];
  /** Where the typed words were on screen, so they can travel from the text box into the world. */
  from: { left: number; top: number; width: number; height: number } | null;
}

let current: Warp | null = null;
let counter = 0;
const listeners = new Set<() => void>();
const notify = () => { for (const listener of listeners) listener(); };

export function subscribeToWarp(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export const currentWarp = () => current;
export function endWarp(id: number) {
  if (current?.id === id) { current = null; notify(); }
}

/**
 * Call from the click on "Enter world": the click is the gesture browsers require for full screen
 * and for sound. Full screen covers the whole page so menus, dialogs and the HUD stay visible in it.
 */
export function enterWorld({ words, title, lines, from }: Omit<Warp, 'id' | 'from'> & { from?: Element | null }) {
  const rect = from?.getBoundingClientRect();
  current = {
    id: ++counter, words: words.trim().slice(0, 280), title, lines,
    from: rect && rect.width > 0 ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null,
  };
  notify();
  setImmersive(true);
  // The world replaces the form under the transition; start it from the top of the page.
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (readSettings().fullscreen) requestFullscreen();
}

export function requestFullscreen() {
  const root = document.documentElement;
  if (!document.fullscreenEnabled || document.fullscreenElement || !root.requestFullscreen) return;
  root.requestFullscreen({ navigationUI: 'hide' }).then(() => {
    // Where supported (Chrome, Edge), keep Esc for the game menu; holding Esc still leaves full screen.
    const keyboard = (navigator as Navigator & { keyboard?: { lock?: (keys: string[]) => Promise<void> } }).keyboard;
    return keyboard?.lock?.(['Escape']);
  }).catch(() => { /* Declined: keep playing in the window. */ });
}

let chosenExit = false;
/** True once after the player left full screen with our own button (so the game need not pause). */
export function takeChosenExit() {
  const chosen = chosenExit;
  chosenExit = false;
  return chosen;
}

export function exitFullscreen() {
  if (document.fullscreenElement) {
    chosenExit = true;
    document.exitFullscreen().catch(() => { chosenExit = false; });
  }
}

export function toggleFullscreen() {
  if (document.fullscreenElement) exitFullscreen();
  else requestFullscreen();
}

/** Immersive layout: the 3D stage fills the screen and the page chrome steps back. */
export function setImmersive(on: boolean) {
  if (on) document.documentElement.dataset.immersive = 'on';
  else delete document.documentElement.dataset.immersive;
}

const fullscreenNow = () => Boolean(document.fullscreenElement);
function subscribeToFullscreen(listener: () => void) {
  document.addEventListener('fullscreenchange', listener);
  return () => document.removeEventListener('fullscreenchange', listener);
}
export function useFullscreen() {
  return useSyncExternalStore(subscribeToFullscreen, fullscreenNow, () => false);
}
export const canFullscreen = () => typeof document !== 'undefined' && Boolean(document.fullscreenEnabled);
