import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

async function text(relative) {
  return readFile(path.join(root, relative), 'utf8');
}

test('standalone module contains the required entry points', async () => {
  const files = await readdir(root);
  assert(files.includes('index.html'));
  assert(files.includes('map.html'));
  assert(files.includes('js'));
  assert(files.includes('supabase'));
});

test('module does not import or link old prototype or language-site logic', async () => {
  const sources = await Promise.all([
    text('index.html'), text('map.html'), text('js/app.js'), text('js/map.js'), text('js/api.js')
  ]);
  const combined = sources.join('\n');
  assert.doesNotMatch(combined, /tour-pickup-demo/);
  assert.doesNotMatch(combined, /\.\.\/js\/core/);
  assert.doesNotMatch(combined, /words-data\.js/);
});

test('session recovery stores credentials only, never backend data', async () => {
  const api = await text('js/api.js');
  assert.match(api, /sessionId/);
  assert.match(api, /accessToken/);
  assert.match(api, /role/);
  assert.doesNotMatch(api, /localStorage\.setItem[^\n]+messages/);
  assert.doesNotMatch(api, /localStorage\.setItem[^\n]+appointments/);
  assert.doesNotMatch(api, /localStorage\.setItem[^\n]+locations/);
});

test('user content is rendered as text and not HTML', async () => {
  const app = await text('js/app.js');
  assert.match(app, /bubble\.textContent = localized\.text/);
  assert.doesNotMatch(app, /innerHTML\s*=/);
  assert.doesNotMatch(app, /insertAdjacentHTML/);
});

test('map instance is created once and markers are moved in place', async () => {
  const map = await text('js/map.js');
  assert.equal((map.match(/window\.L\.map\(/g) || []).length, 1);
  assert.match(map, /existing\.setLatLng\(latLng\)/);
  assert.doesNotMatch(map, /replaceChildren\([^)]*map/);
});

test('locale and intent architecture includes all planned locales', async () => {
  const config = await text('js/config.js');
  const i18n = await text('js/i18n.js');
  for (const locale of ['zh-TW', 'zh-CN', 'th', 'en', 'ja']) assert.match(config, new RegExp(locale));
  for (const key of ['on_my_way', 'arrived', 'where_are_you', 'please_wait']) assert.match(i18n, new RegExp(key));
});

test('migration keeps tables private and enforces required expiry', async () => {
  const migrationDir = path.join(root, 'supabase', 'migrations');
  const [migrationName] = await readdir(migrationDir);
  const sql = await readFile(path.join(migrationDir, migrationName), 'utf8');
  assert.match(sql, /create schema if not exists tour_private/);
  assert.match(sql, /enable row level security/g);
  assert.match(sql, /revoke all on all tables in schema tour_private from public, anon, authenticated/);
  assert.match(sql, /extensions\.gen_random_bytes\(32\)/);
  assert.match(sql, /interval '7 days'/);
  assert.match(sql, /interval '20 minutes'/);
  assert.match(sql, /delete from tour_private\.locations/);
  assert.match(sql, /grant execute on function public\.tour_v1_/);
});
