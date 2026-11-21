import { PixelLink } from '../chrome/PixelLink';

export function NewGameMenu() {
  return (
    <section className="intake menu" data-win="new_game.exe">
      <h1>New game</h1>
      <nav aria-label="New game">
        <ul className="pb-grid">
          <PixelLink main href="/new/prompt" icon="play" label="From a prompt" hint="Describe any place in words. No photos or music needed." />
          <PixelLink href="/create" icon="song" tone="pink" label="Create a day memory" hint="Your journal, at least one photo, and the song you link with the day." />
        </ul>
      </nav>
      <p><a href="/">Back to main menu</a></p>
    </section>
  );
}
