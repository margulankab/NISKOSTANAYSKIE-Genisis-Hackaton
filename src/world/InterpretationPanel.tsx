import { recipes } from './recipes';
import type { Interpretation } from './world-schema';

const zoneNames = { water: 'Shoreline', indoor: 'Indoor room', paved: 'Paved ground', grass: 'Grass' } as const;

/** Shows what the prompt became: built, approximated and not-yet-supported details. */
export function InterpretationPanel({ prompt, interpretation }: { prompt: string; interpretation: Interpretation }) {
  const { terms, relations, timeOfDay, weather, setting } = interpretation;
  const name = (t: Interpretation['terms'][number]) =>
    t.recipe ? recipes[t.recipe].label + (t.count > 1 ? ` ×${t.count}` : '') : t.zone ? zoneNames[t.zone] : '—';
  const built = terms.filter((t) => t.status === 'rendered');
  const approximated = terms.filter((t) => t.status === 'approximated');
  const missing = terms.filter((t) => t.status === 'unsupported');
  const looseRelations = relations.filter((r) => r.status === 'unsupported');
  const quote = (span: { start: number; end: number }) => `“${prompt.slice(span.start, span.end)}”`;

  return (
    <section className="interpretation" aria-label="How the prompt was built">
      <p className="interpretation-summary">
        {setting === 'mixed' ? 'Indoor and outdoor' : setting === 'indoor' ? 'Indoor' : 'Outdoor'} · {timeOfDay}
        {weather !== 'clear' && ` · ${weather}`}
      </p>
      {built.length > 0 && (
        <p><strong>Built:</strong> {built.map((t) => `${quote(t.span)} → ${name(t)}${t.color ? ` (${t.color})` : ''}`).join(', ')}</p>
      )}
      {relations.some((r) => r.status === 'applied') && (
        <p><strong>Placed:</strong> {relations.filter((r) => r.status === 'applied')
          .map((r) => `${terms[r.subject!].text} ${prompt.slice(r.span.start, r.span.end)} ${terms[r.object!].text}`).join(', ')}</p>
      )}
      {approximated.length > 0 && (
        <p><strong>Approximated:</strong> {approximated.map((t) => `${quote(t.span)} ${t.note ?? ''}`.trim()).join('; ')}</p>
      )}
      {(missing.length > 0 || looseRelations.length > 0) && (
        <p className="interpretation-missing">
          <strong>Not built yet:</strong> {[
            ...missing.map((t) => quote(t.span)),
            ...looseRelations.map((r) => `${quote(r.span)} (placement)`),
          ].join(', ')}
        </p>
      )}
      <p className="interpretation-note">Coverage depends on the available builders. Revise the prompt to change what appears.</p>
    </section>
  );
}
