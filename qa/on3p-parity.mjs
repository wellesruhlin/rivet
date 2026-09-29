// ON3P parity pass: the "behaviors to preserve" from the flagship's handoff, checked in a
// real browser. Selectors use roles, ARIA labels and visible text only, so the same pass
// runs against any ON3P implementation.
// Usage: start the app (npm run dev:on3p), then node qa/on3p-parity.mjs [baseUrl]
import {readFileSync} from 'node:fs';
import {launchBrowser} from './browser.mjs';

const base = process.argv[2] || 'http://127.0.0.1:5178/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? `  — ${detail}` : ''}`);
const data = file => JSON.parse(readFileSync(new URL(`../brands/on3p/src/${file}`, import.meta.url)));
const catalog = data('catalog.json'), stockArt = data('stock-art.json'), bindings = data('bindings-catalog.json');
const topName = id => catalog.tops.find(g => g.id === id)?.name;
const baseName = id => catalog.bases.find(g => g.id === id)?.name;

const browser = await launchBrowser(['--enable-unsafe-swiftshader']);
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => m.type() === 'error' && !/favicon|WebGL|GPU stall|GL_|swiftshader/i.test(m.text()) && errors.push(m.text()));
await page.setViewport({width: 1440, height: 900});
await page.evaluateOnNewDocument(() => {
  // A clipboard that always works, so "Copy build link" can be checked headless.
  Object.defineProperty(navigator, 'clipboard', {value: {writeText: async text => {window.__copied = text;}}});
});

