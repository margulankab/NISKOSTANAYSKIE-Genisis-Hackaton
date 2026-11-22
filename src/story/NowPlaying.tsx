import { useT } from '../i18n/i18n';

/** What the world is playing, at the top of the screen while the soundtrack runs. */
export function NowPlaying({ name, playing }: { name?: string; playing: boolean }) {
  const t = useT();
  if (!name || !playing) return null;
  return (
    <p className="now-playing" aria-live="polite">
      <span className="now-playing-bars" aria-hidden="true"><i /><i /><i /></span>
      <span className="now-playing-label">{t('Now playing')}</span> {name}
    </p>
  );
}
