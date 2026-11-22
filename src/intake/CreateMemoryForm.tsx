import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { saveDayProgress } from '../data/indexed-memory-repository';
import { MemoryActions } from '../data/MemoryActions';
import { MemoryViewer } from '../scene/MemoryViewer';
import type { DayBundle } from '../shared/memory-schema';
import { createViewerProps } from '../shared/memory-viewer';
import type { MemoryViewerProps } from '../shared/memory-viewer';
import { generateMemory } from './generate-memory';
import { SongOfTheDay } from '../music/SongOfTheDay';
import type { Song } from '../music/song';
import { songLabel } from '../music/song';
import { validateDayDraft } from './validate-day-draft';
import { enterWorld } from '../chrome/immersive';
import { useT } from '../i18n/i18n';
import type { DayDraftInput, DraftErrors, ValidatedDayDraft } from './validate-day-draft';
import { requestPlotWorld } from '../world/request-plot-world';

function localDate() {
  const today = new Date();
  const parts = [today.getFullYear(), today.getMonth() + 1, today.getDate()];
  return parts.map((part) => String(part).padStart(2, '0')).join('-');
}

function isSelectedFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.name !== '';
}

export function CreateMemoryForm() {
  const form = useRef<HTMLFormElement>(null);
  const active = useRef<AbortController | null>(null);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [draft, setDraft] = useState<ValidatedDayDraft>();
  const [pending, setPending] = useState<'validation' | 'generation'>();
  const [failure, setFailure] = useState(false);
  const [generationFailed, setGenerationFailed] = useState('');
  const [scenePrompt, setScenePrompt] = useState('');
  const [fictional, setFictional] = useState(false);
  const [geminiNote, setGeminiNote] = useState('');
  const [preview, setPreview] = useState<{ bundle: DayBundle; viewer: MemoryViewerProps }>();
  const [song, setSong] = useState<Song | null>(null);
  const [entered, setEntered] = useState(false);
  const entry = useRef<HTMLTextAreaElement>(null);
  const viewer = useRef<HTMLDivElement>(null);
  const t = useT();
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => {
    if (!pending && Object.values(errors).some(Boolean)) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors, pending]);

  function clearPreview() {
    setPreview(undefined);
    setGeminiNote('');
    setEntered(false);
    setGenerationFailed('');
  }

  function update(field: keyof DayDraftInput) {
    setErrors((current) => ({ ...current, [field]: undefined }));
    setDraft(undefined);
    setFailure(false);
    clearPreview();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const fields = new FormData(event.currentTarget);
    const audio = fields.get('audio');
    setPending('validation');
    setDraft(undefined);
    setErrors({});
    setFailure(false);
    clearPreview();
    try {
      const result = await validateDayDraft({
        date: String(fields.get('date') ?? ''),
        entryText: String(fields.get('entryText') ?? ''),
        photos: fields.getAll('photos').filter(isSelectedFile),
        audio: isSelectedFile(audio) ? audio : null,
        hasPermission: fields.has('hasPermission'),
      });
      if (result.ok) setDraft(result.draft);
      else setErrors(result.errors);
    } catch {
      setFailure(true);
    } finally {
      setPending(undefined);
    }
  }

  async function generate() {
    if (!draft || pending) return;
    // The fictional scene prompt is optional: without it (or when Gemini is unavailable) the day is built on this device.
    const useGemini = scenePrompt.trim().length > 0;
    if (useGemini && !fictional) { setGenerationFailed(t('Confirm that the scene prompt is fictional before sending it to Gemini.')); return; }
    const controller = new AbortController();
    active.current = controller;
    setPending('generation');
    clearPreview();
    try {
      let world: NonNullable<DayBundle['world']> | undefined;
      if (useGemini) {
        try {
          const scene = await requestPlotWorld(scenePrompt, draft.entryId, controller.signal);
          world = { layout: scene.layout, interpretation: scene.interpretation, scenePrompt };
        } catch (error) {
          controller.signal.throwIfAborted();
          setGeminiNote(t('Gemini could not stage the scene, so it was built on this device. ({reason})', { reason: error instanceof Error ? error.message : '' }));
        }
      }
      const generated = await generateMemory(draft, world);
      controller.signal.throwIfAborted();
      const bundle: DayBundle = song ? { ...generated, song } : generated;
      setPreview({ bundle, viewer: createViewerProps(bundle, () => {}) });
    } catch (error) {
      if (!controller.signal.aborted) setGenerationFailed(error instanceof Error ? error.message : 'The memory could not be generated. Try again.');
    } finally {
      if (active.current === controller) { active.current = null; setPending(undefined); }
    }
  }

  return (
    <section className="intake" data-win="day_memory.exe">
      <h1>{t('Create a memory')}</h1>
      <p>{t('Your entry and files stay in this browser. This draft lasts while the page is open.')}</p>
      <form ref={form} onSubmit={submit} noValidate aria-busy={Boolean(pending)}>
        <fieldset disabled={Boolean(pending)} aria-label="Memory details">
          <label htmlFor="date">{t('Date')}</label>
          <input id="date" name="date" type="date" defaultValue={localDate()} required
            aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? 'date-error' : undefined}
            onChange={() => update('date')} />
          {errors.date && <p id="date-error" role="alert">{errors.date}</p>}

          <label htmlFor="entry-text">{t('What happened that day?')}</label>
          <textarea ref={entry} id="entry-text" name="entryText" rows={6} minLength={20} maxLength={6000} required
            aria-invalid={Boolean(errors.entryText)}
            aria-describedby={errors.entryText ? 'entry-help entry-error' : 'entry-help'}
            onChange={() => update('entryText')} />
          <p id="entry-help" className="form-help">{t('20–6,000 characters.')}</p>
          {errors.entryText && <p id="entry-error" role="alert">{errors.entryText}</p>}

          <label htmlFor="photos">{t('Photos')}</label>
          <input id="photos" name="photos" type="file" multiple required
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            aria-invalid={Boolean(errors.photos)} aria-describedby={errors.photos ? 'photos-help photos-error' : 'photos-help'}
            onChange={() => update('photos')} />
          <p id="photos-help" className="form-help">{t('1–3 JPEG, PNG, or WebP files. Up to 5 MiB and 16 megapixels each.')}</p>
          {errors.photos && <p id="photos-error" role="alert">{errors.photos}</p>}

          <label htmlFor="audio">{t('Audio excerpt')}</label>
          <input id="audio" name="audio" type="file" required
            accept="audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav"
            aria-invalid={Boolean(errors.audio)} aria-describedby={errors.audio ? 'audio-help audio-error' : 'audio-help'}
            onChange={() => update('audio')} />
          <p id="audio-help" className="form-help">{t('MP3 or WAV. 1–90 seconds, up to 10 MiB.')}</p>
          {errors.audio && <p id="audio-error" role="alert">{errors.audio}</p>}

          <SongOfTheDay value={song} onChange={setSong} legend="Where to hear the song" />

          <label className="permission">
            <input name="hasPermission" type="checkbox" required
              aria-invalid={Boolean(errors.hasPermission)}
              aria-describedby={errors.hasPermission ? 'permission-error' : undefined}
              onChange={() => update('hasPermission')} />
            <span>{t('I own or have permission to include, play, and export the selected media.')}</span>
          </label>
          {errors.hasPermission && <p id="permission-error" role="alert">{errors.hasPermission}</p>}
          <button type="submit">{pending === 'validation' ? t('Checking files…') : t('Validate draft')}</button>
        </fieldset>
      </form>
      {pending === 'validation' && <p role="status">{t('Checking your photos and audio.')}</p>}
      {failure && <p role="alert">{t('The draft could not be checked. Try again in this browser.')}</p>}
      {draft && !preview && (
        <div className="draft-status">
          <label htmlFor="day-scene-prompt">{t('Fictional scene prompt (optional)')}</label>
          <textarea id="day-scene-prompt" value={scenePrompt} rows={3} disabled={Boolean(pending)}
            aria-describedby="day-scene-help" onChange={event => {
              setScenePrompt(event.target.value); setFictional(false); setGenerationFailed('');
            }} />
          <p id="day-scene-help" className="form-help">{t('Leave it empty to build the day privately on this device. Or describe an invented scene with the same feeling, up to 600 characters: only this field goes to Gemini, which stages it as a playable plot.')} <a href="https://aistudio.google.com/docs/terms#data-use-unpaid" target="_blank" rel="noreferrer">{t('Gemini terms')}</a></p>
          <label className="permission">
            <input type="checkbox" checked={fictional} disabled={Boolean(pending)} onChange={event => setFictional(event.target.checked)} />
            <span>{t('Send this fictional prompt to Google Gemini.')}</span>
          </label>
          <p role="status">
            {pending === 'generation' ? t('Generating your memory…')
              : t(draft.photos.length === 1 ? 'Draft ready for {date}. {count} photo and one audio excerpt validated.' : 'Draft ready for {date}. {count} photos and one audio excerpt validated.', { date: draft.date, count: draft.photos.length })}
          </p>
          {generationFailed && <p role="alert">{generationFailed}</p>}
          <button type="button" disabled={Boolean(pending)} onClick={generate}>
            {generationFailed ? t('Retry generation') : t('Generate memory')}
          </button>
        </div>
      )}
      {preview && (
        <div className="generated-memory">
          {geminiNote && <p role="status">{geminiNote}</p>}
          <p role="status">{preview.bundle.manifest.generation.fallbackReason === 'no-keyword-match'
            ? t('Local draft with neutral mood and setting.') : t('Memory preview ready.')}</p>
          {!entered && (
            <div className="prompt-actions">
              <button type="button" className="enter-world" onClick={() => {
                const { manifest } = preview.bundle;
                enterWorld({
                  words: preview.viewer.entryText, title: manifest.title, from: entry.current,
                  lines: [
                    t('reading your words'),
                    t('placing {count} objects', { count: manifest.artifacts.length + manifest.photos.length }),
                    t('tuning soundtrack: {track}', { track: preview.bundle.song ? songLabel(preview.bundle.song) : manifest.date }),
                    t('opening the world'),
                  ],
                });
                setEntered(true);
                requestAnimationFrame(() => viewer.current?.scrollIntoView({ block: 'start' }));
              }}>{t('Enter world')}</button>
            </div>
          )}
          <div ref={viewer} className="entered-viewer">
            <MemoryViewer {...preview.viewer} entered={entered} game={{ save: (progress) => saveDayProgress(preview.bundle, progress) }} />
          </div>
          <MemoryActions bundle={preview.bundle} />
        </div>
      )}
    </section>
  );
}
