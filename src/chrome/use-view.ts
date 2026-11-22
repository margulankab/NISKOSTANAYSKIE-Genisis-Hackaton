import { useSyncExternalStore } from 'react';
import { readSettings, subscribeToSettings, writeSettings } from '../menus/settings';

const viewOf = () => readSettings().view;
const inkOf = () => readSettings().ink;

/** First- or third-person camera for walkable worlds. */
export function useView() {
  return useSyncExternalStore(subscribeToSettings, viewOf, () => 'first' as const);
}
export function toggleView() {
  const settings = readSettings();
  writeSettings({ ...settings, view: settings.view === 'first' ? 'third' : 'first' });
}
/** Whether the ink look (toon bands and outlines) is on. */
export function useInk() {
  return useSyncExternalStore(subscribeToSettings, inkOf, () => true);
}

const tuningOf = (() => {
  let last = '';
  let value = { sensitivity: 1, fov: 68, inkWeight: 'medium' as 'fine' | 'medium' | 'bold' };
  return () => {
    const { sensitivity, fov, inkWeight } = readSettings();
    const key = `${sensitivity}|${fov}|${inkWeight}`;
    if (key !== last) { last = key; value = { sensitivity, fov, inkWeight }; }
    return value;
  };
})();
/** Look speed, first-person lens and ink weight from Settings. */
export function useTuning() {
  return useSyncExternalStore(subscribeToSettings, tuningOf, tuningOf);
}