const evaluate = (fn, ...args) => page.evaluate(fn, ...args);
async function radio(group, option) {
  const ok = await evaluate((group, option) => {
    const root = [...document.querySelectorAll('[role=radiogroup]')].find(g => g.getAttribute('aria-label') === group);
    const item = root && [...root.querySelectorAll('[role=radio]')].find(r => r.textContent.trim().startsWith(option) || r.textContent.includes(option));
    if (!item) return false;
    item.click();
    return true;
  }, group, option);
  if (!ok) throw new Error(`No "${option}" in radio group "${group}"`);
  await sleep(350);
}
const checked = group => evaluate(group => {
  const root = [...document.querySelectorAll('[role=radiogroup]')].find(g => g.getAttribute('aria-label') === group);
  return root ? [...root.querySelectorAll('[role=radio][aria-checked=true]')].map(r => r.textContent.trim()).join('|') : null;
}, group);
const radioDisabled = (group, option) => evaluate((group, option) => {
  const root = [...document.querySelectorAll('[role=radiogroup]')].find(g => g.getAttribute('aria-label') === group);
  const item = root && [...root.querySelectorAll('[role=radio]')].find(r => r.textContent.trim().startsWith(option));
  return item ? item.disabled || item.getAttribute('aria-disabled') === 'true' : null;
}, group, option);
const radioOptions = group => evaluate(group => {
  const root = [...document.querySelectorAll('[role=radiogroup]')].find(g => g.getAttribute('aria-label') === group);
  return root ? [...root.querySelectorAll('[role=radio]')].map(r => r.textContent.trim()) : [];
}, group);
async function clickButton(text, {within = 'body', exact = false} = {}) {
  const ok = await evaluate((text, within, exact) => {
    const scope = document.querySelector(within) ?? document.body;
    const button = [...scope.querySelectorAll('button, a')].find(b => {
      const t = (b.getAttribute('aria-label') || b.textContent).trim();
      return exact ? t === text : t.includes(text);
    });
    if (!button) return false;
    button.click();
    return true;
  }, text, within, exact);
  if (!ok) throw new Error(`No button "${text}"`);
  await sleep(350);
}
const cta = () => evaluate(() => {
  const button = [...document.querySelectorAll('footer button[aria-label]')].find(b => b.getAttribute('aria-label') !== 'Previous step');
  return button ? {label: button.getAttribute('aria-label'), disabled: button.disabled} : null;
});
async function next() {
  await evaluate(() => [...document.querySelectorAll('footer button[aria-label]')].find(b => b.getAttribute('aria-label') !== 'Previous step').click());
  await sleep(450);
}
const total = () => evaluate(() => document.querySelector('[class*="bar-amount"]')?.textContent.trim().replace(/\s+/g, ' '));
const money = n => `$${n.toLocaleString('en-US')}`;
// innerText applies CSS text-transform, so text checks compare in lower case.
const bodyText = () => evaluate(() => document.body.innerText.toLowerCase());
const has = (text, needle) => text.includes(needle.toLowerCase());
async function sheet() {
  await evaluate(() => document.querySelector('footer [aria-controls$="build-sheet"]').click());
  await sleep(300);
  const lines = await evaluate(() => Object.fromEntries([...document.querySelectorAll('[id$="build-sheet"] button[aria-label^="Edit "]')].map(b => {
    const [, label, value] = b.getAttribute('aria-label').match(/^Edit ([^:]+): (.*)$/);
    const price = b.parentElement.querySelector('[class*="sheet-price"]')?.textContent.trim();
    return [label, {value, price}];
  })));
  await page.keyboard.press('Escape');
  await sleep(200);
  return lines;
}
const currentStep = () => evaluate(() => document.querySelector('nav[aria-label="Build steps"] [aria-current=step]')?.textContent.replace(/\d/g, '').replace('(reviewed)', '').trim());
async function selectModel(handle) {
  const ok = await evaluate(handle => {
    const select = [...document.querySelectorAll('select')].find(s => / model$/.test(s.getAttribute('aria-label') ?? ''));
    if (!select) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    setter.call(select, handle);
    select.dispatchEvent(new Event('change', {bubbles: true}));
    return true;
  }, handle);
  if (!ok) throw new Error('No model select');
  await sleep(400);
}
const fresh = async (hash = '') => {
  // Leave the app first: navigating to the same URL with only a new hash would not reload it.
  await page.goto('about:blank');
  await page.goto(`${base}${hash}`, {waitUntil: 'networkidle0'});
  await page.goto('about:blank');
  await evaluate(() => {try {localStorage.clear();} catch {} });
  await page.goto(`${base}${hash}`, {waitUntil: 'networkidle0'});
  await sleep(600);
};
const artworkReady = () => page.waitForSelector('[data-artwork="ready"]', {timeout: 60000}).then(() => true, () => false);
const run = async (name, fn) => {
  try {await fn();} catch (error) {check(name, false, error.message);}
};

// 1. Shape: category → model → explicit length → rocker. Nothing picks a size.
await run('shape hierarchy', async () => {
  await fresh();
  let c = await cta();
  check('starts by asking for a skiing style', c?.disabled && /ski style/i.test(c.label), JSON.stringify(c));
  await radio('The way you ski', 'Freeride');
  c = await cta();
  check('then asks for a model', c?.disabled && /model/i.test(c.label), JSON.stringify(c));
  await selectModel('billy-goat-118');
  c = await cta();
  check('then asks for a length', c?.disabled && /length/i.test(c.label), JSON.stringify(c));
  check('no length is preselected', !(await checked('Length in centimeters')), await checked('Length in centimeters'));
  await radio('Length in centimeters', '186');
  c = await cta();
  check('a chosen length unlocks Graphics', !c?.disabled && c?.label === 'Continue to Graphics', JSON.stringify(c));
  check('base price is the ski pair', (await total()) === '$1,099', await total());
  check('Ripper is unavailable on Billy Goat 118', await radioDisabled('Rocker profile', 'Ripper') === true);
});

