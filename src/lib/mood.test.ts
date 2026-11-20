import assert from 'node:assert/strict';
import { interpretDay } from './mood';
import { parseSpotify } from './spotify';

const a = interpretDay({ text: 'I walked by the lake. It was quiet and calm. I read a book.', media: [], hasMusic: true });
const b = interpretDay({ text: 'I walked by the lake. It was quiet and calm. I read a book.', media: [], hasMusic: true });
assert.deepEqual(a, b, 'same input -> same config');
assert.equal(a.moodId, 'calm');
const w = a.title.split(' ').length; assert.ok(w >= 3 && w <= 8, `title length ${a.title}`);
assert.ok(a.fragments.every((f) => f.kind !== 'text' || 'I walked by the lake. It was quiet and calm. I read a book.'.includes(f.caption.replace('…', ''))), 'captions come from user text');
assert.equal(interpretDay({ text: 'Я скучаю, весь день шёл дождь и было грустно.', media: [], hasMusic: false }).moodId, 'melancholy');
assert.equal(parseSpotify('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=abc')?.id, '4uLU6hMCjMI75M1A2tKUQC');
assert.equal(parseSpotify('spotify:track:4uLU6hMCjMI75M1A2tKUQC')?.kind, 'track');
assert.equal(parseSpotify('https://evil.com/track/4uLU6hMCjMI75M1A2tKUQC'), null);
assert.equal(parseSpotify('hello'), null);
console.log('mood tests passed');
