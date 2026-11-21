import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { hasTranslation, translate } from '../src/i18n/i18n';
import { parsePrompt } from '../src/world/parse-prompt';

/** Every string literal passed to t(…) in the source, including both branches of a ternary. */
function phrasesInSource(dir = 'src'): Set<string> {
  const found = new Set<string>();
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) { phrasesInSource(path).forEach(phrase => found.add(phrase)); continue; }
    if (!/\.tsx?$/.test(name) || path.endsWith('i18n.ts')) continue;
    const text = readFileSync(path, 'utf8');
    for (const match of text.matchAll(/(?<![\w.])t\(/g)) {
      let depth = 1, i = match.index + 2, quote = '';
      const literals: string[] = [];
      let current = '';
      let compared = false; // a literal compared against (value === 'on') is data, not interface text
      for (; i < text.length && depth > 0; i += 1) {
        const c = text[i];
        if (quote) {
          if (c === '\\') { current += text[i + 1]; i += 1; } else if (c === quote) { if (quote === "'" && !compared) literals.push(current); quote = ''; } else current += c;
        } else if (c === "'" || c === '`') { quote = c; current = ''; compared = /[=!]==?\s*$/.test(text.slice(i - 6, i)); } else if (c === '(') depth += 1; else if (c === ')') depth -= 1;
        else if (c === '{' && depth === 1 && literals.length) break; // stop at a vars object
      }
      literals.forEach(literal => found.add(literal));
    }
  }
  return found;
}

describe('interface language', () => {
  it('returns English source text unchanged and fills variables', () => {
    expect(translate('en', 'Enter world')).toBe('Enter world');
    expect(translate('en', '{count} of 2 discoveries found', { count: 1 })).toBe('1 of 2 discoveries found');
  });

  it('translates to Russian and falls back to English for unknown phrases', () => {
    expect(translate('ru', 'Enter world')).toBe('Войти в мир');
    expect(translate('ru', '{count} of 2 discoveries found', { count: 2 })).toBe('Найдено 2 из 2');
    expect(translate('ru', 'A phrase nobody wrote')).toBe('A phrase nobody wrote');
  });

  it('has a Russian translation for every phrase the interface passes to t()', () => {
    const phrases = [...phrasesInSource()];
    expect(phrases.length).toBeGreaterThan(80);
    expect(phrases.filter(phrase => !hasTranslation('ru', phrase))).toEqual([]);
  });
});

describe('Russian prompts set time of day and weather', () => {
  it.each([
    ['Ночной парк у пруда, скамейка и фонарь.', 'night', 'clear'],
    ['Вечером на набережной шёл дождь.', 'dusk', 'rain'],
    ['Утро в саду, лёгкий туман.', 'dawn', 'fog'],
    ['Зимний двор, снег и звёзды.', 'night', 'snow'],
    ['A quiet park at noon.', 'day', 'clear'],
  ])('%s', (prompt, timeOfDay, weather) => {
    const interpretation = parsePrompt(prompt);
    expect(interpretation.timeOfDay).toBe(timeOfDay);
    expect(interpretation.weather).toBe(weather);
  });
});
