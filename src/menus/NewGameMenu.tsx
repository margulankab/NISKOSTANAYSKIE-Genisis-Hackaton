export function NewGameMenu() {
  return (
    <section className="intake menu">
      <h1>New Game</h1>
      <nav aria-label="New game" className="menu-list">
        <a className="menu-item" href="/new/prompt">From a prompt <span>Describe any place in words. No photos or music needed.</span></a>
        <a className="menu-item" href="/create">Create a day memory <span>Your journal, at least one photo, and the song you associate with the day.</span></a>
      </nav>
      <p><a href="/">Back to main menu</a></p>
    </section>
  );
}
