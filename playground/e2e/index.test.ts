import puppeteer, { Browser, Page } from 'puppeteer';
import { pdf2img } from '@pdfme/converter';
import { createRunner, parse, PuppeteerRunnerExtension } from '@puppeteer/replay';
import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { stripVTControlCharacters } from 'node:util';
import type { MatchImageOptions } from 'vitest-image-snapshot';
import templateCreationRecord from './templateCreationRecord.json';
import formInputRecord from './formInputRecord.json';

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
      const renderRoots = Array.from(
        document.querySelectorAll('.pdfme-designer-canvas .selectable[title] > div'),
      );
      const renderersReady =
        renderRoots.length > 0 &&
        renderRoots.every((element) => {
          const content = element as HTMLElement;
          return (
            content.childElementCount > 0 || (content.textContent?.trim().length ?? 0) > 0
          );
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
  const arrayBuffers = await pdf2img(pdfBytes, { imageType: 'png' });
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

    // 5. Return to template list screen
    await page.click('#templates-nav');
    await page.reload();

    // 6. Select Pedigree template
    await page.waitForSelector('#template-img-pedigree', { timeout });
    await page.click('#template-img-pedigree');

    await waitForDesignerReady(page);

    // 7. Screenshot & compare
    await captureAndCompareScreenshot(page, 'pedigree-designer');

    // 8. Generate PDF & compare
    await generateAndComparePDF(page, browser, 'pedigree');
  });

  // Skip the problematic test in CI environment
  it('should modify template, generate PDF and compare, then input form data', async () => {
    if (!browser || !page) throw new Error('Browser/Page not initialized');
    const extension = new PuppeteerRunnerExtension(browser, page, { timeout });

    // 9. Press Reset button
    await page.$eval('#reset-template', (el: Element) => (el as HTMLElement).click());

    // 10. Replay templateCreationRecord operations to add elements
    const templateCreationUserFlow = parse(templateCreationRecord);
    const templateCreationRunner = await createRunner(templateCreationUserFlow, extension);
    await templateCreationRunner.run();
    await waitForDesignerReady(page);

    // 11. Screenshot & compare
    await captureAndCompareScreenshot(page, 'modified-template-designer');

    // 12. Generate PDF & compare
    await generateAndComparePDF(page, browser, 'modified-template');

    // 13. Save locally
    await page.click('#save-local');

    // 14. Move to form viewer
    await page.click('#form-viewer-nav');
    await page.waitForFunction(
      () => {
        const container = document.querySelector('div.flex-1.w-full');
        return container ? container.textContent?.includes('Type Something...') : false;
      },
      { timeout },
    );

    // 15. Input form data
    const formInputUserFlow = parse(formInputRecord);
    const formInputRunner = await createRunner(formInputUserFlow, extension);
    await formInputRunner.run();

    // 16. Generate PDF & compare
    await generateAndComparePDF(page, browser, 'final-form');
  });
});
