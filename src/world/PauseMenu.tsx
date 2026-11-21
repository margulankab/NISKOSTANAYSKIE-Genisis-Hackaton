import { useEffect, useId, useRef } from 'react';
import { useT } from '../i18n/i18n';

export type SaveStatus = { status: 'idle' | 'saving' } | { status: 'saved' | 'error'; message: string };

/** Modal pause menu. Movement stops while it is open; Escape resumes. */
export function PauseMenu({ save, confirmLeave, onResume, onSave, onSaveAndQuit, onMainMenu, onLeaveWithoutSaving, onCancelLeave }: {
  save: SaveStatus;
  confirmLeave: boolean;
  onResume(): void;
  onSave(): void;
  onSaveAndQuit(): void;
  onMainMenu(): void;
  onLeaveWithoutSaving(): void;
  onCancelLeave(): void;
}) {
  const headingId = useId();
  const first = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const busy = save.status === 'saving';
  const t = useT();

  useEffect(() => { first.current?.focus(); }, [confirmLeave]);

  // Keep Tab inside the dialog.
  function trap(event: React.KeyboardEvent) {
    if (event.key !== 'Tab' || !dialog.current) return;
    const buttons = [...dialog.current.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    if (buttons.length === 0) return;
    const [start, end] = [buttons[0], buttons[buttons.length - 1]];
    if (event.shiftKey && document.activeElement === start) { event.preventDefault(); end.focus(); }
    else if (!event.shiftKey && document.activeElement === end) { event.preventDefault(); start.focus(); }
  }

  return (
    <div className="pause-backdrop">
      <div className="pause-menu" role="dialog" aria-modal="true" aria-labelledby={headingId} ref={dialog} onKeyDown={trap}>
        {confirmLeave ? (
          <>
            <h3 id={headingId}>{t('Leave without saving?')}</h3>
            <p>{t('Your latest progress in this world has not been saved.')}</p>
            <button type="button" ref={first} disabled={busy} onClick={onSaveAndQuit}>{t('Save and leave')}</button>
            <button type="button" disabled={busy} onClick={onLeaveWithoutSaving}>{t('Leave without saving')}</button>
            <button type="button" disabled={busy} onClick={onCancelLeave}>{t('Keep playing')}</button>
          </>
        ) : (
          <>
            <h3 id={headingId}>{t('Paused')}</h3>
            <button type="button" ref={first} disabled={busy} onClick={onResume}>{t('Resume')}</button>
            <button type="button" disabled={busy} onClick={onSave}>{t('Save Game')}</button>
            <button type="button" disabled={busy} onClick={onSaveAndQuit}>{t('Save & Quit')}</button>
            <button type="button" disabled={busy} onClick={onMainMenu}>{t('Return to Main Menu')}</button>
          </>
        )}
        {busy && <p role="status">{t('Saving…')}</p>}
        {save.status === 'saved' && <p role="status">{save.message}</p>}
        {save.status === 'error' && <p role="alert">{save.message}</p>}
      </div>
    </div>
  );
}
