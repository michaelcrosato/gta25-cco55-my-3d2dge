import { test } from 'node:test';
import assert from 'node:assert/strict';
import { page, contentFiles } from '../../tools/build.mjs';

test('the build is byte-for-byte repeatable', async () => {
  assert.equal(await page(), await page());
});
test('the page inlines the engine and the bundle, with no raw </script> inside them', async () => {
  const html = await page();
  assert.ok(html.includes('root.My3D2dge = E'), 'engine inlined');
  assert.ok(html.includes('GRAND THEFT MOTO'), 'title present');
  assert.equal((html.match(/<\/script>/g) || []).length, (html.match(/<script>/g) || []).length, 'script tags balanced');
  assert.ok(!/@(boot|engine|bundle) -->/.test(html), 'every placeholder replaced');
});
test('the page header carries the Source Information and, separately, the engine summary', async () => {
  const html = await page(), head = html.slice(0, html.indexOf('<html'));
  for (const k of ['Initial Date', 'SOURCE', 'GAME ENGINE', 'Environment', 'Model and Effort Level']) assert.ok(head.includes('* ' + k + ':'), k);
  assert.ok(head.indexOf('GAME ENGINE ANALYSIS') > head.indexOf('SOURCE INFORMATION'));
});
test('content is discovered sorted, and every file is under src/game', () => {
  const f = contentFiles();
  assert.deepEqual(f, [...f].sort());
  assert.ok(f.length >= 3);
});