// 2. Stock artwork follows the model; Billy Goat 118 starts with BG XXII / Green.
await run('stock artwork', async () => {
  const lines = await sheet();
  const bg = stockArt.models['billy-goat-118'];
  check('Billy Goat 118 starts with its stock topsheet', lines.topsheet?.value === topName(bg.top), JSON.stringify(lines.topsheet));
  check('…and its stock base', lines.base?.value === baseName(bg.base), JSON.stringify(lines.base));
  check('stock base is the Green herringbone, not Herringburn', lines.base?.value === 'Green', lines.base?.value);
  await selectModel('billy-goat-114');
  await radio('Length in centimeters', '184').catch(() => radio('Length in centimeters', '185')).catch(() => {});
  const after = await sheet();
  const bg114 = stockArt.models['billy-goat-114'];
  check('untouched stock art follows a model change', !bg114 || after.topsheet?.value === topName(bg114.top), JSON.stringify(after.topsheet));
  await selectModel('billy-goat-118');
  await radio('Length in centimeters', '186');
});

// 3. Graphics: galleries, filters, pagination, stable order, and base-then-sidewall confirmation.
await run('graphics', async () => {
  await next();
  check('Graphics is step two', await currentStep() === 'Graphics', await currentStep());
  const text = await bodyText();
  check(`${catalog.tops.length} topsheets are offered`, has(text, `${catalog.tops.length} designs`), text.match(/\d+ designs/)?.[0]);
  const tiles = () => evaluate(() => [...document.querySelectorAll('button[aria-pressed]')].filter(b => b.closest('[class*="art-grid"], [class*="gallery"]')).map(b => b.getAttribute('aria-label') ?? b.textContent.trim()));
  const before = await tiles();
  check('the gallery pages 12 designs at a time', before.length === 12, before.length);
  await evaluate(() => [...document.querySelectorAll('button[aria-pressed]')].filter(b => b.closest('[class*="art-grid"], [class*="gallery"]'))[4].click());
  await sleep(350);
  check('choosing artwork keeps every tile in place', JSON.stringify(await tiles()) === JSON.stringify(before));
  await clickButton('Show 12 more');
  check('Show more adds the next 12', (await tiles()).length === 24, (await tiles()).length);
  let c = await cta();
  check('the next step asks for a base first', /base/i.test(c?.label) && !/Construction/.test(c?.label), c?.label);
  await evaluate(() => [...document.querySelectorAll('nav[aria-label="Build steps"] button')].find(b => b.textContent.includes('Construction')).click());
  await sleep(400);
  check('jumping ahead returns to the base choice', await currentStep() === 'Graphics' && /base/i.test((await cta())?.label), `${await currentStep()} ${(await cta())?.label}`);
  check(`${catalog.bases.length} bases are offered`, has(await bodyText(), `${catalog.bases.length} designs`), (await bodyText()).match(/\d+ designs/)?.[0]);
  c = await cta();
  check('a base can be kept as it is', c?.label === 'Use this base', c?.label);
  await next();
  c = await cta();
  check('then sidewalls are confirmed', c?.label === 'Use black sidewalls', c?.label);
  check('nine sidewall colors', (await radioOptions('Sidewall color')).length === 9, (await radioOptions('Sidewall color')).length);
  await radio('Sidewall color', 'Red');
  c = await cta();
  // Choosing a color is itself a confirmation.
  check('a colored sidewall adds $50 and confirms the sidewall', (await total()) === '$1,149' && c?.label === 'Continue to Construction', `${await total()} ${c?.label}`);
  await radio('Sidewall color', 'Black');
  check('switching back to black keeps it confirmed', (await cta())?.label === 'Continue to Construction', (await cta())?.label);
  await next();
  check('confirmed graphics lead to Construction', await currentStep() === 'Construction', await currentStep());
});

