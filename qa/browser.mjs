// One launch for every QA script: Chrome from CHROME_PATH (default: the Windows install).
// CHROME_NO_SANDBOX=1 adds --no-sandbox for containers that run as root.
import puppeteer from 'puppeteer-core';

export const launchBrowser = (args = []) =>
  puppeteer.launch({
    executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: [...args, ...(process.env.CHROME_NO_SANDBOX ? ['--no-sandbox'] : [])],
  });
