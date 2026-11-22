import { useEffect, useState } from 'react';
import { languages, useT } from '../i18n/i18n';
import type { Lang } from '../i18n/i18n';
import { readSettings, subscribeToSettings, writeSettings } from './settings';
import type { Settings } from './settings';

/** The settings that matter mid-game, inside the game menu. Changes apply at once. */
export function QuickSettings() {
  const t = useT();
  const [settings, setSettings] = useState(readSettings);
  useEffect(() => subscribeToSettings(() => setSettings(readSettings())), []);
  const set = (patch: Partial<Settings>) => writeSettings({ ...readSettings(), ...patch });
  return (
    <div className="quick-settings">
      <div className="quick-row" role="group" aria-label={t('Camera')}>
        <span className="quick-label">{t('Camera')}</span>
        <div className="segmented">
          {(['first', 'third'] as const).map((view) => (
            <button key={view} type="button" aria-pressed={settings.view === view} onClick={() => set({ view })}>
              {t(view === 'first' ? 'First person' : 'Third person')}
            </button>
          ))}
        </div>
      </div>
      <label className="quick-row">
        <span className="quick-label">{t('Field of view: {value}°', { value: settings.fov })}</span>
        <input type="range" min={55} max={95} step={1} value={settings.fov} onChange={(event) => set({ fov: Number(event.target.value) })} />
      </label>
      <label className="quick-row">
        <span className="quick-label">{t('Look sensitivity: {value}×', { value: settings.sensitivity.toFixed(1) })}</span>
        <input type="range" min={0.4} max={2.5} step={0.1} value={settings.sensitivity} onChange={(event) => set({ sensitivity: Number(event.target.value) })} />
      </label>
      <label className="quick-row">
        <span className="quick-label">{t('Soundtrack volume: {value}%', { value: Math.round(settings.volume * 100) })}</span>
        <input type="range" min={0} max={100} step={5} value={Math.round(settings.volume * 100)}
          onChange={(event) => {
            const volume = Number(event.target.value) / 100;
            set({ volume });
            for (const audio of document.querySelectorAll('audio')) audio.volume = volume;
          }} />
      </label>
      <div className="quick-row" role="group" aria-label={t('Ink lines')}>
        <span className="quick-label">{t('Ink lines')}</span>
        <div className="segmented">
          <button type="button" aria-pressed={!settings.ink} onClick={() => set({ ink: false })}>{t('Off')}</button>
          {(['fine', 'medium', 'bold'] as const).map((inkWeight) => (
            <button key={inkWeight} type="button" aria-pressed={settings.ink && settings.inkWeight === inkWeight}
              onClick={() => set({ ink: true, inkWeight })}>
              {t(inkWeight === 'fine' ? 'Fine' : inkWeight === 'medium' ? 'Medium' : 'Bold')}
            </button>
          ))}
        </div>
      </div>
      <div className="quick-row" role="group" aria-label={t('Language')}>
        <span className="quick-label">{t('Language')}</span>
        <div className="segmented">
          {(Object.keys(languages) as Lang[]).map((lang) => (
            <button key={lang} type="button" lang={lang} aria-pressed={settings.lang === lang} onClick={() => set({ lang })}>{languages[lang]}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