// 4. Construction opens the Inside view; rules follow the exact model.
await run('construction', async () => {
  check('Construction shows the Inside view', /Inside/.test(await checked('Preview view')), await checked('Preview view'));
  check('Torsion Bar is not offered for Billy Goat 118', has(await bodyText(), 'Torsion Bar is not offered') || await evaluate(() => {
    const row = [...document.querySelectorAll('[role=radio]')].find(r => r.textContent.trim().startsWith('Torsion Bar'));
    return !!row && (row.disabled || row.getAttribute('aria-disabled') === 'true');
  }));
  await radio('Layup', 'Leaf Spring');
  check('Leaf Spring adds $150', (await total()) === '$1,249', await total());
  await radio('Layup', 'Stock');
});

// 5. Bindings on a 118 mm ski: no listed Pivot 15 brake is orderable, so it is a visual test.
const pivot = bindings.products.find(p => p.id === 'pivot-15');
const pivotLabel = pivot.name.replace('LOOK ', '');
await run('bindings: visual test', async () => {
  await next();
  check('Bindings is step four', await currentStep() === 'Bindings', await currentStep());
  await radio('Bindings', pivotLabel);
  const lines = await sheet();
  check('an unorderable pair mounts as a visual test', /visual test/i.test(lines.bindings?.value) && lines.bindings?.price === 'Not in total', JSON.stringify(lines.bindings));
  check('…and stays out of the total', (await total()) === '$1,099', await total());
  check('the preview gains a Bindings view', (await radioOptions('Preview view')).some(v => v.startsWith('Bindings')), (await radioOptions('Preview view')).join(','));
  await clickButton('Change');
  await radio('Bindings', 'Skis only');
  check('skis only removes the pair', (await total()) === '$1,099' && !(await radioOptions('Preview view')).some(v => v.startsWith('Bindings')));
});

