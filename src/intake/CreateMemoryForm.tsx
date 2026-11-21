import { useState } from 'react';
import type { FormEvent } from 'react';
import { MemoryActions } from '../data/MemoryActions';
import { MemoryViewer } from '../scene/MemoryViewer';
import type { DayBundle } from '../shared/memory-schema';
import { createViewerProps } from '../shared/memory-viewer';
import type { MemoryViewerProps } from '../shared/memory-viewer';
import { generateMemory } from './generate-memory';
import { validateDayDraft } from './validate-day-draft';
import type { DayDraftInput, DraftErrors, ValidatedDayDraft } from './validate-day-draft';

function localDate() {
  const today = new Date();
  const parts = [today.getFullYear(), today.getMonth() + 1, today.getDate()];
  return parts.map((part) => String(part).padStart(2, '0')).join('-');
}

function isSelectedFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.name !== '';
}

export function CreateMemoryForm() {
  const [errors, setErrors] = useState<DraftErrors>({});
  const [draft, setDraft] = useState<ValidatedDayDraft>();
  const [pending, setPending] = useState<'validation' | 'generation'>();
  const [failure, setFailure] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [preview, setPreview] = useState<{ bundle: DayBundle; viewer: MemoryViewerProps }>();

  function clearPreview() {
    setPreview(undefined);
    setGenerationFailed(false);
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
    setPending('generation');
    clearPreview();
    try {
      const bundle = await generateMemory(draft);
      setPreview({ bundle, viewer: createViewerProps(bundle, () => {}) });
    } catch {
      setGenerationFailed(true);
    } finally {
      setPending(undefined);
    }
  }

  return (
    <section className="intake">
      <h1>Create a memory</h1>
      <p>Your entry and files stay in this browser. This draft lasts while the page is open.</p>
      <form onSubmit={submit} noValidate aria-busy={Boolean(pending)}>
        <fieldset disabled={Boolean(pending)} aria-label="Memory details">
          <label htmlFor="date">Date</label>
          <input id="date" name="date" type="date" defaultValue={localDate()} required
            aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? 'date-error' : undefined}
            onChange={() => update('date')} />
          {errors.date && <p id="date-error" role="alert">{errors.date}</p>}

          <label htmlFor="entry-text">What happened that day?</label>
          <textarea id="entry-text" name="entryText" rows={6} minLength={20} maxLength={6000} required
            aria-invalid={Boolean(errors.entryText)}
            aria-describedby={errors.entryText ? 'entry-help entry-error' : 'entry-help'}
            onChange={() => update('entryText')} />
          <p id="entry-help" className="form-help">20–6,000 characters.</p>
          {errors.entryText && <p id="entry-error" role="alert">{errors.entryText}</p>}

          <label htmlFor="photos">Photos</label>
          <input id="photos" name="photos" type="file" multiple required
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            aria-invalid={Boolean(errors.photos)} aria-describedby={errors.photos ? 'photos-help photos-error' : 'photos-help'}
            onChange={() => update('photos')} />
          <p id="photos-help" className="form-help">1–3 JPEG, PNG, or WebP files. Up to 5 MiB and 16 megapixels each.</p>
          {errors.photos && <p id="photos-error" role="alert">{errors.photos}</p>}

          <label htmlFor="audio">Audio excerpt</label>
          <input id="audio" name="audio" type="file" required
            accept="audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav"
            aria-invalid={Boolean(errors.audio)} aria-describedby={errors.audio ? 'audio-help audio-error' : 'audio-help'}
            onChange={() => update('audio')} />
          <p id="audio-help" className="form-help">MP3 or WAV. 1–90 seconds, up to 10 MiB.</p>
          {errors.audio && <p id="audio-error" role="alert">{errors.audio}</p>}

          <label className="permission">
            <input name="hasPermission" type="checkbox" required
              aria-invalid={Boolean(errors.hasPermission)}
              aria-describedby={errors.hasPermission ? 'permission-error' : undefined}
              onChange={() => update('hasPermission')} />
            <span>I own or have permission to include, play, and export the selected media.</span>
          </label>
          {errors.hasPermission && <p id="permission-error" role="alert">{errors.hasPermission}</p>}
          <button type="submit">{pending === 'validation' ? 'Checking files…' : 'Validate draft'}</button>
        </fieldset>
      </form>
      {pending === 'validation' && <p role="status">Checking your photos and audio.</p>}
      {failure && <p role="alert">The draft could not be checked. Try again in this browser.</p>}
      {draft && !preview && (
        <div className="draft-status">
          <p role="status">
            {pending === 'generation' ? 'Generating your memory…'
              : `Draft ready for ${draft.date}. ${draft.photos.length} ${draft.photos.length === 1 ? 'photo' : 'photos'} and one audio excerpt validated.`}
          </p>
          {generationFailed && <p role="alert">The memory could not be generated. Retry or choose a different photo.</p>}
          <button type="button" disabled={Boolean(pending)} onClick={generate}>
            {generationFailed ? 'Retry generation' : 'Generate memory'}
          </button>
        </div>
      )}
      {preview && (
        <div className="generated-memory">
          <p role="status">{preview.bundle.manifest.generation.fallbackReason === 'no-keyword-match'
            ? 'Local draft with neutral mood and setting.' : 'Memory preview ready.'}</p>
          <MemoryViewer {...preview.viewer} />
          <MemoryActions bundle={preview.bundle} />
        </div>
      )}
    </section>
  );
}
