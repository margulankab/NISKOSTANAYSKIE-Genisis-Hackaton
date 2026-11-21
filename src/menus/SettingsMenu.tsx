import { useId, useState } from 'react';
import { readSettings, writeSettings } from './settings';
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
    <section className="intake menu">
      <h1>Settings</h1>
      <p className="lede">Saved in this browser and applied right away.</p>
      <form className="settings" onSubmit={(event) => event.preventDefault()}>
        <div className="setting">
          <div className="setting-heading">
            <label htmlFor={volumeId}>Soundtrack volume</label>
            <output htmlFor={volumeId}>{Math.round(settings.volume * 100)}%</output>
          </div>
          <input id={volumeId} type="range" min={0} max={100} step={5} value={Math.round(settings.volume * 100)}
            onChange={(event) => update({ ...settings, volume: Number(event.target.value) / 100 })} />
        </div>
        <fieldset className="setting">
          <legend>Reduced motion</legend>
          {(['system', 'on', 'off'] as const).map((value) => (
            <label key={value} className="choice">
              <input type="radio" name="reduced-motion" value={value} checked={settings.reducedMotion === value}
                onChange={() => update({ ...settings, reducedMotion: value })} />
              {value === 'system' ? 'Follow this device' : value === 'on' ? 'Always reduce motion' : 'Full motion'}
            </label>
          ))}
        </fieldset>
      </form>
      <p className="settings-status" role="status">{saved ? 'Settings saved.' : ''}</p>
      <a className="back-link" href="/">Back to main menu</a>
    </section>
  );
}
