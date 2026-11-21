import { useEffect, useRef, useState } from 'react';
import type { GameState } from './checkpoint';
import type { SaveStatus } from './PauseMenu';

const snapshot = ({ position, revealed, ended, storyStep }: GameState, selection: string) =>
  JSON.stringify([position.x, position.z, [...revealed].sort(), ended, storyStep, selection]);

function reasonOf(error: unknown) {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') return 'this browser is out of storage space';
  return error instanceof Error && error.message ? error.message : 'storage is unavailable';
}

const mainMenu = () => window.location.assign('/');

export function useGamePause({
  initial, selection = '', progress, persist, leave = mainMenu,
}: {
  initial?: GameState | null;
  selection?: string;
  progress(): GameState;
  persist?: (state: GameState) => Promise<void>;
  leave?: () => void;
}) {
  const [paused, setPaused] = useState(false);
  const [save, setSave] = useState<SaveStatus>({ status: 'idle' });
  const [confirmLeave, setConfirmLeave] = useState(false);
  const lastSaved = useRef(initial ? snapshot(initial, selection) : null);
  const pauseButton = useRef<HTMLButtonElement>(null);
  const saving = useRef(false);

  function resume() {
    if (saving.current) return;
    setPaused(false);
    setConfirmLeave(false);
    setSave({ status: 'idle' });
    requestAnimationFrame(() => pauseButton.current?.focus());
  }

  async function saveGame() {
    if (saving.current || !persist) return false;
    const state = progress();
    saving.current = true;
    setSave({ status: 'saving' });
    try {
      await persist(state);
      lastSaved.current = snapshot(state, selection);
      setSave({ status: 'saved', message: 'Game saved in this browser.' });
      return true;
    } catch (error) {
      setSave({ status: 'error', message: `The game could not be saved because ${reasonOf(error)}. Your world is still open, so you can try again.` });
      return false;
    } finally {
      saving.current = false;
    }
  }

  useEffect(() => {
    if (!persist) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return;
      if (event.target instanceof HTMLElement && (event.target.isContentEditable
        || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName))) return;
      event.preventDefault();
      if (saving.current) return;
      if (!paused) setPaused(true);
      else if (confirmLeave) setConfirmLeave(false);
      else resume();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return {
    paused, pauseButton, open: () => setPaused(true),
    menu: {
      save, confirmLeave, onResume: resume,
      onSave: () => void saveGame(),
      onSaveAndQuit: () => void saveGame().then((ok) => { if (ok) leave(); }),
      onMainMenu: () => {
        if (lastSaved.current === snapshot(progress(), selection)) leave();
        else setConfirmLeave(true);
      },
      onLeaveWithoutSaving: leave,
      onCancelLeave: () => setConfirmLeave(false),
    },
  };
}
