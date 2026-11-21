import { useId, useState } from 'react';
import { atmospheres, readSettings, writeSettings } from './settings';
import type { Settings } from './settings';

export function SettingsMenu() {
  const volumeId = useId();
  const [settings, setSettings] = useState(readSettings);
  const [saved, setSaved] = useState(false);

  function update(next: Settings) {
    setSettings(next);
    writeSettings(next);
    setSaved(true);
  }

  return (
    <section className="intake menu" data-win="settings.exe">
      <h1>Settings</h1>
      <form onSubmit={(event) => event.preventDefault()}>
        <label htmlFor={volumeId}>Soundtrack volume: {Math.round(settings.volume * 100)}%</label>
        <input id={volumeId} type="range" min={0} max={100} step={5} value={Math.round(settings.volume * 100)}
          onChange={(event) => update({ ...settings, volume: Number(event.target.value) / 100 })} />
        <fieldset>
          <legend>Reduced motion</legend>
          {(['system', 'on', 'off'] as const).map((value) => (
            <label key={value} className="permission">
              <input type="radio" name="reduced-motion" value={value} checked={settings.reducedMotion === value}
                onChange={() => update({ ...settings, reducedMotion: value })} />
              {value === 'system' ? 'Follow this device' : value === 'on' ? 'Always reduce motion' : 'Full motion'}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Atmosphere</legend>
          {(['auto', ...Object.keys(atmospheres)] as Settings['theme'][]).map((value) => (
            <label key={value} className="permission">
              <input type="radio" name="theme" value={value} checked={settings.theme === value}
                onChange={() => update({ ...settings, theme: value })} />
              {value === 'auto' ? 'Auto: follow the world you are in' : `${atmospheres[value].name}: ${atmospheres[value].note}`}
            </label>
          ))}
        </fieldset>
        <label className="permission">
          <input type="checkbox" checked={settings.pixel} onChange={(event) => update({ ...settings, pixel: event.target.checked })} />
          Pixel filter on 3D worlds (also lighter on older devices)
        </label>
      </form>
      {saved && <p role="status">Settings saved in this browser.</p>}
      <p><a href="/">Back to main menu</a></p>
    </section>
  );
}
