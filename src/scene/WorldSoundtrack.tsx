import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  createCatalogSoundtrack, createUploadedSoundtrack, soundtrackCatalog,
} from '../media/world-soundtrack';
import type { ResolvedWorldSoundtrack } from '../media/world-soundtrack';
import { AudioPlayer } from './AudioPlayer';
import { useAssetUrl } from './use-asset-url';

type ActiveAudioHandler = (audio: HTMLAudioElement | null) => void;

function TrackPreview({ assetId, blob, loop, muted, paused, onActiveAudio }: {
  assetId: string;
  blob: Blob;
  loop: boolean;
  muted: boolean;
  paused: boolean;
  onActiveAudio: ActiveAudioHandler;
}) {
  const resolveAsset = useCallback(async () => blob, [blob]);
  const media = useAssetUrl(assetId, resolveAsset);
  if (media.status === 'loading') return <p role="status">Opening soundtrack…</p>;
  if (media.status === 'error') return <p role="alert">The soundtrack could not be opened.</p>;
  return <AudioPlayer key={media.url} url={media.url} loop={loop} muted={muted} paused={paused}
    preview onActiveAudio={onActiveAudio} />;
}

export function WorldSoundtrack({ value, onChange, onActiveAudio, paused = false, mute }: {
  value: ResolvedWorldSoundtrack;
  onChange: (soundtrack: ResolvedWorldSoundtrack) => void;
  onActiveAudio: ActiveAudioHandler;
  paused?: boolean;
  mute?: { value: boolean; onChange: (muted: boolean) => void };
}) {
  const picker = useId();
  const fileInput = useId();
  const [localMuted, setLocalMuted] = useState(false);
  const muted = mute?.value ?? localMuted;
  const setMuted = mute?.onChange ?? setLocalMuted;
  const [authorized, setAuthorized] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  const { record, blob } = value;
  const catalogOption = record.kind === 'catalog' && soundtrackCatalog.some(({ id }) => id === record.trackId);
  const current = catalogOption ? record.trackId : record.kind === 'silent' ? '' : 'saved';

  useEffect(() => () => { request.current++; }, []);

  function select(id: string) {
    request.current++;
    setUploading(false);
    setError('');
    const choice = soundtrackCatalog.find((track) => track.id === id);
    onChange(choice ? createCatalogSoundtrack(choice.id)
      : { record: { kind: 'silent', reason: 'Selected by the player.' }, blob: null });
  }

  async function upload(file: File) {
    const attempt = ++request.current;
    setError('');
    setUploading(true);
    try {
      const soundtrack = await createUploadedSoundtrack(file, authorized);
      if (attempt === request.current) onChange(soundtrack);
    } catch (failure) {
      if (attempt === request.current) setError(failure instanceof Error ? failure.message : 'Choose an audio file your browser can open.');
    } finally {
      if (attempt === request.current) setUploading(false);
    }
  }

  return (
    <section className="world-soundtrack" aria-label="World soundtrack">
      <label htmlFor={picker}>Soundtrack</label>
      <select id={picker} value={current} onChange={(event) => select(event.currentTarget.value)}>
        <option value="">Silence</option>
        {current === 'saved' && record.kind !== 'silent' && <option value="saved">{record.title}</option>}
        {soundtrackCatalog.map(({ id, title }) => <option key={id} value={id}>{title}</option>)}
      </select>
      <p>{record.kind === 'silent' ? 'Silent world. ' : ''}{record.reason}</p>
      {record.kind !== 'silent' && (
        <>
          <p>{record.rights.credit}. {record.rights.permission}</p>
          {blob ? (
            <>
              <TrackPreview key={record.assetId} assetId={record.assetId} blob={blob}
                loop={record.kind === 'catalog'} muted={muted} paused={paused} onActiveAudio={onActiveAudio} />
              <label><input type="checkbox" checked={muted} onChange={(event) => setMuted(event.currentTarget.checked)} />
                Mute soundtrack
              </label>
            </>
          ) : <p role="alert">The saved soundtrack is unavailable. Choose another track or upload an authorized file.</p>}
        </>
      )}
      <details>
        <summary>Upload an authorized soundtrack</summary>
        <label>
          <input type="checkbox" checked={authorized} disabled={uploading}
            onChange={(event) => setAuthorized(event.currentTarget.checked)} />
          I have permission to include, play, and export this file.
        </label>
        <label htmlFor={fileInput}>MP3 or WAV soundtrack</label>
        <input id={fileInput} type="file" accept=".mp3,.wav,audio/mpeg,audio/wav" disabled={!authorized || uploading}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file) void upload(file);
          }} />
        {uploading && <p role="status">Checking soundtrack…</p>}
        {error && <p role="alert">{error}</p>}
      </details>
    </section>
  );
}
