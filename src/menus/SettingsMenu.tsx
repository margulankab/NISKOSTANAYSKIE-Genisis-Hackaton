import { useEffect, useId, useState } from 'react';
import { atmospheres, readSettings, subscribeToSettings, writeSettings } from './settings';
import type { Settings } from './settings';
import { languages, useT } from '../i18n/i18n';
import type { Lang } from '../i18n/i18n';

export function SettingsMenu() {
  const volumeId = useId();
  const [settings, setSettings] = useState(readSettings);
  const [saved, setSaved] = useState(false);
  const t = useT();
  // The masthead's View panel can change settings while this page is open.
  useEffect(() => subscribeToSettings(() => setSettings(readSettings())), []);

  function update(next: Settings) {
    setSettings(next);
    writeSettings(next);
    setSaved(true);
  }

  return (
    <section className="intake menu" data-win="settings.exe">
      <h1>{t('Settings')}</h1>
      <form onSubmit={(event) => event.preventDefault()}>
        <fieldset>
          <legend>{t('Language')}</legend>
          {(Object.keys(languages) as Lang[]).map((code) => (
            <label key={code} className="permission" lang={code}>
              <input type="radio" name="lang" value={code} checked={settings.lang === code}
                onChange={() => update({ ...settings, lang: code })} />
              {languages[code]}
            </label>
          ))}
        </fieldset>
        <label htmlFor={volumeId}>{t('Soundtrack volume: {value}%', { value: Math.round(settings.volume * 100) })}</label>
        <input id={volumeId} type="range" min={0} max={100} step={5} value={Math.round(settings.volume * 100)}
          onChange={(event) => update({ ...settings, volume: Number(event.target.value) / 100 })} />
        <fieldset>
          <legend>{t('Entering a world')}</legend>
          <label className="permission">
            <input type="checkbox" checked={settings.autoplay} onChange={(event) => update({ ...settings, autoplay: event.target.checked })} />
            {t('Start the soundtrack when I enter a world')}
          </label>
          <label className="permission">
            <input type="checkbox" checked={settings.fullscreen} onChange={(event) => update({ ...settings, fullscreen: event.target.checked })} />
            {t('Switch to full screen when I enter a world')}
          </label>
        </fieldset>
        <fieldset>
          <legend>{t('Camera')}</legend>
          {(['first', 'third'] as const).map((value) => (
            <label key={value} className="permission">
              <input type="radio" name="view" value={value} checked={settings.view === value}
                onChange={() => update({ ...settings, view: value })} />
              {t(value === 'first' ? 'First person' : 'Third person')}
            </label>
          ))}
          <label className="permission">
            <input type="checkbox" checked={settings.ink} onChange={(event) => update({ ...settings, ink: event.target.checked })} />
            {t('Ink outlines and toon shading on 3D worlds')}
          </label>
        </fieldset>
        <fieldset className="customize">
          <legend>{t('Customize')}</legend>
          <label htmlFor="setting-fov">{t('Field of view: {value}°', { value: settings.fov })}</label>
          <input id="setting-fov" type="range" min={55} max={95} step={1} value={settings.fov}
            onChange={(event) => update({ ...settings, fov: Number(event.target.value) })} />
          <label htmlFor="setting-sensitivity">{t('Look sensitivity: {value}×', { value: settings.sensitivity.toFixed(1) })}</label>
          <input id="setting-sensitivity" type="range" min={0.4} max={2.5} step={0.1} value={settings.sensitivity}
            onChange={(event) => update({ ...settings, sensitivity: Number(event.target.value) })} />
          <label htmlFor="setting-text">{t('Text size: {value}%', { value: settings.textScale })}</label>
          <input id="setting-text" type="range" min={90} max={130} step={5} value={settings.textScale}
            onChange={(event) => update({ ...settings, textScale: Number(event.target.value) })} />
          <p className="setting-label">{t('Ink lines')}</p>
          <div className="choice-row" role="radiogroup" aria-label={t('Ink lines')}>
            {(['fine', 'medium', 'bold'] as const).map((value) => (
              <label key={value} className="permission">
                <input type="radio" name="ink-weight" value={value} checked={settings.inkWeight === value} disabled={!settings.ink}
                  onChange={() => update({ ...settings, inkWeight: value })} />
                {t(value === 'fine' ? 'Fine' : value === 'medium' ? 'Medium' : 'Bold')}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>{t('Reduced motion')}</legend>
          {(['system', 'on', 'off'] as const).map((value) => (
            <label key={value} className="permission">
              <input type="radio" name="reduced-motion" value={value} checked={settings.reducedMotion === value}
                onChange={() => update({ ...settings, reducedMotion: value })} />
              {t(value === 'system' ? 'Follow this device' : value === 'on' ? 'Always reduce motion' : 'Full motion')}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>{t('Atmosphere')}</legend>
          {(['auto', ...Object.keys(atmospheres)] as Settings['theme'][]).map((value) => (
            <label key={value} className="permission">
              <input type="radio" name="theme" value={value} checked={settings.theme === value}
                onChange={() => update({ ...settings, theme: value })} />
              {value === 'auto' ? t('Auto: follow the world you are in') : `${t(atmospheres[value].name)}: ${t(atmospheres[value].note)}`}
            </label>
          ))}
        </fieldset>
        <label className="permission">
          <input type="checkbox" checked={settings.pixel} onChange={(event) => update({ ...settings, pixel: event.target.checked })} />
          {t('Pixel filter on 3D worlds (also lighter on older devices)')}
        </label>
      </form>
      {saved && <p role="status">{t('Settings saved in this browser.')}</p>}
      <p><a href="/">{t('Back to main menu')}</a></p>
    </section>
  );
}
