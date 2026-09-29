// Browser pass over the Praxis site and its configurator (3D stage, Inside view and
// bindings included). Start `npm run dev:praxis` first.
// Usage: node qa/praxis.mjs [baseUrl]   (Chrome from CHROME_PATH, else the default Windows install)
import {launchBrowser} from './browser.mjs';

const base = process.argv[2] || 'http://127.0.0.1:5181/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);

const browser = await launchBrowser(['--enable-unsafe-swiftshader']);
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => m.type() === 'error' && errors.push(m.text()));
page.on('response', r => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
await page.setViewport({width: 1440, height: 900});
await page.evaluateOnNewDocument(() => {
  if (navigator.clipboard) navigator.clipboard.writeText = () => Promise.resolve();
});

const go = async hash => {
  await page.evaluate(h => (location.hash = h), hash);
  await sleep(700);
};
const click = async (selector, text) => {
  const ok = await page.evaluate((s, t) => {
    const el = [...document.querySelectorAll(s)].find(e => !t || e.textContent.trim().includes(t));
    if (!el) return false;
    el.scrollIntoView({block: 'center'});
    el.click();
    return true;
  }, selector, text);
  if (!ok) throw new Error(`missing ${selector} ${text ?? ''}`);
  await sleep(350);
};
const text = s => page.$eval(s, e => e.textContent.trim()).catch(() => null);
const amount = () => page.$eval('.cfg-bar-amount', e => e.childNodes[0].textContent.trim()).catch(() => null);
const next = async () => {
  await page.click('.cfg-primary-button');
  await sleep(600);
};
const heading = () => text('.cfg-3d-heading');
const canvasData = key => page.$eval('.cfg-3d-canvas canvas', (c, k) => c.dataset[k] ?? null, key).catch(() => null);
const settled = () => page.waitForFunction(() => {
  const root = document.querySelector('.cfg-3d'), canvas = document.querySelector('.cfg-3d-canvas canvas');
  return root?.dataset.artwork === 'ready' && canvas?.dataset.transition !== 'turning' && canvas?.dataset.bindingStatus !== 'loading';
}, {timeout: 20000}).then(() => true, () => false);
const view = async label => {
  await click('.cfg-3d-footer [role=radio]', label);
  await sleep(500);
};

await page.goto(base, {waitUntil: 'networkidle0'});
await page.evaluate(() => localStorage.clear());
await page.goto(base, {waitUntil: 'networkidle0'});
await sleep(600);

// 1. Stock purchase path into the bag
await go('#/skis/gpo');
await click('.px-buy button[type=submit]');
check('Add to bag requires a length', /Choose a length/.test((await text('.px-toast')) ?? ''));
await click('.px-length-row button', '182');
check('Length row shows published specs', /140-116-128 mm · 22 m radius · 8.9 lb per pair/.test((await text('.px-length-detail')) ?? ''), await text('.px-length-detail'));
await click('.px-buy button[type=submit]');
check('Stock ski added to bag', (await text('.px-bag-count')) === '1');
check('Spec section drawn from the chart', !!(await page.$('.px-technical-panel .cfg-technical')) && (await page.$$eval('.px-table tbody tr', r => r.length)) === 6);

// 2. "Build it your way" preselects the model and length
await click('.px-buy-actions a', 'Build it your way');
await sleep(900);
check('Configurator opens on the GPO', (await text('.cfg-3d-heading h2')) === 'GPO');
check('The 3D stage renders the pair with its artwork', !!(await page.$('.cfg-3d-canvas canvas')) && (await settled()));
check('Length carried over', (await text('.cfg-length-chip[aria-checked=true]')) === '182');
check('Base price with standard build', (await amount()) === '$1,600', await amount());

// 3. Flex follows the standard edition by length
await click('.cfg-length-chip', '175');
await next();
await next();
check('GPO 175 starts at #3 flex', ((await text('.cfg-segmented.is-block [aria-checked=true]')) ?? '').startsWith('#3'), await text('.cfg-segmented.is-block [aria-checked=true]'));
await click('.cfg-step-nav button', 'Shape');
await click('.cfg-length-chip', '182');
await click('.cfg-step-nav button', 'Build');
check('Flex follows to #4 at 182', ((await text('.cfg-segmented.is-block [aria-checked=true]')) ?? '').startsWith('#4'));
check('The change is explained', /standard flex for the GPO at 182 cm/.test((await text('.cfg-adjustment')) ?? ''));

// 4. Width, molding and core pricing (width and profile fold into one section)
await click('.cfg-more-details summary', 'Width and profile');
await click('.cfg-card', '10 mm wider');
await view('Tech Specs');
check('Wider updates the 3D ski and its dimensions', /150 \/ 126 \/ 138 mm/.test((await text('.cfg-3d-tech')) ?? '') && (await text('.cfg-3d-tech'))?.includes('183 cm'), await text('.cfg-3d-tech'));
check('Wider adds $200', (await amount()) === '$1,800', await amount());
await click('.cfg-card', 'Custom molding');
check('Custom molding shows a quote', /\+ quote/.test((await text('.cfg-bar-amount')) ?? ''));
await click('.cfg-card', 'Standard molding');
await click('.cfg-card', 'Standard');
await click('.cfg-compact-option', 'Ultra Light');
check('Ultra Light adds $150', (await amount()) === '$1,750');
check('Weight shows an honest bound', /< 8\.9/.test((await heading()) ?? ''), await heading());
await view('Inside');
await settled();
check('Inside shows the Ultra Light layup', (await page.$$('.cfg-3d-chip')).length === 9 && /Carbon fiber/.test((await text('.cfg-3d-legend')) ?? '') && /Ultra Light core/.test((await text('.cfg-3d-legend')) ?? ''), await text('.cfg-3d-legend'));
await page.evaluate(() => [...document.querySelectorAll('.cfg-3d-chip')].find(b => b.textContent.includes('Ultra Light core'))?.focus());
await sleep(300);
check('A legend layer opens its card and highlights it', /Paulownia replaces aspen/.test((await text('.cfg-3d-layer-card')) ?? '') && (await canvasData('activeLayer')) === 'core', await text('.cfg-3d-layer-card'));
await page.evaluate(() => document.activeElement?.blur());

// 5. Veneer and signature art
await click('.cfg-step-nav button', 'Look');
await click('.cfg-swatch', 'Red Gum');
check('Veneer adds $100', (await amount()) === '$1,850', await amount());
check('Veneer tops render with the wood finish', (await settled()) && (await canvasData('finish')) === 'wood', await canvasData('finish'));
check('No signature art on the GPO', !(await page.$$eval('.cfg-filter-chip', b => b.map(x => x.textContent))).includes('Signature'));

// 6. Ability is required before adding to the bag
await click('.cfg-step-nav button', 'Review');
await next();
check('Missing ability steers to the Rider step', (await text('.cfg-step-nav .is-current')) === '04Rider' || /Rider/.test((await text('.cfg-step-nav .is-current')) ?? ''), await text('.cfg-step-nav .is-current'));
await click('.cfg-card', 'Expert');
await page.type('#cfg-heightWeight', '5′11″, 175 lb');
await page.click('.cfg-panel-head');
await next();
check('Review shows the rider notes', /175 lb/.test((await text('.cfg-panel')) ?? ''));
await next();
check('Custom build added to bag', (await text('.px-bag-count')) === '2', await text('.px-bag-count'));

// 7. The bag keeps an editable build
await go('#/bag');
check('Bag lists the custom build', (await page.$$('.px-bag-item.is-custom')).length === 1);
check('Custom price in the bag', (await text('.px-bag-item.is-custom .px-bag-price strong')) === '$1,850');
check('Bag total adds stock and custom', (await text('.px-total-row strong')) === '$2,750', await text('.px-total-row strong'));
await click('.px-bag-actions a', 'Edit build');
await sleep(900);
check('Edit opens the review step', (await text('.cfg-panel-head h2')) === 'Review', await text('.cfg-panel-head h2'));
check('Final action updates instead of duplicating', /Update your bag/.test((await text('.cfg-primary-button')) ?? ''));
check('Rider notes survive editing', /175 lb/.test((await text('.cfg-panel')) ?? ''));
await click('.cfg-step-nav button', 'Look');
await click('.cfg-swatch', 'Nylon');
await click('.cfg-step-nav button', 'Review');
await next();
await go('#/bag');
check('Edited build replaced in the bag', (await page.$$('.px-bag-item.is-custom')).length === 1 && (await text('.px-bag-item.is-custom .px-bag-price strong')) === '$1,750');

// 8. Share links carry the build but not personal notes
await go('#/custom');
await click('.cfg-card-category', 'Freeride');
await page.select('.cfg-select select', 'jedi-mind-sticks');
await sleep(300);
await click('.cfg-length-chip', '182');
await next();
check('Signature filter appears on the Jedi', (await page.$$eval('.cfg-filter-chip', b => b.map(x => x.textContent))).includes('Signature'));
await click('.cfg-filter-chip', 'Signature');
await click('.cfg-art-tile', 'Jedi');
await click('.cfg-header-actions .cfg-outline-button', 'Save');
await click('.cfg-save-actions .cfg-outline-button', 'Copy build link');
const shared = page.url();
check('Share link encodes the build', shared.includes('#/custom?build=') && decodeURIComponent(shared).includes('jedi-mind-sticks'));
await page.goto('about:blank');
await page.goto(shared, {waitUntil: 'networkidle0'});
await sleep(900);
check('Link restores the Jedi with its signature art', (await text('.cfg-3d-heading h2')) === 'Jedi Mind Sticks' && /Jedi on nylon/.test((await heading()) ?? ''), await heading());

// 8b. Bindings: one choice, mounted in 3D; a pair that does not fit stays on as a visual test
await go('#/custom?build=' + encodeURIComponent('category=freeride&model=gpo&length=182'));
await sleep(900);
await click('.cfg-step-nav button', 'Bindings');
check('Bindings start with skis only', (await text('.cfg-binding-model[aria-checked=true]'))?.includes('Skis only') && (await page.$$('.cfg-binding-model')).length === 7);
await click('.cfg-binding-model', 'Pivot 2.0 15');
await settled();
check('Choosing a Pivot 15 mounts it and prices the orderable brake', (await canvasData('bindingCount')) === '2' && (await amount()) === '$2,099.95' && /In your build · Black Metal \/ 130 mm/.test((await text('.cfg-binding-fit')) ?? ''), `${await amount()} ${await text('.cfg-binding-fit strong')}`);
check('Brakes narrower than the 116 mm waist are faded', (await page.$$('.cfg-binding-chip.is-unorderable')).length === 3);
await click('.cfg-binding-chip', '115 mm');
await settled();
check('A 115 mm brake stays on as a visual test, out of the total', (await canvasData('bindingCount')) === '2' && (await amount()) === '$1,600' && /Visual test only/.test((await text('.cfg-3d-binding-caption')) ?? ''), `${await amount()} ${await text('.cfg-3d-binding-caption')}`);
await click('.cfg-step-nav button', 'Review');
await settled();
check('The visual test stays mounted through Review', (await canvasData('bindingCount')) === '2' && /Visual test/.test((await text('.cfg-panel')) ?? '') && /Not in total/.test((await text('.cfg-price-card')) ?? ''));
await click('.cfg-step-nav button', 'Shape');
await click('.cfg-length-chip', '187');
await sleep(400);
check('A shape edit keeps the pair on the skis', (await canvasData('bindingCount')) === '2');
await click('.cfg-step-nav button', 'Bindings');
await click('.cfg-binding-chip', '130 mm');
await settled();
check('Back to an orderable brake rejoins the total', (await amount()) === '$2,099.95', await amount());
await click('.cfg-header-actions .cfg-outline-button', 'Save');
await click('.cfg-save-actions .cfg-outline-button', 'Copy build link');
check('An orderable pair travels in the share link', decodeURIComponent(page.url()).includes('binding='));
await page.keyboard.press('Escape');
await sleep(300);
await view('Bindings');
await click('.cfg-3d-remove', 'Remove bindings');
await settled();
check('Remove bindings returns to skis only', (await canvasData('bindingCount')) === '0' && (await amount()) === '$1,600');
await click('.cfg-step-nav button', 'Bindings');
await click('.cfg-binding-model', 'Pivot 2.0 15');
await click('.cfg-step-nav button', 'Rider');
await click('.cfg-card', 'Expert');
await click('.cfg-step-nav button', 'Review');
await next();
await go('#/bag');
const withBindings = await page.$$eval('.px-bag-item.is-custom', items => items.map(i => i.textContent));
check('A build with bindings reaches the bag with its pair and price', withBindings.some(t => /With LOOK Pivot 2\.0 15 GW · Black Metal · 130 mm bindings \(\+\$499\.95\)/.test(t) && /\$2,099\.95/.test(t)), withBindings.join(' | '));

// 9. Compare and search
await go('#/skis');
for (const id of ['GPO', 'EXP', 'SND']) await click('.px-compare-toggle', `Compare ${id}`);
await click('.px-compare-toggle', 'Compare MVP 94');
check('Compare stops at three', /Compare up to three/.test((await text('.px-toast')) ?? ''));
await go('#/compare');
check('Compare table lists three skis with published data', (await page.$$('.px-compare-table thead th')).length === 4 && /111–116/.test((await text('.px-compare-table')) ?? ''));
await click('.px-utility', 'Search');
await page.type('.px-search-field input', 'quixote');
await sleep(300);
check('Search offers custom-only models', /Quixote custom/.test((await text('.px-search-results')) ?? ''));

check('No console errors or failed requests', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(results.join('\n'));
const failed = results.filter(r => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
