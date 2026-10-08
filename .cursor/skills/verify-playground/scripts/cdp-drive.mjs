#!/usr/bin/env node
// Drive Designer zoom-out over the Chrome DevTools Protocol.
// Chrome is started by drive.sh; this process only attaches.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const skillDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(skillDir, '../../../..');
const stateDir = path.join(root, 'tmp/verify-playground');
const evidenceDir = path.join(stateDir, 'evidence');
const baseUrl = fs.readFileSync(path.join(stateDir, 'base-url'), 'utf8').trim();
const cdpPort = 9333;
const targetUrl = `${baseUrl}/designer`;

fs.mkdirSync(evidenceDir, { recursive: true });

const version = await fetch(`http://127.0.0.1:${cdpPort}/json/version`).then((response) => {
  if (!response.ok) {
    throw new Error(`CDP version endpoint returned ${response.status}`);
  }
  return response.json();
});

const browserWs = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  browserWs.addEventListener('open', resolve, { once: true });
  browserWs.addEventListener('error', () => reject(new Error('browser websocket failed')), {
    once: true,
  });
});

let nextId = 0;
const pending = new Map();
const consoleEvents = [];
const networkEvents = [];
const pageErrors = [];

browserWs.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) {
      reject(new Error(`${message.error.message || 'CDP error'}: ${JSON.stringify(message.error)}`));
    } else {
      resolve(message.result);
    }
    return;
  }

  if (message.method === 'Runtime.consoleAPICalled') {
    consoleEvents.push({
      type: message.params.type,
      text: (message.params.args || [])
        .map((arg) => arg.value ?? arg.description ?? arg.type)
        .join(' '),
    });
  } else if (message.method === 'Runtime.exceptionThrown') {
    pageErrors.push(message.params.exceptionDetails?.text || 'exception');
  } else if (message.method === 'Network.responseReceived') {
    const response = message.params.response;
    if (response?.url?.startsWith(baseUrl)) {
      networkEvents.push({ url: response.url, status: response.status });
    }
  }
});

function send(method, params = {}, sessionId) {
  const id = ++nextId;
  const payload = { id, method, params };
  if (sessionId) payload.sessionId = sessionId;
  browserWs.send(JSON.stringify(payload));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }
    }, 20000);
  });
}

async function evaluate(sessionId, expression) {
  const result = await send(
    'Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true },
    sessionId,
  );
  if (result.exceptionDetails) {
    const text = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
    throw new Error(text || 'page evaluation failed');
  }
  return result.result?.value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

await send(
  'Emulation.setDeviceMetricsOverride',
  { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false },
  sessionId,
);
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
await send('Network.enable', {}, sessionId);
await send('Page.navigate', { url: targetUrl }, sessionId);

const readyExpression = `(() => {
  const zoomRoot = document.querySelector('.pdfme-ui-zoom');
  const zoomText = zoomRoot?.innerText?.match(/\\d+%/)?.[0] || '';
  return {
    href: location.href,
    designerNav: Boolean(document.querySelector('#designer-nav')),
    designerNavClass: document.querySelector('#designer-nav')?.className || '',
    openFormViewer: Boolean(document.querySelector('#open-form-viewer')),
    canvas: Boolean(document.querySelector('.pdfme-designer-canvas')),
    textPlugin: Boolean(document.querySelector('.pdfme-designer-plugin-text')),
    zoomOut: Boolean(document.querySelector('button.pdfme-ui-zoom-out')),
    zoomText,
  };
})()`;

let ready = null;
const readyDeadline = Date.now() + 45000;
while (Date.now() < readyDeadline) {
  ready = await evaluate(sessionId, readyExpression);
  if (
    ready?.href?.startsWith(`${baseUrl}/designer`) &&
    ready.designerNav &&
    ready.openFormViewer &&
    ready.canvas &&
    ready.textPlugin &&
    ready.zoomOut &&
    ready.zoomText
  ) {
    break;
  }
  await sleep(250);
}

if (!ready?.canvas || !ready?.zoomText) {
  throw new Error(`Designer was not ready: ${JSON.stringify(ready)}`);
}

async function screenshot(name) {
  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  const file = path.join(evidenceDir, name);
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
  return file;
}

const beforePath = await screenshot('designer-before.png');
const zoomBefore = ready.zoomText;

await evaluate(
  sessionId,
  `(() => {
    const button = document.querySelector('button.pdfme-ui-zoom-out');
    if (!button) throw new Error('button.pdfme-ui-zoom-out is missing');
    if (button.disabled) throw new Error('Zoom out is disabled at ' + (document.querySelector('.pdfme-ui-zoom')?.innerText || ''));
    button.click();
    return true;
  })()`,
);

let zoomAfter = zoomBefore;
const zoomDeadline = Date.now() + 5000;
while (Date.now() < zoomDeadline) {
  zoomAfter = await evaluate(
    sessionId,
    `document.querySelector('.pdfme-ui-zoom')?.innerText?.match(/\\d+%/)?.[0] || ''`,
  );
  if (zoomAfter && zoomAfter !== zoomBefore) break;
  await sleep(100);
}

const afterPath = await screenshot('designer-after.png');
const href = await evaluate(sessionId, 'location.href');

const invoice = networkEvents.find((entry) =>
  entry.url.includes('/template-assets/invoice/template.json'),
);

const report = {
  feature: 'designer',
  action: 'click button.pdfme-ui-zoom-out (aria-label "Zoom out")',
  url: href,
  zoomBefore,
  zoomAfter,
  designerNavActive: String(ready.designerNavClass).includes('border-green-500'),
  invoiceTemplateStatus: invoice?.status ?? null,
  screenshots: {
    before: path.relative(root, beforePath),
    after: path.relative(root, afterPath),
  },
  console: consoleEvents.slice(0, 200),
  pageErrors: pageErrors.slice(0, 50),
  network: networkEvents.slice(0, 200),
};

const reportPath = path.join(evidenceDir, 'designer-drive.json');
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (zoomBefore !== '100%' || zoomAfter !== '75%') {
  throw new Error(
    `Expected Designer zoom 100% -> 75% after Zoom out, got ${zoomBefore} -> ${zoomAfter}. Report: ${reportPath}`,
  );
}

console.log(`drove designer zoom ${zoomBefore} -> ${zoomAfter}`);
console.log(reportPath);
browserWs.close();
