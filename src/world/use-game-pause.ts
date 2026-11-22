import { navigate } from '../chrome/route';
import { useEffect, useRef, useState } from 'react';
import type { GameState } from './checkpoint';
import type { SaveStatus } from './PauseMenu';

const snapshot = ({ position, revealed, ended, storyStep, momentsCompleted }: GameState, selection: string) =>
  JSON.stringify([position.x, position.z, [...revealed].sort(), ended, storyStep, momentsCompleted, selection]);

function reasonOf(error: unknown) {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') return 'this browser is out of storage space';
  return error instanceof Error && error.message ? error.message : 'storage is unavailable';
}

const mainMenu = () => navigate('/');

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
  const destination = useRef<string | null>(null);

  function leaveVisit() {
    if (destination.current) navigate(destination.current);
    else leave();
  }

  function resume() {
    if (saving.current) return;
    setPaused(false);
    setConfirmLeave(false);
    setSave({ status: 'idle' });
    destination.current = null;
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
    const onLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!link || link.download || link.target === '_blank' || link.origin !== window.location.origin ||
        (link.pathname === window.location.pathname && link.search === window.location.search && link.hash && !link.dataset.route)) return;
      if (!saving.current && lastSaved.current === snapshot(progress(), selection)) return;
      event.preventDefault();
      if (saving.current) return;
      destination.current = link.dataset.route ?? link.href;
      setPaused(true);
      setConfirmLeave(true);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return;
      if (event.target instanceof HTMLElement && (event.target.isContentEditable
        || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName))) return;
      event.preventDefault();
      if (saving.current) return;
      if (!paused) setPaused(true);
      else if (confirmLeave) { destination.current = null; setConfirmLeave(false); }
      else resume();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('click', onLink);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onLink);
    };
  });

  return {
    paused, pauseButton, open: () => setPaused(true),
    menu: {
      save, confirmLeave, onResume: resume,
      onSave: () => void saveGame(),
      onSaveAndQuit: () => void saveGame().then((ok) => { if (ok) leaveVisit(); }),
      onMainMenu: () => {
        destination.current = null;
        if (lastSaved.current === snapshot(progress(), selection)) leave();
        else setConfirmLeave(true);
      },
      onLeaveWithoutSaving: leaveVisit,
      onCancelLeave: () => { destination.current = null; setConfirmLeave(false); },
    },
  };
}
