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
  assert(files.includes('manifest.webmanifest'));
  assert(files.includes('sw.js'));
  assert(files.includes('js'));
  assert(files.includes('supabase'));
});

test('PWA is scoped to the standalone tour module', async () => {
  const manifest = JSON.parse(await text('manifest.webmanifest'));
  const index = await text('index.html');
  const map = await text('map.html');
  const app = await text('js/app.js');
  const mapScript = await text('js/map.js');
  const pwa = await text('js/pwa.js');
  const worker = await text('sw.js');

  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  assert(manifest.icons.some((icon) => icon.sizes === '192x192'));
  assert(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose.includes('maskable')));
  assert.match(index, /rel="manifest" href="\.\/manifest\.webmanifest"/);
  assert.match(map, /rel="manifest" href="\.\/manifest\.webmanifest"/);
  assert.match(index, /src="\.\/js\/app\.js\?v=9"/);
  assert.match(map, /src="\.\/js\/map\.js\?v=9"/);
  assert.match(app, /from '\.\/config\.js\?v=9'/);
  assert.match(mapScript, /from '\.\/config\.js\?v=9'/);
  assert.match(app, /registerTourServiceWorker/);
  assert.match(mapScript, /registerTourServiceWorker/);
  assert.match(pwa, /navigator\.serviceWorker\.register\('\.\/sw\.js'/);
  assert.match(pwa, /showButton\(\)/);
  assert.match(worker, /url\.origin !== self\.location\.origin/);
  assert.match(worker, /event\.request\.mode === 'navigate'/);
  assert.match(worker, /\['script', 'style', 'manifest'\]\.includes\(event\.request\.destination\)/);
  assert.match(worker, /fetch\(event\.request\)\s*\.catch\(/);
  assert.doesNotMatch(worker, /supabase\.co|tile\.openstreetmap\.org/);
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
  assert.match(api, /locale/);
  assert.doesNotMatch(api, /localStorage\.setItem[^\n]+messages/);
  assert.doesNotMatch(api, /localStorage\.setItem[^\n]+appointments/);
  assert.doesNotMatch(api, /localStorage\.setItem[^\n]+locations/);
});

test('language is chosen before role, both choices are remembered, and QR joins infer the opposite role', async () => {
  const config = await text('js/config.js');
  const index = await text('index.html');
  const app = await text('js/app.js');
  const api = await text('js/api.js');

  assert.match(config, /roleStorageKey: 'tour\.v1\.role'/);
  assert.match(config, /localeStorageKey: 'tour\.v1\.locale'/);
  assert.match(config, /userLocales: \['zh-TW', 'th', 'ja', 'en'\]/);
  assert.match(index, /id="changeRoleButton"/);
  assert.match(index, /id="changeLanguageButton"/);
  assert.match(index, /id="changeLanguageFromCreateButton"/);
  assert.match(index, /id="scanFromRoleButton"/);
  for (const locale of ['zh-TW', 'th', 'ja', 'en']) {
    assert.match(index, new RegExp(`data-locale-choice="${locale}"`));
  }
  assert.match(index, /id="roleView"/);
  assert.match(index, /data-role-choice="customer"/);
  assert.match(index, /data-role-choice="driver"/);
  assert.match(index, /id="confirmOwnLabel"/);
  assert.match(index, /id="tripCustomerName"/);
  assert.match(index, /id="tripVehiclePlate"/);
  assert.doesNotMatch(index, /data-customer-locale|id="languageView"/);
  assert.match(app, /localStorage\.setItem\(TOUR_CONFIG\.roleStorageKey, role\)/);
  assert.match(app, /localStorage\.setItem\(TOUR_CONFIG\.localeStorageKey, normalizedLocale\)/);
  assert.match(app, /function chooseLanguage\(locale\)/);
  assert.match(app, /languageReturnView === 'create'/);
  assert.match(app, /showLanguagePicker\(\{ preserveJoinRole: returnView === 'create' \}\)/);
  assert.match(app, /if \(!preferredLocale\)/);
  assert.match(app, /localStorage\.removeItem\(TOUR_CONFIG\.roleStorageKey\)/);
  assert.match(app, /if \(clearLocale\) localStorage\.removeItem\(TOUR_CONFIG\.localeStorageKey\)/);
  assert.match(app, /selectedRole = preview\.creatorRole === 'driver' \? 'customer' : 'driver'/);
  assert.match(app, /TourApi\.confirmSession\(pendingJoin\.joinToken, selectedRole, label\)/);
  assert.match(api, /p_label: label/);
  assert.match(app, /showRoleHome\(\)/);
  assert.match(api, /locale: TOUR_CONFIG\.userLocales\.includes\(session\.locale\) \? session\.locale/);
  assert.match(api, /locale: TOUR_CONFIG\.userLocales\.includes\(stored\.locale\) \? stored\.locale/);
});

test('user content is rendered as text and not HTML', async () => {
  const app = await text('js/app.js');
  assert.match(app, /bubble\.textContent = localized\.text/);
  assert.doesNotMatch(app, /innerHTML\s*=/);
  assert.doesNotMatch(app, /insertAdjacentHTML/);
});

test('map instance is created once and markers are moved in place', async () => {
  const page = await text('map.html');
  const map = await text('js/map.js');
  assert.equal((map.match(/window\.L\.map\(/g) || []).length, 1);
  assert.match(map, /existing\.setLatLng\(latLng\)/);
  assert.match(page, /id="mapCustomerName"/);
  assert.match(page, /id="mapVehiclePlate"/);
  assert.match(page, /id="recenterMapButton"/);
  assert.match(map, /map\.flyTo\(selfMarker\.getLatLng\(\)/);
  assert.doesNotMatch(map, /replaceChildren\([^)]*map/);
});

test('locale and intent architecture includes all planned locales', async () => {
  const config = await text('js/config.js');
  const i18n = await text('js/i18n.js');
  for (const locale of ['zh-TW', 'zh-CN', 'th', 'en', 'ja']) assert.match(config, new RegExp(locale));
  for (const key of ['on_my_way', 'arrived', 'where_are_you', 'please_wait']) assert.match(i18n, new RegExp(key));
  assert.match(config, /exposedLocales: \['zh-TW', 'th', 'ja', 'en'\]/);
  assert.match(i18n, /ja: '向かっています'/);
  assert.match(i18n, /en: 'I am on my way'/);
  assert.match(i18n, /'app\.name': '旅の仲間'/);
});

test('every exposed locale has the same UI keys and every intent has Japanese and English', async () => {
  const { INTENTS, UI } = await import('../js/i18n.js');
  const referenceKeys = Object.keys(UI['zh-TW']).sort();
  for (const locale of ['th', 'ja', 'en']) assert.deepEqual(Object.keys(UI[locale]).sort(), referenceKeys);
  for (const translations of Object.values(INTENTS)) {
    assert.equal(typeof translations.ja, 'string');
    assert.equal(typeof translations.en, 'string');
  }
});

test('migration keeps tables private and enforces required expiry', async () => {
  const migrationDir = path.join(root, 'supabase', 'migrations');
  const migrationName = (await readdir(migrationDir)).find((name) => name.includes('tour_mvp_v1'));
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

test('pairing migration requires the scanner to add the missing customer name or vehicle plate', async () => {
  const migrationDir = path.join(root, 'supabase', 'migrations');
  const migrationName = (await readdir(migrationDir)).find((name) => name.includes('complete_participant_labels'));
  const sql = await readFile(path.join(migrationDir, migrationName), 'utf8');
  assert.match(sql, /drop constraint tour_v1_label_matches_creator/);
  assert.match(sql, /create function public\.tour_v1_confirm_session\([\s\S]+p_label text/);
  assert.match(sql, /trip_display_name = case when p_role = 'customer'/);
  assert.match(sql, /vehicle_plate = case when p_role = 'driver'/);
  assert.match(sql, /grant execute on function public\.tour_v1_confirm_session\(text, text, text\)/);
});
