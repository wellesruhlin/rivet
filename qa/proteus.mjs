// Browser pass over the Proteus configurator: every step, the 3D views, custom artwork,
// links and saves, and the phone layout. Start `npm run dev:proteus` first.
// Usage: node qa/proteus.mjs [baseUrl]   (Chrome from CHROME_PATH, else the default Windows install)
import {mkdtemp, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {launchBrowser} from './browser.mjs';
import sharp from 'sharp';

const base = process.argv[2] || 'http://127.0.0.1:5182/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);

// A small landscape artwork in the 68 × 13 template shape (well under print resolution).
const dir = await mkdtemp(join(tmpdir(), 'proteus-qa-'));
const artPath = join(dir, 'qa-art.png');
await writeFile(artPath, await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1360" height="260"><rect width="100%" height="100%" fill="#f7c548"/><circle cx="200" cy="130" r="90" fill="#1b2a41"/><rect x="900" y="40" width="300" height="180" fill="#2ec4b6"/></svg>`)).png().toBuffer());

const browser = await launchBrowser(['--enable-unsafe-swiftshader']);
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => m.type() === 'error' && errors.push(m.text()));
page.on('response', r => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
await page.setViewport({width: 1440, height: 900});
await page.evaluateOnNewDocument(() => {
  if (navigator.clipboard) navigator.clipboard.writeText = () => Promise.resolve();
  // Keep the downloaded build sheet's text for the checks below.
  const create = URL.createObjectURL;
  URL.createObjectURL = blob => {
    blob.text?.().then(text => {window.__sheet = text;});
    return create.call(URL, blob);
  };
});

const click = async (selector, text) => {
  const ok = await page.evaluate((s, t) => {
    const el = [...document.querySelectorAll(s)].find(e => !t || e.textContent.trim().includes(t) || e.getAttribute('aria-label')?.includes(t));
    if (!el) return false;
    el.scrollIntoView({block: 'center'});
    el.click();
    return true;
  }, selector, text);
  if (!ok) throw new Error(`missing ${selector} ${text ?? ''}`);
  await sleep(350);
};
const type = async (selector, value) => {
  await page.evaluate((s, v) => {
    const input = document.querySelector(s);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, v);
    input.dispatchEvent(new Event('input', {bubbles: true}));
    input.dispatchEvent(new Event('change', {bubbles: true}));
  }, selector, value);
  await sleep(400);
};
const text = s => page.$eval(s, e => e.textContent.trim()).catch(() => null);
const texts = s => page.$$eval(s, list => list.map(e => e.textContent.trim()));
const amount = () => page.$eval('.cfg-bar-amount', e => e.childNodes[0].textContent.trim()).catch(() => null);
const next = async () => {
  await page.click('.cfg-primary-button');
  await sleep(600);
};
const settled = () => page.waitForFunction(() => {
  const root = document.querySelector('.cfg-3d'), canvas = document.querySelector('.cfg-3d-canvas canvas');
  return root?.dataset.artwork === 'ready' && canvas?.dataset.transition !== 'turning';
}, {timeout: 20000}).then(() => true, () => false);
const view = async label => {
  await click('.cfg-3d-footer [role=radio]', label);
  await sleep(500);
};
const currentView = () => text('.cfg-3d-footer [aria-checked=true]');
const heading = () => text('.cfg-3d-heading');

await page.goto(base, {waitUntil: 'networkidle0'});
await page.evaluate(() => localStorage.clear());
await page.goto(base, {waitUntil: 'networkidle0'});
await sleep(800);

// 1. Size: never chosen for you; the chart fits a rider weight
check('Brand header and six steps', (await text('.pt-wordmark')) === 'Proteus' && (await texts('.cfg-step-name')).join(',') === 'Size,Graphics,Build,Camber,Extras,Review');
check('Board and artwork render in 3D', !!(await page.$('.cfg-3d-canvas canvas')) && (await settled()));
check('No size is chosen for you', (await page.$eval('.cfg-primary-button', b => b.disabled)) && /Select your size/.test(await text('.cfg-primary-button')));
check('Starting estimate is the standard board', (await amount()) === '$779', await amount());
await type('.pt-weight-input input', '165');
check('Rider weight marks the sizes the chart fits', (await page.$$('.pt-fit-dot')).length === 9 && /151, 154, 157/.test(await text('.pt-fit-summary')));
await click('.pt-length-chip', '157');
check('Size shows its published specs', /121 cm/.test(await text('.pt-size-specs')) && /7\.5 m/.test(await text('.pt-size-specs')));
check('Build bar names the board and size', (await text('.cfg-bar-model')) === 'Mt. Fuji · 157', await text('.cfg-bar-model'));
check('Size unlocks the next step', /Continue to Graphics/.test(await text('.cfg-primary-button')));

// 2. Graphics
await next();
check('Gallery pages 53 designs', (await page.$$('.pt-art-grid .cfg-art-tile')).length === 12 && /53 designs/.test(await text('.cfg-gallery-meta')));
check('Opens on Mt. Fuji in Tea House', /Mt\. Fuji · Tea House/.test(await heading()));
check('Ready-to-ride boards in this colorway are pointed out', /148 Flex Mt\. Fuji/.test((await texts('.cfg-hint')).join(' ')));
await type('.pt-search input', 'shark');
check('Search finds a design', (await page.$$('.pt-art-grid .cfg-art-tile')).length === 1);
await click('.pt-art-grid .cfg-art-tile', 'Sharknado');
check('A collaboration adds $25', (await amount()) === '$804', await amount());
check('Colorways of the chosen design', (await page.$$('.pt-colorway')).length === 4);
await click('.pt-colorway', 'Yang');
check('Colorway updates the board', /Sharknado · Yang/.test(await heading()) && (await settled()));
await view('Back');
check('Back view shows the design’s base', (await settled()) && /design’s own colors/.test(await heading()));

// 3. Build and the Inside view
await next();
check('Build step opens the Inside view', (await currentView()) === 'Inside' && (await settled()));
check('Inside legend lists ten layers', (await page.$$('.cfg-3d-chip')).length === 10);
await click('.cfg-3d-chip', 'Adjustable Camber');
check('A layer explains itself', /one screw per end/.test((await text('.cfg-3d-layer-card')) ?? ''));
await click('.pt-build', 'Stiff');
check('Stiff build adds $45', (await amount()) === '$819', await amount());
check('Layup follows the build', /19 oz triax/.test(await text('.pt-layup')) && (await texts('.cfg-3d-chip')).some(t => t.startsWith('03Stiff build glass')));

// 4. Camber
await next();
check('Camber step opens the side profile', (await currentView()) === 'Camber' && (await settled()));
check('Six Proteus settings', (await page.$$('.pt-preset')).length === 6);
await click('.pt-preset', 'Full S Curve');
check('Full S Curve: nose rocker, tail camber', /15 mm rocker/.test(await text('.pt-screw:first-child output')) && /Full S Curve/.test(await heading()));
await type('#pt-screw-nose', '70');
check('Screws set each end on their own', /Your own setting/.test(await text('.pt-preset-text')) && /Custom/.test(await heading()));
check('Camber never changes the price', (await amount()) === '$819');
await click('.pt-reset');
check('Back to full camber', (await page.$eval('#pt-screw-nose', i => i.value)) === '0' && /Full Camber/.test(await heading()));
await click('.pt-preset', 'Mid S Curve');

// 5. Extras
await next();
check('Extras open the sidewall', (await currentView()) === 'Sidewall');
await click('.cfg-switch-row', 'Snow Stopper');
check('Snow Stopper adds $25', (await amount()) === '$844', await amount());
await type('#pt-sidewall-text', 'Hi there!');
check('Sidewall text keeps letters and numbers', (await page.$eval('#pt-sidewall-text', i => i.value)) === 'Hithere' && /Letters and numbers only/.test((await texts('.pt-sidewall .cfg-hint')).join(' ')));
check('Sidewall text on the 3D board', (await settled()) && /Sidewall text: Hithere/.test(await heading()));

// 6. Review, link and build sheet
await next();
const lines = await texts('.cfg-price-line');
check('Review prices every line', ['Proteus snowboard$749', 'Collaboration graphic · Sharknado$25', 'Stiff build$45', 'Snow Stopper$25', 'Adjustment WrenchIncluded'].every(l => lines.includes(l)), lines.join(' | '));
check('Review total', (await text('.cfg-price-total strong')) === '$844');
check('Camber setting reviewed, unpriced', (await texts('.cfg-review-rows div')).some(t => t === 'Camber settingMid S Curve'));
await click('.cfg-review-actions button', 'Copy build link');
const link = page.url();
check('Build link carries the board', /design=sharknado/.test(link) && /colorway=Yang/.test(link) && /nose=60/.test(link) && /sidewallText=Hithere/.test(link) && !/riderWeight/.test(link));
await click('.cfg-review-actions button', 'Download build sheet');
await sleep(300);
const sheet = await page.evaluate(() => window.__sheet ?? '');
check('Build sheet text', /PROTEUS SNOWBOARDS — BUILD SHEET/.test(sheet) && /Reference total: \$844/.test(sheet) && /Sidewall text: Hithere/.test(sheet));
const shared = await browser.newPage();
await shared.goto(link, {waitUntil: 'networkidle0'});
await sleep(900);
check('Shared link restores the build', (await shared.$eval('.cfg-bar-amount', e => e.childNodes[0].textContent.trim())) === '$844' && (await shared.$eval('.cfg-bar-model', e => e.textContent.trim())) === 'Sharknado · 157');
await shared.close();

// 7. Save and restore
await click('.cfg-header-actions button', 'Save');
await click('.cfg-dialog button', 'Save on this device');
check('Saved on this device', /Build saved/.test((await text('.cfg-dialog')) ?? ''));
await click('.cfg-dialog button', 'Back to your board');

// 8. Every view renders
for (const label of ['Front', 'Back', 'Sidewall', '3D', 'Camber', 'Inside', 'Tech Specs']) {
  await view(label);
  const ok = await settled();
  if (label === 'Tech Specs') check('Tech Specs lists the published size', ok && /Effective edge121 cm/.test(await text('.cfg-3d-tech')));
  else check(`${label} view renders`, ok);
}

// 9. Custom artwork and base colors
await click('.cfg-step-nav button', 'Graphics');
await click('.pt-custom-tile');
check('Custom graphics add the $50 processing fee', (await amount()) === '$869', await amount());
const input = await page.$('#pt-art-input');
await input.uploadFile(artPath);
await sleep(1500);
check('Upload shows on the topsheet', /Your artwork · qa-art\.png/.test(await heading()) && (await settled()));
check('Low resolution is flagged', /under Proteus’s 72 ppi minimum/.test((await texts('.cfg-note')).join(' ')));
await click('[aria-label="Nose band color"] .pt-color', 'Royal');
await click('[aria-label="Logo block color"] .pt-color', 'Yellow');
check('Base colors in Proteus’s template', (await text('.pt-custom-block + .pt-custom-block .cfg-field-note')) === 'Royal · Yellow · Charcoal' && (await currentView()) === 'Back' && (await settled()));
await click('.pt-upload-row button[aria-label="Remove artwork"]');
await click('.cfg-step-nav button', 'Review');
check('Missing artwork is asked for before ordering', /upload your artwork/.test((await text('.cfg-review-missing')) ?? ''));

// 10. Restore the saved build
await page.goto(base, {waitUntil: 'networkidle0'});
await sleep(700);
await click('.cfg-header-actions button', 'Save');
await click('.cfg-dialog button', 'Restore last saved build');
await sleep(600);
check('Restores the saved board', (await amount()) === '$844' && (await text('.cfg-bar-model')) === 'Sharknado · 157');

// 11. Phone
await page.setViewport({width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
await page.goto(base, {waitUntil: 'networkidle0'});
await page.evaluate(() => localStorage.clear());
await page.goto(base, {waitUntil: 'networkidle0'});
await sleep(900);
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('Phone: no sideways scroll on Size', (await overflow()) <= 0, `${await overflow()} px`);
await click('.pt-length-chip', '154');
await next();
await next();
await next();
check('Phone: camber tuner fits', (await overflow()) <= 0 && (await page.$$('.pt-preset')).length === 6, `${await overflow()} px`);

check('No console or network errors', errors.length === 0, errors.slice(0, 5).join(' | '));
await browser.close();
console.log(results.join('\n'));
const failed = results.filter(r => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
