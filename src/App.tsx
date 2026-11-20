import { useState } from 'react';
import { StartScreen } from './components/StartScreen';
import { CreateDay } from './components/CreateDay';
import { MoodReview } from './components/MoodReview';
import { WorldView } from './components/WorldView';
import { SavedWorlds } from './components/SavedWorlds';
import type { SavedWorld, SpotifyRef } from './lib/types';

export interface Draft { text: string; spotifyInput: string; media: { kind: 'photo' | 'video'; name: string; preview: string; thumb: string | null }[]; }
export const emptyDraft: Draft = { text: '', spotifyInput: '', media: [] };
type Screen = { name: 'start' } | { name: 'create' } | { name: 'review'; world: SavedWorld } | { name: 'play'; world: SavedWorld; fresh: boolean } | { name: 'saved' };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'start' });
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const go = (s: Screen) => setScreen(s);
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <main id="main">
        {screen.name === 'start' && <StartScreen onCreate={() => go({ name: 'create' })} onSaved={() => go({ name: 'saved' })} />}
        {screen.name === 'create' && <CreateDay draft={draft} setDraft={setDraft} onBack={() => go({ name: 'start' })} onImagined={(world) => go({ name: 'review', world })} />}
        {screen.name === 'review' && <MoodReview world={screen.world} onEdit={() => go({ name: 'create' })} onEnter={() => go({ name: 'play', world: screen.world, fresh: true })} />}
        {screen.name === 'play' && <WorldView key={screen.world.id} world={screen.world} fresh={screen.fresh} onExit={() => go({ name: 'start' })} />}
        {screen.name === 'saved' && <SavedWorlds onBack={() => go({ name: 'start' })} onOpen={(world) => go({ name: 'play', world, fresh: false })} />}
      </main>
    </>
  );
}
export type { SpotifyRef };
