import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pieces } from './build-art.mjs';
import { themes } from './theme.mjs';

test('every piece renders in both themes with no missing values', () => {
  for (const [name, render] of Object.entries(pieces)) {
    for (const theme of Object.values(themes)) {
      const svg = render(theme);
      assert.doesNotMatch(svg, /undefined|NaN|\[object/, `${name}-${theme.id}`);
      assert.match(svg, /prefers-reduced-motion:reduce/, `${name}-${theme.id} settles under reduced motion`);
      assert.match(svg, /<title id="title">[^<]+<\/title>/, `${name}-${theme.id} has a title`);
    }
  }
});

test('committed artwork matches the generator', async () => {
  for (const [name, render] of Object.entries(pieces)) {
    for (const theme of Object.values(themes)) {
      const file = new URL(`../assets/${name}-${theme.id}.svg`, import.meta.url);
      assert.equal(await readFile(file, 'utf8'), render(theme), `run node scripts/build-art.mjs to refresh ${name}-${theme.id}.svg`);
    }
  }
});
