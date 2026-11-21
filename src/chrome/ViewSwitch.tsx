import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { atmospheres, readSettings, subscribeToSettings, writeSettings } from '../menus/settings';
import type { Settings } from '../menus/settings';
import { languages, useLang, useT } from '../i18n/i18n';
import type { Lang } from '../i18n/i18n';

const themeOf = () => readSettings().theme;
const pixelOf = () => readSettings().pixel;

/** Masthead control: interface language, atmosphere and the pixel filter. */
export function ViewSwitch() {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const theme = useSyncExternalStore(subscribeToSettings, themeOf);
  const pixel = useSyncExternalStore(subscribeToSettings, pixelOf);
  const lang = useLang();
  const t = useT();
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', close); };
  }, [open]);
  const set = (patch: Partial<Settings>) => writeSettings({ ...readSettings(), ...patch });
  return (
    <div className="view-switch" ref={box}>
      <div className="lang-switch" role="group" aria-label={t('Language')}>
        {(Object.keys(languages) as Lang[]).map(code => (
          <button key={code} type="button" lang={code} aria-pressed={lang === code} title={languages[code]}
            aria-label={languages[code]} onClick={() => set({ lang: code })}>{code.toUpperCase()}</button>
        ))}
      </div>
      <button type="button" className="view-button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
        {t('◐ View')}
      </button>
      <div className="view-panel" id={panelId} role="group" aria-label={t('Interface atmosphere')} hidden={!open}>
        <button type="button" aria-pressed={theme === 'auto'} onClick={() => set({ theme: 'auto' })}>
          <span className="swatch swatch-auto" />{t('Auto')}<small>{t('Follows the world you are in')}</small>
        </button>
        {Object.entries(atmospheres).map(([id, { name, note }]) => (
          <button key={id} type="button" aria-pressed={theme === id} onClick={() => set({ theme: id as Settings['theme'] })}>
            <span className={`swatch swatch-${id}`} />{t(name)}<small>{t(note)}</small>
          </button>
        ))}
        <label><input type="checkbox" checked={pixel} onChange={event => set({ pixel: event.target.checked })} /> {t('Pixel filter on 3D worlds')}</label>
      </div>
    </div>
  );
}
