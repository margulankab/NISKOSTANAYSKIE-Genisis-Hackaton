import { useSyncExternalStore } from 'react';
import type { SongLink } from './song';
import type { Embed } from './embed';

/** The music-app mini player: what is loaded, and whether its card is expanded. One per page. */
export interface NowPlaying { link: SongLink; embed: Embed; label: string }
let playing: NowPlaying | null = null;
let picker = false;
const listeners = new Set<() => void>();
const notify = () => { for (const listener of listeners) listener(); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export function playInMiniPlayer(next: NowPlaying) { playing = next; picker = false; notify(); }
export function closeMiniPlayer() { playing = null; notify(); }
export function openMusicPicker(open = true) { picker = open; notify(); }

export function useNowPlaying() { return useSyncExternalStore(subscribe, () => playing, () => null); }
export function usePickerOpen() { return useSyncExternalStore(subscribe, () => picker, () => false); }
