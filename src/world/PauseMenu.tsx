import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { useT } from '../i18n/i18n';
import { QuickSettings } from '../menus/QuickSettings';
import { FullscreenButton } from '../chrome/ImmersiveControls';

export type SaveStatus = { status: 'idle' | 'saving' } | { status: 'saved' | 'error'; message: string };
export type MenuTab = 'game' | 'journal' | 'music' | 'settings';

/**
 * The game menu: a centered card over the paused world. Movement stops while it is open; Escape
 * resumes. "Game" holds resume, save and quit; Journal, Music and Settings are optional panels.
 */
export function PauseMenu({ save, confirmLeave, onResume, onSave, onSaveAndQuit, onMainMenu, onLeaveWithoutSaving, onCancelLeave,
  tab = 'game', onTab, panels = {}, title }: {
  save: SaveStatus;
  confirmLeave: boolean;
  onResume(): void;
  onSave(): void;
  onSaveAndQuit(): void;
  onMainMenu(): void;
  onLeaveWithoutSaving(): void;
  onCancelLeave(): void;
  tab?: MenuTab;
  onTab?: (tab: MenuTab) => void;
  panels?: { journal?: ReactNode; music?: ReactNode };
  /** The world's name, shown above the tabs. */
  title?: string;
}) {
  const headingId = useId();
  const first = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const busy = save.status === 'saving';
  const t = useT();
  const tabs: [MenuTab, string, string][] = [
    ['game', t('Game'), '▶'],
    ...(panels.journal ? [['journal', t('Journal'), '✦'] as [MenuTab, string, string]] : []),
    ...(panels.music ? [['music', t('Music'), '♫'] as [MenuTab, string, string]] : []),
    ['settings', t('Settings'), '⚙'],
  ];
  const current = tabs.some(([id]) => id === tab) ? tab : 'game';

  useEffect(() => { if (current === 'game' || confirmLeave) first.current?.focus(); }, [confirmLeave, current]);

  // Keep Tab inside the dialog.
  function trap(event: React.KeyboardEvent) {
    if (event.key !== 'Tab' || !dialog.current) return;
    const focusable = [...dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], summary')];
    if (focusable.length === 0) return;
    const [start, end] = [focusable[0], focusable[focusable.length - 1]];
    if (event.shiftKey && document.activeElement === start) { event.preventDefault(); end.focus(); }
    else if (!event.shiftKey && document.activeElement === end) { event.preventDefault(); start.focus(); }
  }

  return (
    <div className="pause-backdrop">
      <div className={`pause-menu game-menu${confirmLeave ? ' is-confirm' : ''}`} role="dialog" aria-modal="true" aria-labelledby={headingId}
        ref={dialog} onKeyDown={trap}>
        {confirmLeave ? (
          <div className="game-menu-body">
            <h3 id={headingId}>{t('Leave without saving?')}</h3>
            <p>{t('Your latest progress in this world has not been saved.')}</p>
            <div className="game-menu-actions">
              <button type="button" ref={first} disabled={busy} onClick={onSaveAndQuit}>{t('Save and leave')}</button>
              <button type="button" disabled={busy} onClick={onLeaveWithoutSaving}>{t('Leave without saving')}</button>
              <button type="button" disabled={busy} onClick={onCancelLeave}>{t('Keep playing')}</button>
            </div>
          </div>
        ) : (
          <>
            <header className="game-menu-head">
              {title && <p className="game-menu-world">{title}</p>}
              <h3 id={headingId}>{t('Paused')}</h3>
            </header>
            <div className="game-menu-tabs" role="tablist" aria-label={t('Menu')}>
              {tabs.map(([id, name, icon]) => (
                <button key={id} type="button" role="tab" aria-selected={current === id} className="game-menu-tab"
                  onClick={() => onTab?.(id)} disabled={!onTab && id !== 'game'}>
                  <span aria-hidden="true">{icon}</span>{name}
                </button>
              ))}
            </div>
            <div className="game-menu-body" role="tabpanel" key={current}>
              {current === 'game' && (
                <div className="game-menu-actions">
                  <button type="button" ref={first} disabled={busy} onClick={onResume}>{t('Resume')}</button>
                  <button type="button" disabled={busy} onClick={onSave}>{t('Save Game')}</button>
                  <button type="button" disabled={busy} onClick={onSaveAndQuit}>{t('Save & Quit')}</button>
                  <button type="button" disabled={busy} onClick={onMainMenu}>{t('Return to Main Menu')}</button>
                  <FullscreenButton />
                </div>
              )}
              {current === 'journal' && panels.journal}
              {current === 'music' && panels.music}
              {current === 'settings' && <QuickSettings />}
            </div>
          </>
        )}
        {busy && <p role="status">{t('Saving…')}</p>}
        {!confirmLeave && save.status === 'idle' && <p className="pause-hint">{t('Press Esc to resume')}</p>}
        {save.status === 'saved' && <p role="status">{save.message}</p>}
        {save.status === 'error' && <p role="alert">{save.message}</p>}
      </div>
    </div>
  );
}
