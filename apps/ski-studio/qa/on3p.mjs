// Browser pass over the ON3P configurator. Start `npm run dev:on3p` first.
// Usage: node qa/on3p.mjs [baseUrl]   (Chrome from CHROME_PATH, else the default Windows install)
import puppeteer from 'puppeteer-core';

const base = process.argv[2] || 'http://127.0.0.1:5180/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);

const browser = await puppeteer.launch({executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => m.type() === 'error' && errors.push(m.text()));
await page.setViewport({width: 1440, height: 900});

const click = async (selector, text) => {
  const ok = await page.evaluate((s, t) => {
    const el = [...document.querySelectorAll(s)].find(e => !t || e.textContent.trim().includes(t));
    if (!el) return false;
    el.click();
    return true;
  }, selector, text);
  if (!ok) throw new Error(`missing ${selector} ${text || ''}`);
  await sleep(250);
};
const text = s => page.$eval(s, e => e.textContent.trim()).catch(() => null);
const total = () => text('.cfg-bar-amount');
const fresh = async () => {
  await page.goto(base, {waitUntil: 'networkidle0'});
  await page.evaluate(() => localStorage.clear());
  await page.goto(base, {waitUntil: 'networkidle0'});
  await sleep(500);
};
const shape = async (category, model, length) => {
  await click('[role=radio]', category);
  await page.select('.cfg-select select', model);
  await sleep(200);
  if (length) await click('.cfg-length-chip', String(length));
};

// 1. Locked steps and the CTA before a shape exists
await fresh();
check('CTA disabled until shape is complete', await page.$eval('.cfg-primary-button', b => b.disabled));
check('Later steps locked', await page.$$eval('.cfg-step-nav button', b => b.slice(1).every(x => x.disabled)));
check('Sample state labelled', (await text('.cfg-nameplate h2')) === 'Build your pair');

// 2. Dependency repair with explanation, no silent size substitution
await shape('Freeride', 'woodsman-108', 191);
await page.click('.cfg-primary-button');
await sleep(300);
await page.click('.cfg-primary-button');
await sleep(300);
await click('.cfg-option-button', 'Torsion Bar');
await click('.cfg-step-nav button', 'Shape');
await click('[role=radio]', 'Park');
await page.select('.cfg-select select', 'oski-102');
await sleep(300);
const notice = await text('.cfg-adjustment');
check('Adjustment notice explains cleared length', /191 cm cleared/.test(notice || ''), notice?.slice(0, 90));
check('Length not auto-substituted', !(await page.$('.cfg-length-chip[aria-checked=true]')));
check('Torsion Bar reset for Oski', /Layup: Torsion Bar → Stock/.test(notice || ''));
await click('.cfg-adjustment .cfg-icon-button');
check('Adjustment dismissible', !(await page.$('.cfg-adjustment')));

// 3. Keyboard radios: arrow keys move and select lengths
await click('.cfg-length-chip', '176');
await page.focus('.cfg-length-chip[aria-checked=true]');
await page.keyboard.press('ArrowRight');
await sleep(200);
check('ArrowRight selects next length', (await text('.cfg-length-chip[aria-checked=true]')) === '181');
check('Roving tabindex (one tab stop)', (await page.$$eval('.cfg-length-row [role=radio]', b => b.filter(x => x.tabIndex === 0).length)) === 1);

// 4. Billy Goat 108 includes a required skin clip at no cost
await fresh();
await shape('Freeride', 'billy-goat-108', 186);
for (let i = 0; i < 2; i++) {
  await page.click('.cfg-primary-button');
  await sleep(300);
}
const clip = await page.$$eval('.cfg-switch-row', rows => {
  const row = rows.find(r => r.textContent.includes('Skin clip'));
  const input = row.querySelector('input');
  return {checked: input.checked, disabled: input.disabled, price: row.querySelector('.cfg-switch-price').textContent};
});
check('Billy Goat 108 skin clip required and free', clip.checked && clip.disabled && clip.price === 'Included', JSON.stringify(clip));
check('Billy Goat 108 total stays $1,099', (await total()) === '$1,099');

// 4b. The stage weight follows the layup
await fresh();
await shape('Freeride', 'woodsman-108', 181);
check('Stock weight at 181 cm', /Stock weight\s*2,040/.test((await text('.cfg-readout')) ?? ''), await text('.cfg-readout'));
await page.click('.cfg-primary-button');
await sleep(300);
await page.click('.cfg-primary-button');
await sleep(300);
await click('.cfg-option-button', 'Tour');
check('Tour layup lowers the weight estimate', /Est\. weight · Tour\s*1,640–1,715/.test((await text('.cfg-readout')) ?? ''), await text('.cfg-readout'));
await click('.cfg-option-button', 'Torsion Bar');
check('Metal layup raises it', /2,115–2,140/.test((await text('.cfg-readout')) ?? ''));

// 5. Mango 114 custom construction held for confirmation
await fresh();
await shape('Park', 'mango-114', 181);
check('Mango 114 rule note shown', /confirm/i.test((await text('.cfg-note-caution')) || ''));
for (let i = 0; i < 2; i++) {
  await page.click('.cfg-primary-button');
  await sleep(300);
}
check('Mango 114 non-stock layups disabled', await page.$$eval('.cfg-option-button', b => b.filter(x => x.disabled).length === 5));

// 6. Touring starts with Tour layup (+$150)
await fresh();
await shape('Touring', 'woodsman-108', 181);
check('Touring total includes Tour layup', (await total()) === '$1,249', await total());

// 7. Wood topsheet surcharge, stable gallery, base edit from the build sheet
await fresh();
await shape('Freeride', 'woodsman-108', 181);
await page.click('.cfg-primary-button');
await sleep(400);
const before = await page.$$eval('.cfg-art-tile-name', n => n.map(x => x.textContent));
await click('.cfg-art-tile', 'Ivory');
const after = await page.$$eval('.cfg-art-tile-name', n => n.map(x => x.textContent));
check('Gallery order unchanged after selection', JSON.stringify(before) === JSON.stringify(after));
await page.type('.cfg-search input', 'Wood Logo');
await sleep(300);
await click('.cfg-art-tile', 'Wood Logo');
check('Wood topsheet adds $250', (await total()) === '$1,349', await total());
check('Wood lead-time hint shown', /50 days/.test(await page.$eval('.cfg-panel', p => p.textContent)));
await page.click('.cfg-bar-price');
await sleep(400);
check('Build sheet opens with focus inside', await page.evaluate(() => document.activeElement?.id === 'cfg-build-sheet'));
await click('.cfg-sheet-group dd button', 'Herringburn');
await sleep(1200);
check('Base edit opens Base gallery', (await text('.cfg-tabs [aria-checked=true]')) === 'Base');
check('Base edit flips the stage', !!(await page.$('.cfg-ski-flip.is-flipped')));
await page.click('.cfg-bar-price');
await sleep(300);
await page.keyboard.press('Escape');
await sleep(300);
check('Escape closes sheet, focus returns to toggle', !(await page.$('.cfg-build-sheet')) && (await page.evaluate(() => document.activeElement?.classList.contains('cfg-bar-price') || document.activeElement?.classList.contains('cfg-bar-summary'))));

// 8. Review gating: jumping ahead doesn't mark sections reviewed
await click('.cfg-step-nav button', 'Review');
check('Jumping to Review leaves sections unreviewed', /1 \/ 3 reviewed/.test((await text('.cfg-bar-progress')) || ''), await text('.cfg-bar-progress'));

// 9. Save and restore
await page.click('.cfg-primary-button');
await sleep(300);
await click('.cfg-save-actions .cfg-primary-button');
check('Saved confirmation', (await text('#cfg-dialog-title')) === 'Build saved');
await click('.cfg-dialog-body .cfg-primary-button');
await click('.cfg-step-nav button', 'Shape');
await click('[role=radio]', 'Park');
await page.click('.cfg-header-actions .cfg-outline-button');
await sleep(300);
await click('.cfg-save-actions .cfg-outline-button', 'Restore');
await sleep(300);
check('Restore brings back Woodsman 108', (await text('.cfg-nameplate h2')) === 'Woodsman 108');
check('Restore keeps wood price', (await total()) === '$1,349');

// 10. Share link roundtrip
await page.evaluate(() => navigator.clipboard?.writeText && (navigator.clipboard.writeText = () => Promise.resolve()));
await page.click('.cfg-header-actions .cfg-outline-button');
await sleep(300);
await click('.cfg-save-actions .cfg-outline-button', 'Copy build link');
await sleep(300);
const url = page.url();
check('Share writes #build link', url.includes('#build=') && url.includes('woodsman-108'));
await page.goto('about:blank');
await page.goto(url, {waitUntil: 'networkidle0'});
await sleep(500);
check('Link reload restores the build', (await text('.cfg-nameplate h2')) === 'Woodsman 108' && (await total()) === '$1,349');
check('Link reload starts unreviewed', /0 \/ 3 reviewed/.test((await text('.cfg-bar-progress')) || ''));

// 11. Zoom and drag to pan
await page.click('.cfg-zoom button[aria-label="Zoom in"]');
await page.click('.cfg-zoom button[aria-label="Zoom in"]');
await sleep(600);
const box = await (await page.$('.cfg-stage-viewport')).boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 160, {steps: 8});
await page.mouse.up();
const panY = await page.$eval('.cfg-stage-zoom', e => e.style.getPropertyValue('--pan-y'));
check('Drag pans the zoomed pair', parseFloat(panY) > 100, panY);
await click('.cfg-segmented.is-glass [role=radio]', 'Technical');
check('Technical view resets zoom', (await page.$eval('.cfg-stage-zoom', e => e.style.getPropertyValue('--zoom'))) === '1');

check('No console errors', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(results.join('\n'));
const failed = results.filter(r => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
