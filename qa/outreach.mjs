// Browser pass over the outreach demos: the hub, every brand's first steps and 3D stage,
// the catalog controls and every artwork or logo request. Start `npm run dev:outreach` first.
// Usage: node qa/outreach.mjs [baseUrl] [snapshot.json]
// With a snapshot path, the visible text of each screen is written there (or, if the file
// exists, compared against it), so a refactor can prove it changed nothing on screen.
import {existsSync} from 'node:fs';
import {readFile, writeFile} from 'node:fs/promises';
import {launchBrowser} from './browser.mjs';

const base = process.argv[2] || 'http://127.0.0.1:5184/';
const snapshotPath = process.argv[3];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
const screens = {};

const browser = await launchBrowser(['--enable-unsafe-swiftshader']);
const page = await browser.newPage();
const errors = [], images = new Set();
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => m.type() === 'error' && errors.push(m.text()));
page.on('response', r => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  else if (/^\/brands\//.test(new URL(r.url()).pathname)) images.add(new URL(r.url()).pathname);
});
await page.setViewport({width: 1440, height: 900});
const text = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());
const go = async hash => {
  await page.goto(base + hash, {waitUntil: 'load'});
  await sleep(1500);
};
const clickText = (selector, label) => page.evaluate((s, l) => {
  const el = [...document.querySelectorAll(s)].find(e => e.textContent.trim().toLowerCase().includes(l.toLowerCase()) && !e.disabled);
  if (!el) return false;
  el.scrollIntoView({block: 'center'});
  el.click();
  return true;
}, selector, label);

await go('');
await page.evaluate(() => localStorage.clear());
await go('');
screens.hub = await text();
check('Hub lists every maker', ['Praxis', 'Folsom', 'Meier', 'Grass Sticks'].every(name => screens.hub.includes(name)));

const brands = {folsom: 'Folsom', meier: 'Meier', grass: 'Grass Sticks'};
const picks = {folsom: ['Spar', 'Spar 88'], meier: ['Frontside', 'Quickdraw 88'], grass: ['Ski poles', 'Original Grass Sticks']};
for (const [id, name] of Object.entries(brands)) {
  errors.length = 0;
  await go(`#/${id}`);
  screens[`${id}-start`] = await text();
  check(`${name} opens`, (await page.title()).startsWith(name), await page.title());
  const logo = await page.evaluate(() => document.querySelector('.brand-home img')?.naturalWidth || 0);
  check(`${name} logo loads`, logo > 0);
  // Choose a family, then a product in it, by their visible names.
  const [family, product] = picks[id];
  await clickText('[role="radio"], button', family);
  await sleep(900);
  screens[`${id}-family`] = await text();
  const picked = await page.evaluate(name => {
    const select = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.text === name));
    if (!select) return false;
    select.value = [...select.options].find(o => o.text === name).value;
    select.dispatchEvent(new Event('change', {bubbles: true}));
    return true;
  }, product);
  await sleep(1500);
  screens[`${id}-model`] = await text();
  check(`${name} product can be chosen`, picked);
  const canvas = await page.evaluate(() => document.querySelectorAll('canvas').length);
  check(`${name} shows a stage`, canvas > 0 || id === 'grass', `${canvas} canvases`);
  check(`${name} total shown`, /\$\d/.test(screens[`${id}-model`]));
  check(`${name} has no errors`, errors.length === 0, errors.slice(0, 3).join(' | '));
}

errors.length = 0;
await go('#/admin');
screens.admin = await text();
check('Catalog controls open', /catalog/i.test(screens.admin));
check('Catalog controls have no errors', errors.length === 0, errors.slice(0, 3).join(' | '));
check('Brand assets were requested', images.size > 3, `${images.size} files`);
screens.assets = [...images].sort().join('\n');

if (snapshotPath) {
  if (existsSync(snapshotPath)) {
    const before = JSON.parse(await readFile(snapshotPath, 'utf8'));
    for (const key of Object.keys(before)) check(`Screen unchanged: ${key}`, before[key] === screens[key], before[key] === screens[key] ? '' : `was ${before[key]?.length} chars, now ${screens[key]?.length}`);
  } else {
    await writeFile(snapshotPath, JSON.stringify(screens, null, 2));
    console.log('snapshot written', snapshotPath);
  }
}

await browser.close();
console.log(results.join('\n'));
const failed = results.filter(r => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
