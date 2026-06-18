import puppeteer, { Browser, Page } from 'puppeteer';
import { pdf2img } from '@pdfme/converter';
import {
  Template,
  Schema,
  PAGE_SIZE_PRESETS,
  cloneDeep,
  getInputFromTemplate,
} from '@pdfme/common';
import { text, table, image, barcodes, select, checkbox, radioGroup } from '@pdfme/schemas';
import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { stripVTControlCharacters } from 'node:util';
import type { MatchImageOptions } from 'vitest-image-snapshot';

const previewUrlPattern = /https?:\/\/(?:localhost|127\.0\.0\.1):\d+\/?/;

async function waitForServerReady(
  url: string,
  maxRetries = 30,
  retryInterval = 1000,
): Promise<boolean> {
  console.log(`Waiting for server to be ready at ${url}`);

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 200) {
        console.log(`Server is ready after ${i + 1} attempts!`);
        return true;
      }
      console.log(`Server returned status ${response.status}, still waiting...`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`Server not ready yet (attempt ${i + 1}/${maxRetries}): ${errorMessage}`);
    }

    await new Promise((resolve) => setTimeout(resolve, retryInterval));
  }

  console.error(`Server failed to become ready after ${maxRetries} attempts`);
  return false;
}

async function waitForPreviewUrl(
  previewProcess: ChildProcessWithoutNullStreams,
  timeoutMs = 20000,
): Promise<string> {
  return await new Promise((resolve, reject) => {
    let outputBuffer = '';

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for preview URL after ${timeoutMs}ms`));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeoutId);
      previewProcess.stdout.off('data', onStdout);
      previewProcess.stderr.off('data', onStderr);
      previewProcess.off('exit', onExit);
      previewProcess.off('error', onError);
    };

    const handleChunk = (kind: 'output' | 'error', data: Buffer | string) => {
      const text = stripVTControlCharacters(data.toString());
      const message = text.trim();
      if (message) {
        const log = kind === 'output' ? console.log : console.error;
        log(`Preview server ${kind}: ${message}`);
      }

      outputBuffer += text;
      if (outputBuffer.length > 2048) {
        outputBuffer = outputBuffer.slice(-2048);
      }

      const matchedUrl = outputBuffer.match(previewUrlPattern)?.[0];
      if (matchedUrl) {
        cleanup();
        resolve(matchedUrl.replace(/\/$/, ''));
      }
    };

    const onStdout = (data: Buffer | string) => handleChunk('output', data);
    const onStderr = (data: Buffer | string) => handleChunk('error', data);
    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      cleanup();
      reject(
        new Error(`Preview server exited before becoming ready (code=${code}, signal=${signal})`),
      );
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    previewProcess.stdout.on('data', onStdout);
    previewProcess.stderr.on('data', onStderr);
    previewProcess.on('exit', onExit);
    previewProcess.on('error', onError);
  });
}

function stopPreviewProcess(previewProcess: ChildProcessWithoutNullStreams | undefined) {
  if (!previewProcess?.pid) {
    return;
  }

  if (previewProcess.exitCode !== null || previewProcess.signalCode !== null) {
    return;
  }

  try {
    process.kill(-previewProcess.pid);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') {
      throw error;
    }
  }
}

let baseUrl = 'http://127.0.0.1:4173';
const timeout = 60000;

const isRunningLocal = process.env.LOCAL === 'true';

const snapshotOptions: MatchImageOptions = {
  allowedPixelRatio: 0.01,
  threshold: 0.2,
};

const designerSnapshotOptions: MatchImageOptions = {
  ...snapshotOptions,
  allowedPixelRatio: 0.06,
};

const replayPdfSnapshotOptions: MatchImageOptions = {
  ...snapshotOptions,
  allowedPixelRatio: 0.05,
};

const viewport = { width: 1366, height: 768 };

function getPdfSnapshotOptions(labelPrefix: string): MatchImageOptions {
  return labelPrefix === 'modified-template' || labelPrefix === 'final-form'
    ? replayPdfSnapshotOptions
    : snapshotOptions;
}

const modifiedTemplateFieldNames = {
  text: 'headline',
  table: 'lineItems',
  image: 'brandImage',
  qrcode: 'supportQr',
  select: 'status',
  checkbox: 'approved',
  radioGroup: 'selected',
} as const;

type PlaygroundStorageState = {
  template?: Template;
  inputs?: Record<string, string>[];
  mode?: 'form' | 'viewer';
};

const playgroundProjectsDbName = 'pdfme-playground-projects';
const deterministicProjectId = 'project_e2e_deterministic_template';

const cloneSchema = <T extends Schema>(schema: T, overrides: Partial<T>): T =>
  ({
    ...cloneDeep(schema),
    ...overrides,
    position: {
      ...schema.position,
      ...overrides.position,
    },
  }) as T;

function buildModifiedTemplate(): Template {
  const basePdf: Template['basePdf'] = {
    ...PAGE_SIZE_PRESETS.A4,
    padding: [20, 10, 20, 10],
  };

  return {
    basePdf,
    schemas: [
      [
        cloneSchema(text.propPanel.defaultSchema, {
          name: modifiedTemplateFieldNames.text,
          position: { x: 20, y: 20 },
        }),
        cloneSchema(table.propPanel.defaultSchema, {
          name: modifiedTemplateFieldNames.table,
          position: { x: 20, y: 40 },
          width: 150,
        }),
        cloneSchema(image.propPanel.defaultSchema, {
          name: modifiedTemplateFieldNames.image,
          position: { x: 20, y: 90 },
          readOnly: true,
        }),
        cloneSchema(barcodes.qrcode.propPanel.defaultSchema, {
          name: modifiedTemplateFieldNames.qrcode,
          position: { x: 70, y: 95 },
          readOnly: true,
        }),
        cloneSchema(select.propPanel.defaultSchema, {
          name: modifiedTemplateFieldNames.select,
          position: { x: 115, y: 98 },
        }),
        cloneSchema(checkbox.propPanel.defaultSchema, {
          name: modifiedTemplateFieldNames.checkbox,
          position: { x: 115, y: 120 },
        }),
        cloneSchema(radioGroup.propPanel.defaultSchema, {
          name: modifiedTemplateFieldNames.radioGroup,
          position: { x: 130, y: 120 },
        }),
      ],
    ],
  };
}

function buildFinalFormInputs(): Record<string, string>[] {
  const tableRows = Array.from({ length: 40 }, (_, index) => [
    `Person ${String(index + 1).padStart(2, '0')}`,
    `City ${((index % 5) + 1).toString()}`,
    `Summary ${index + 1}`,
  ]);

  return [
    {
      [modifiedTemplateFieldNames.text]: 'Filled by CI',
      [modifiedTemplateFieldNames.table]: JSON.stringify(tableRows),
      [modifiedTemplateFieldNames.select]: 'option2',
      [modifiedTemplateFieldNames.checkbox]: 'true',
      [modifiedTemplateFieldNames.radioGroup]: 'true',
    },
  ];
}

async function loadRouteWithStorage(
  page: Page,
  path: '/designer' | '/form-viewer',
  storageState: PlaygroundStorageState,
) {
  const inputs =
    storageState.inputs ??
    (storageState.template ? getInputFromTemplate(storageState.template) : []);

  await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout });
  await page.evaluate(
    async (state, resolvedInputs, id, dbName) => {
      const deleteDatabase = (name: string) =>
        new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(name);
          request.addEventListener('success', () => resolve());
          request.addEventListener('blocked', () => resolve());
          request.addEventListener('error', () => reject(request.error));
        });
      const openDatabase = (name: string) =>
        new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(name, 1);
          request.addEventListener('upgradeneeded', () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('projects')) {
              db.createObjectStore('projects', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('meta')) {
              db.createObjectStore('meta');
            }
          });
          request.addEventListener('success', () => resolve(request.result));
          request.addEventListener('error', () => reject(request.error));
        });
      const waitForTransaction = (transaction: IDBTransaction) =>
        new Promise<void>((resolve, reject) => {
          transaction.addEventListener('complete', () => resolve());
          transaction.addEventListener('error', () => reject(transaction.error));
          transaction.addEventListener('abort', () => reject(transaction.error));
        });

      await deleteDatabase(dbName);
      localStorage.removeItem('mode');

      if (state.template) {
        const db = await openDatabase(dbName);
        const now = Date.now();
        try {
          const transaction = db.transaction(['projects', 'meta'], 'readwrite');
          transaction.objectStore('projects').put({
            createdAt: now,
            id,
            inputs: resolvedInputs,
            kind: 'template',
            template: state.template,
            title: 'E2E deterministic template',
            updatedAt: now,
          });
          transaction.objectStore('meta').put(id, 'activeProjectId');
          await waitForTransaction(transaction);
        } finally {
          db.close();
        }
      }
      if (state.mode) {
        localStorage.setItem('mode', state.mode);
      }
    },
    storageState,
    inputs,
    deterministicProjectId,
    playgroundProjectsDbName,
  );

  await page.goto(`${baseUrl}${path}?project=${encodeURIComponent(deterministicProjectId)}`, {
    waitUntil: 'networkidle2',
    timeout,
  });
}

async function waitForDesignerReady(page: Page, expectedText?: string) {
  await page.waitForFunction(
    (text) => {
      const container = document.querySelector('div.flex-1.w-full');
      const hasExpectedText =
        typeof text === 'string' && text.length > 0
          ? (container?.textContent?.includes(text) ?? false)
          : true;
      const canvas = document.querySelector('.pdfme-designer-canvas');
      const spinner = document.querySelector('.pdfme-designer-root svg.lucide-loader-circle');
      const paper = document.querySelector('.pdfme-designer-canvas [style*="background-image"]');
      const titledSelectables = Array.from(
        document.querySelectorAll('.pdfme-designer-canvas .selectable[title]'),
      );
      const renderersReady = titledSelectables.every((element) => {
        const content = element.firstElementChild;
        return !(content instanceof HTMLElement) || content.dataset.pdfmeRenderReady === 'true';
      });
      const fontsLoaded = !document.fonts || document.fonts.status === 'loaded';
      return hasExpectedText && !!canvas && !spinner && !!paper && fontsLoaded && renderersReady;
    },
    { timeout },
    expectedText,
  );

  await page.evaluate(async () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (document.fonts) {
      await document.fonts.ready;
    }
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 150);
    });
  });
}

async function waitForFormReady(page: Page, expectedText?: string) {
  await page.waitForFunction(
    (text) => {
      const container = document.querySelector('div.flex-1.w-full');
      const hasExpectedText =
        typeof text === 'string' && text.length > 0
          ? (container?.textContent?.includes(text) ?? false)
          : true;
      const titledSelectables = Array.from(document.querySelectorAll('.selectable[title]'));
      const renderersReady =
        titledSelectables.length > 0 &&
        titledSelectables.every((element) => {
          const content = element.firstElementChild;
          return !(content instanceof HTMLElement) || content.dataset.pdfmeRenderReady === 'true';
        });
      const fontsLoaded = !document.fonts || document.fonts.status === 'loaded';
      return hasExpectedText && renderersReady && fontsLoaded;
    },
    { timeout },
    expectedText,
  );

  await page.evaluate(async () => {
    if (document.fonts) {
      await document.fonts.ready;
    }
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 150);
    });
  });
}

async function generatePdf(page: Page, browser: Browser): Promise<Buffer> {
  await page.waitForSelector('#generate-pdf', { timeout });
  await page.click('#generate-pdf');

  const newTarget = await browser.waitForTarget((target) => target.url().startsWith('blob:'), {
    timeout,
  });
  const newPage = await newTarget?.page();
  if (!newPage) {
    throw new Error('[generatePdf]: New page not found');
  }

  await newPage.setViewport(viewport);
  await newPage.bringToFront();
  await newPage.goto(newPage.url(), { waitUntil: 'networkidle2', timeout });

  const pdfArray = await newPage.evaluate(async () => {
    const response = await fetch(location.href);
    const buffer = await response.arrayBuffer();
    return Array.from(new Uint8Array(buffer));
  });

  const pdfBuffer = Buffer.from(pdfArray);

  await newPage.close();
  await page.bringToFront();
  return pdfBuffer;
}

async function pdfToImages(pdf: Buffer): Promise<Buffer[]> {
  const pdfBytes = new Uint8Array(pdf.buffer, pdf.byteOffset, pdf.byteLength);
  const arrayBuffers = await pdf2img(pdfBytes);
  return arrayBuffers.map((buf: ArrayBuffer) => Buffer.from(new Uint8Array(buf)));
}

async function captureAndCompareScreenshot(page: Page, label?: string) {
  await waitForDesignerReady(page);
  const screenshot = await page.screenshot({ type: 'png' });
  await expect(Buffer.from(screenshot)).toMatchImage(
    label ? { ...designerSnapshotOptions, name: label } : designerSnapshotOptions,
  );
}

async function generateAndComparePDF(page: Page, browser: Browser, labelPrefix: string) {
  const pdfBuffer = await generatePdf(page, browser);
  const pdfImages = await pdfToImages(pdfBuffer);
  const pdfSnapshotOptions = getPdfSnapshotOptions(labelPrefix);

  for (const [idx, imageBuffer] of pdfImages.entries()) {
    await expect(imageBuffer).toMatchImage({
      ...pdfSnapshotOptions,
      name: `${labelPrefix}-pdf-page-${idx}`,
    });
  }
}

describe('Playground E2E Tests', () => {
  let browser: Browser | undefined;
  let page: Page | undefined;
  let previewProcess: ChildProcessWithoutNullStreams | undefined;

  beforeAll(async () => {
    console.log('Starting preview server...');
    previewProcess = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1'], {
      detached: true,
      stdio: 'pipe',
    });

    baseUrl = await waitForPreviewUrl(previewProcess);
    const serverReady = await waitForServerReady(baseUrl);
    if (!serverReady) {
      throw new Error('Failed to start preview server in time');
    }

    browser = await puppeteer.launch({
      headless: !isRunningLocal,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      const style = document.createElement('style');
      style.textContent = `
        *,
        *::before,
        *::after {
          animation: none !important;
          transition: none !important;
          caret-color: transparent !important;
        }
      `;
      document.addEventListener('DOMContentLoaded', () => {
        document.head.appendChild(style);
      });
    });
    await page.setRequestInterception(true);
    await page.setViewport(viewport);
    page.setDefaultNavigationTimeout(timeout);

    page.on('request', (req) => {
      const ignoreDomains = ['https://media.ethicalads.io/'];
      if (ignoreDomains.some((d) => req.url().startsWith(d))) {
        req.abort();
      } else {
        req.continue();
      }
    });
  });

  afterAll(async () => {
    if (browser && !isRunningLocal) {
      await browser.close();
    }
    stopPreviewProcess(previewProcess);
  });

  it('should select Invoice template and compare PDF snapshot', async () => {
    if (!browser || !page) throw new Error('Browser/Page not initialized');

    // 1. Navigate to templates list & click on Invoice template
    await page.goto(`${baseUrl}/templates`);
    await page.waitForSelector('#template-img-invoice', { timeout });
    await page.click('#template-img-invoice');

    // 2. Wait for the designer canvas and schema renderers to settle
    await waitForDesignerReady(page, 'INVOICE');

    // 3. Screenshot & compare
    await captureAndCompareScreenshot(page, 'invoice-designer');

    // 4. Generate PDF & compare
    await generateAndComparePDF(page, browser, 'invoice');
  });

  it('should select Pedigree template and compare PDF snapshot', async () => {
    if (!browser || !page) throw new Error('Browser/Page not initialized');

    // 5. Load the Pedigree designer directly to avoid flaky list-page navigation in CI
    await page.goto(`${baseUrl}/designer?template=pedigree`, {
      waitUntil: 'networkidle2',
      timeout,
    });

    await waitForDesignerReady(page, 'Pet Name');

    // 7. Screenshot & compare
    await captureAndCompareScreenshot(page, 'pedigree-designer');

    // 8. Generate PDF & compare
    await generateAndComparePDF(page, browser, 'pedigree');
  });

  it('should load a deterministic template, generate PDF and compare, then render form inputs', async () => {
    if (!browser || !page) throw new Error('Browser/Page not initialized');

    const template = buildModifiedTemplate();

    await loadRouteWithStorage(page, '/designer', { template });
    await waitForDesignerReady(page, 'Type Something...');

    await page.click('#open-form-viewer');
    await page.waitForFunction(
      (projectId) =>
        (location.pathname === '/form-viewer' &&
          new URLSearchParams(location.search).get('project') === projectId) ||
        document.querySelector('#open-form-viewer-without-saving'),
      { timeout },
      deterministicProjectId,
    );
    const didOpenFormViewer = await page.evaluate(
      (projectId) =>
        location.pathname === '/form-viewer' &&
        new URLSearchParams(location.search).get('project') === projectId,
      deterministicProjectId,
    );
    if (!didOpenFormViewer) {
      await page.click('#open-form-viewer-without-saving');
    }
    await page.waitForFunction(
      (projectId) =>
        location.pathname === '/form-viewer' &&
        new URLSearchParams(location.search).get('project') === projectId,
      { timeout },
      deterministicProjectId,
    );
    await waitForFormReady(page);

    await page.click('#open-designer');
    await page.waitForFunction(
      (projectId) =>
        location.pathname === '/designer' &&
        new URLSearchParams(location.search).get('project') === projectId,
      { timeout },
      deterministicProjectId,
    );
    await waitForDesignerReady(page, 'Type Something...');

    await captureAndCompareScreenshot(page, 'modified-template-designer');

    await generateAndComparePDF(page, browser, 'modified-template');

    await loadRouteWithStorage(page, '/form-viewer', {
      template,
      inputs: buildFinalFormInputs(),
      mode: 'form',
    });
    await waitForFormReady(page, 'Filled by CI');

    await generateAndComparePDF(page, browser, 'final-form');
  });
});
