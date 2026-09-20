import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const puppeteer = require('../../playground/node_modules/puppeteer');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const framesDir = path.join(__dirname, 'issue-1397-browser-frames');
await fs.rm(framesDir, { recursive: true, force: true });
await fs.mkdir(framesDir, { recursive: true });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: '/usr/local/bin/google-chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1000 });

const frame = async (name) => {
  await page.screenshot({ path: path.join(framesDir, `${name}.png`), fullPage: true });
};

const dragPluginToCanvas = async (pluginSelector, x, y) => {
  let pluginBox = await (await page.$(pluginSelector))?.boundingBox();
  pluginBox ??= await (await page.$('.pdfme-designer-left-sidebar button'))?.boundingBox();
  const paperBox =
    (await (await page.$('.pdfme-ui-paper'))?.boundingBox()) ??
    (await (await page.$('[data-pdfme-render-ready]'))?.boundingBox()) ??
    { x: 160, y: 92, width: 445, height: 635 };
  if (!pluginBox) throw new Error(`missing ${pluginSelector}`);
  await page.mouse.move(pluginBox.x + pluginBox.width / 2, pluginBox.y + pluginBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(paperBox.x + x, paperBox.y + y, { steps: 12 });
  await page.mouse.up();
  await wait(500);
};

try {
  await page.goto('http://127.0.0.1:5173/', {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });
  await page.evaluate(async () => {
    const project = {
      id: 'triage-1397-two-page',
      title: 'Triage 1397 two-page',
      kind: 'template',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      inputs: [{}, {}],
      template: {
        basePdf: { width: 210, height: 297, padding: [20, 10, 20, 10] },
        schemas: [[], []],
      },
    };
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('pdfme-playground-projects', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['projects', 'meta'], 'readwrite');
        tx.objectStore('projects').put(project);
        tx.objectStore('meta').put(project.id, 'activeProjectId');
        tx.oncomplete = () => {
          db.close();
          resolve(undefined);
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  await page.goto('http://127.0.0.1:5173/designer?project=triage-1397-two-page', {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });
  await page.waitForSelector('.pdfme-designer-plugin-text', { timeout: 30000 });
  await page.waitForSelector('.pdfme-ui-context-menu', { timeout: 30000 });
  await wait(1500);
  await frame('001-loaded');

  await dragPluginToCanvas('.pdfme-designer-plugin-text', 140, 160);
  await frame('002-page1-field');

  await page.click('.pdfme-ui-page-next');
  await wait(600);
  await dragPluginToCanvas('.pdfme-designer-plugin-text', 160, 160);
  await dragPluginToCanvas('.pdfme-designer-plugin-text', 260, 240);
  await frame('003-page2-fields');

  await page.click('.pdfme-ui-page-prev');
  await wait(600);
  await frame('004-back-page1-before-undo');

  await page.keyboard.down(process.platform === 'darwin' ? 'Meta' : 'Control');
  await page.keyboard.press('KeyZ');
  await page.keyboard.up(process.platform === 'darwin' ? 'Meta' : 'Control');
  await wait(1000);
  await frame('005-page1-after-undo');

  const summary = await page.evaluate(() => ({
    bodyText: document.body.innerText,
    fieldListText: [...document.querySelectorAll('.pdfme-designer-right-sidebar *')]
      .map((el) => el.textContent?.trim())
      .filter(Boolean)
      .join('\n')
      .slice(0, 1000),
    pageIndicator: document.body.innerText.match(/\b\d+\/\d+\b/)?.[0] ?? null,
  }));
  await fs.writeFile(path.join(__dirname, 'issue-1397-browser-summary.json'), JSON.stringify(summary, null, 2));
} finally {
  await browser.close();
}

const listFile = path.join(framesDir, 'frames.txt');
const frameNames = [
  '001-loaded',
  '002-page1-field',
  '003-page2-fields',
  '004-back-page1-before-undo',
  '005-page1-after-undo',
];
await fs.writeFile(
  listFile,
  frameNames
    .map((name) => `file '${path.join(framesDir, `${name}.png`).replaceAll("'", "'\\''")}'\nduration 1.4`)
    .join('\n') + `\nfile '${path.join(framesDir, '005-page1-after-undo.png').replaceAll("'", "'\\''")}'\n`,
);
execFileSync('ffmpeg', [
  '-y',
  '-f',
  'concat',
  '-safe',
  '0',
  '-i',
  listFile,
  '-vf',
  'scale=1280:-2,format=yuv420p',
  '-movflags',
  '+faststart',
  path.join(__dirname, 'evidence-1397-designer-undo-browser.mp4'),
]);

console.log(path.join(__dirname, 'evidence-1397-designer-undo-browser.mp4'));
