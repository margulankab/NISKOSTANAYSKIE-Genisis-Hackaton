import { PixelLink } from '../chrome/PixelLink';
import { useT } from '../i18n/i18n';

export function NewGameMenu() {
  const t = useT();
  return (
    <section className="intake menu" data-win="new_game.exe">
      <h1>{t('New game')}</h1>
      <nav aria-label={t('New game')}>
        <ul className="pb-grid">
          <PixelLink main href="/new/prompt" icon="play" label={t('From a prompt')} hint={t('Describe any place in words. No photos or music needed.')} />
          <PixelLink href="/create" icon="song" tone="pink" label={t('Create a day memory')} hint={t('Your journal, at least one photo, and the song you link with the day.')} />
        </ul>
      </nav>
      <p><a href="/">{t('Back to main menu')}</a></p>
    </section>
  );
}
