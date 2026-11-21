import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { selectWorldSoundtrack } from '../../src/media/world-soundtrack';
import { WorldSoundtrack } from '../../src/scene/WorldSoundtrack';
import '../../src/styles.css';

function TestPreview() {
  const [, setAudio] = useState<HTMLAudioElement | null>(null);
  const [choice, setChoice] = useState(() => {
    const scenario = new URLSearchParams(location.search).get('audio');
    const result = selectWorldSoundtrack(scenario === 'unsuitable' ? {} : { setting: ['cove'] });
    return scenario === 'missing' ? { ...result, blob: null } : result;
  });

  return (
    <main className="shell">
      <WorldSoundtrack value={choice} onChange={setChoice} onActiveAudio={setAudio} />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<TestPreview />);
