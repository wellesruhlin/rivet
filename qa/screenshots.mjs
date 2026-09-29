// Presentation screenshots of both apps. Start both dev servers first.
// Usage: node qa/screenshots.mjs outDir [name,name]   (names limit which shots are taken)
import {launchBrowser} from './browser.mjs';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';

const out = process.argv[2];
await mkdir(out, {recursive: true});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PRAXIS = 'http://127.0.0.1:5181/';
const ON3P = 'http://127.0.0.1:5180/';
const desktop = {width: 1440, height: 900, deviceScaleFactor: 2};
const mobile = {width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true};

const browser = await launchBrowser(['--disable-lcd-text', '--force-color-profile=srgb', '--hide-scrollbars']);

const only = process.argv[3]?.split(',');
async function shoot(name, viewport, url, steps = async () => {}) {
  if (only && !only.includes(name)) return;
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.goto(url, {waitUntil: 'networkidle0'});
  await page.evaluate(() => localStorage.clear());
  await page.goto(url, {waitUntil: 'networkidle0'});
  await sleep(1400);
  await steps(page);
  await sleep(1000);
  await page.screenshot({path: path.join(out, `${name}.png`)});
  await page.close();
  console.log('saved', name);
}
const click = async (page, selector, text) => {
  await page.evaluate((s, t) => {
    const el = [...document.querySelectorAll(s)].find(e => !t || e.textContent.trim().includes(t));
    el.scrollIntoView({block: 'center'});
    el.click();
  }, selector, text);
  await sleep(600);
};
const praxisBuild = async (page, {veneer = 'Red Gum', art = 'Old Growth'} = {}) => {
  await click(page, '.cfg-card-category', 'Freeride');
  await page.select('.cfg-select select', 'gpo');
  await sleep(300);
  await click(page, '.cfg-length-chip', '182');
  await click(page, '.cfg-primary-button');
  await click(page, '.cfg-swatch', veneer);
  await page.type('.cfg-search input', art);
  await sleep(300);
  await click(page, '.cfg-art-tile', art);
  await page.evaluate(() => {
    const input = document.querySelector('.cfg-search input');
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(input, '');
    input.dispatchEvent(new Event('input', {bubbles: true}));
  });
  await sleep(300);
  await page.evaluate(() => document.querySelector('.cfg-options').scrollTo(0, 0));
};

await shoot('praxis-01-home', desktop, PRAXIS);
await shoot('praxis-02-collection', desktop, `${PRAXIS}#/skis`, async page => page.evaluate(() => window.scrollTo(0, document.querySelector('.px-toolbar').getBoundingClientRect().top + scrollY - 68 - 28)));
await shoot('praxis-03-product-specs', desktop, `${PRAXIS}#/skis/gpo`, async page => {
  await click(page, '.px-length-row button', '182');
  await page.evaluate(() => document.querySelector('.px-specs').scrollIntoView({block: 'start'}));
  await page.evaluate(() => window.scrollBy(0, -68));
});
await shoot('praxis-04-configurator-look', desktop, `${PRAXIS}#/custom`, page => praxisBuild(page));
await shoot('praxis-05-configurator-technical', desktop, `${PRAXIS}#/custom`, async page => {
  await praxisBuild(page);
  await click(page, '.cfg-segmented.is-glass [role=radio]', 'Technical');
  await sleep(800);
});
await shoot('praxis-06-bag', desktop, `${PRAXIS}#/custom`, async page => {
  await praxisBuild(page);
  await click(page, '.cfg-step-nav button', 'Rider');
  await click(page, '.cfg-card', 'Expert');
  await click(page, '.cfg-step-nav button', 'Review');
  await click(page, '.cfg-primary-button');
  await page.evaluate(() => (location.hash = '#/skis/exp'));
  await sleep(700);
  await click(page, '.px-length-row button', '183');
  await click(page, '.px-buy button[type=submit]');
  await page.evaluate(() => (location.hash = '#/bag'));
  await sleep(4000);
});
await shoot('praxis-07-mobile-home', mobile, PRAXIS);
await shoot('praxis-08-mobile-configurator', mobile, `${PRAXIS}#/custom`, async page => {
  await praxisBuild(page, {veneer: 'Maple', art: 'Mountain Glow'});
  await page.evaluate(() => {
    document.activeElement?.blur();
    window.scrollTo(0, 0);
  });
});
await shoot('on3p-weight-by-layup', desktop, ON3P, async page => {
  await click(page, '.cfg-card-category', 'Freeride');
  await page.select('.cfg-select select', 'woodsman-108');
  await sleep(300);
  await click(page, '.cfg-length-chip', '181');
  await click(page, '.cfg-primary-button');
  await click(page, '.cfg-primary-button');
  await click(page, '.cfg-option-button', 'Tour');
  await page.evaluate(() => document.querySelector('.cfg-options').scrollTo(0, 0));
});
await browser.close();
