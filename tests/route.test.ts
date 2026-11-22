import { describe, expect, it } from 'vitest';
import { hashFor, pathFor } from '../src/chrome/route';

describe('web-build route names', () => {
  it.each([
    ['/', ''], ['/examples', 'examples'], ['/new/prompt', 'new--prompt'], ['/settings', 'options'],
    ['/play/54e438e1-da56-4f6a-a83d-e80684aaf691', 'play--54e438e1-da56-4f6a-a83d-e80684aaf691'],
    ['/examples/the-last-light', 'examples--the-last-light'], ['/world-preview', 'world-preview'],
  ])('%s ↔ #%s', (path, hash) => {
    expect(hashFor(path)).toBe(hash);
    expect(pathFor('#' + hash)).toBe(path);
  });

  it('uses only plain hash names that hosts pass through', () => {
    for (const path of ['/new/prompt', '/memory/abc-123', '/settings', '/load']) expect(hashFor(path)).toMatch(/^[A-Za-z0-9-]*$/);
    expect(hashFor('/settings')).not.toBe('settings');
  });

  it('still reads older #/path links', () => {
    expect(pathFor('#/examples')).toBe('/examples');
  });
});