// 6. Review: everything in one place, maker desk handoff, link and saved build.
await run('review', async () => {
  await next();
  check('Review is the last step', await currentStep() === 'Review', await currentStep());
  const text = await bodyText();
  const chosen = await sheet();
  for (const word of ['Billy Goat 118', chosen.topsheet?.value, 'Green', 'Reference total']) check(`review lists ${word}`, has(text, word));
  check('the maker desk handoff is offered locally', has(text, 'Request maker review'));
  await clickButton('Copy build link');
  const link = await evaluate(() => window.__copied ?? location.href);
  check('the build link carries the configuration', /#build=/.test(link) && /model=billy-goat-118/.test(link), link);
  // A shared link restores the build, but its recipient confirms graphics again.
  const shared = link.slice(link.indexOf('#'));
  await fresh(shared);
  const restored = await sheet();
  check('a shared link restores the build', restored.topsheet?.value === chosen.topsheet?.value && /186/.test(restored.length?.value ?? ''), `${restored.topsheet?.value} vs ${chosen.topsheet?.value}`);
  await evaluate(() => [...document.querySelectorAll('nav[aria-label="Build steps"] button')].find(b => b.textContent.includes('Graphics')).click());
  await sleep(400);
  check('…and asks its recipient to confirm graphics', /base/i.test((await cta())?.label), (await cta())?.label);
});

// 7. Saved builds keep graphics confirmations.
await run('saved builds', async () => {
  await fresh('#build=category=Freeride&model=billy-goat-118&length=186');
  await next();
  await next();
  await next();
  await next();
  check('confirmed graphics before saving', await currentStep() === 'Construction', await currentStep());
  await clickButton('Save', {within: 'header'});
  await clickButton('Save on this device');
  await page.goto('about:blank');
  await page.goto(base, {waitUntil: 'networkidle0'});
  await sleep(500);
  await clickButton('Save', {within: 'header'});
  await clickButton('Restore last saved build');
  await evaluate(() => [...document.querySelectorAll('nav[aria-label="Build steps"] button')].find(b => b.textContent.includes('Graphics')).click());
  await sleep(400);
  check('a restored save keeps its graphics confirmations', (await cta())?.label === 'Continue to Construction', (await cta())?.label);
});

// 8. Touring starts with the Tour layup; unverified Mango 114 construction is held.
await run('touring and holds', async () => {
  await fresh();
  await radio('The way you ski', 'Touring');
  await selectModel('woodsman-108');
  await radio('Length in centimeters', '186');
  const lines = await sheet();
  check('Touring starts with the Tour layup (+$150)', lines.layup?.value === 'Tour' && (await total()) === '$1,249', `${lines.layup?.value} ${await total()}`);
  await fresh();
  await radio('The way you ski', 'Park');
  await selectModel('mango-114');
  check('Mango 114 custom construction needs confirmation', has(await bodyText(), 'needs ON3P confirmation'));
});

// 9. Dependent choices are normalized and explained.
await run('dependent choices', async () => {
  await fresh('#build=category=Freestyle&model=jeffrey-106&length=186&rocker=Ripper&layup=Torsion%20Bar');
  let lines = await sheet();
  check('a link keeps a valid Ripper and Torsion Bar', lines.rocker?.value === 'Ripper' && lines.layup?.value === 'Torsion Bar', `${lines.rocker?.value} ${lines.layup?.value}`);
  await radio('Length in centimeters', '191');
  let text = await bodyText();
  check('a length without Ripper returns to Signature, with a reason', has(text, 'Your build was adjusted') && has(text, 'Ripper → Signature'));
  await radio('The way you ski', 'Freeride').catch(async () => {await clickButton('Change'); await radio('The way you ski', 'Freeride');});
  await selectModel('billy-goat-118');
  await radio('Length in centimeters', '186');
  lines = await sheet();
  check('a model without Torsion Bar returns to Stock', lines.layup?.value === 'Stock', lines.layup?.value);
});

// 10. Bindings on a 98 mm ski: the first orderable Pivot 15 joins the price; a narrower brake doesn't.
await run('bindings: orderable', async () => {
  const j98 = catalog.models.find(m => m.handle === 'jeffrey-98');
  const length = j98.lengths.map(l => l.length_cm).sort((a, b) => a - b)[Math.floor(j98.lengths.length / 2)];
  await fresh(`#build=category=Freestyle&model=jeffrey-98&length=${length}`);
  for (let i = 0; i < 5; i++) await next();
  check('five advances reach Bindings with graphics confirmed', await currentStep() === 'Bindings', await currentStep());
  await radio('Bindings', pivotLabel);
  const orderable = pivot.variants.find(v => v.available && v.brake >= 98 && v.brake <= 113);
  const lines = await sheet();
  check('an orderable pair joins the build sheet', new RegExp(`${orderable.color} · ${orderable.brake} mm$`).test(lines.bindings?.value ?? '') && lines.bindings?.price !== 'Not in total', JSON.stringify(lines.bindings));
  check('…and the total', (await total()) === money(1099 + orderable.price).replace(/\.(\d)$/, '.$10'), await total());
  await radio('Binding brake width', '95 mm');
  check('a brake narrower than the ski is a visual test only', has(await bodyText(), 'Visual test only') && (await total()) === '$1,099', await total());
});

// 11. The 3D stage: every inspection view, and artwork that loads.
await run('3D views', async () => {
  await fresh('#build=category=Freeride&model=billy-goat-118&length=186');
  check('artwork loads onto the 3D skis', await artworkReady());
  const views = await radioOptions('Preview view');
  for (const view of ['Front', 'Back', 'Sidewall', '3D', 'Inside', 'Tech Specs']) check(`the ${view} view is offered`, views.some(v => v.startsWith(view)), views.join(','));
  await radio('Preview view', 'Tech Specs');
  check('Tech Specs lists the turn radius', has(await bodyText(), 'Turn radius'));
});

check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
console.log(results.join('\n'));
console.log(`\n${results.filter(r => r.startsWith('PASS')).length} passed, ${results.filter(r => r.startsWith('FAIL')).length} failed`);
await browser.close();
process.exitCode = results.some(r => r.startsWith('FAIL')) ? 1 : 0;
