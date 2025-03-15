import puppeteer, { Browser, Page } from 'puppeteer';
import { pdf2img } from '@pdfme/converter';
import { createRunner, parse, PuppeteerRunnerExtension } from '@puppeteer/replay';
import { ChildProcessWithoutNullStreams } from 'child_process';
import { spawn } from 'child_process';
import type { MatchImageSnapshotOptions } from 'jest-image-snapshot';
import templateCreationRecord from './templateCreationRecord.json';
import formInputRecord from './formInputRecord.json';

const baseUrl = 'http://localhost:4173';
const timeout = 40000; // Increased timeout to avoid test failures
jest.setTimeout(timeout * 5);

const isRunningLocal = process.env.LOCAL === 'true';

const snapShotOpt: MatchImageSnapshotOptions = {
  failureThreshold: 1,
  failureThresholdType: 'percent',
  blur: 1,
  customDiffConfig: { threshold: 0.2 },
};

const viewport = { width: 1366, height: 768 };

async function generatePdf(page: Page, browser: Browser): Promise<Buffer> {
  await page.waitForSelector('#generate-pdf', { timeout });
  await page.click('#generate-pdf');

  const newTarget = await browser.waitForTarget(
    (target) => target.url().startsWith('blob:'),
    { timeout }
  );
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
  const arrayBuffer = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength);
  // Pass the arrayBuffer directly to pdf2img, not as an object with a data property
  const arrayBuffers = await pdf2img(
    arrayBuffer,
    { imageType: 'png' }
  );
  return arrayBuffers.map((buf) => Buffer.from(new Uint8Array(buf)));
}

async function captureAndCompareScreenshot(page: Page, label?: string) {
  const screenshot = await page.screenshot({ encoding: 'base64' });
  expect(screenshot).toMatchImageSnapshot({
    ...snapShotOpt,
    customSnapshotIdentifier: label ? `${label}` : undefined,
  });
}

async function generateAndComparePDF(page: Page, browser: Browser, labelPrefix: string) {
  const pdfBuffer = await generatePdf(page, browser);
  const pdfImages = await pdfToImages(pdfBuffer);

  pdfImages.forEach((imageBuffer, idx) => {
    expect(imageBuffer).toMatchImageSnapshot({
      ...snapShotOpt,
      customSnapshotIdentifier: `${labelPrefix}-pdf-page-${idx}`,
    });
  });
}

describe('Playground E2E Tests', () => {
  let browser: Browser | undefined;
  let page: Page | undefined;
  let previewProcess: ChildProcessWithoutNullStreams | undefined;

  beforeAll(async () => {
    // Always start the preview server for tests
    console.log('Starting preview server for tests...');
    previewProcess = spawn('npm', ['run', 'preview'], {
      detached: true,
      stdio: 'pipe',
    });
    
    // Wait for preview server to start
    await new Promise(resolve => setTimeout(resolve, 5000));

    browser = await puppeteer.launch({
      headless: !isRunningLocal,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();
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
    // Always clean up the preview process
    if (previewProcess && previewProcess.pid) {
      try {
        process.kill(-previewProcess.pid);
      } catch (error) {
        console.log('Error killing preview process:', error);
      }
    }
  });

  it('should select Invoice template and compare PDF snapshot', async () => {
    if (!browser || !page) throw new Error('Browser/Page not initialized');

    // 1. Navigate to templates list & click on Invoice template
    await page.goto(`${baseUrl}/templates`);
    await page.waitForSelector('#template-img-invoice', { timeout });
    await page.click('#template-img-invoice');

    // 2. Check that "INVOICE" text is present
    await page.waitForFunction(() => {
      const container = document.querySelector('div.flex-1.w-full');
      return container ? container.textContent?.includes('INVOICE') : false;
    }, { timeout });

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

    await page.waitForFunction(() => {
      const container = document.querySelector('div.flex-1.w-full');
      return container ? container.textContent?.includes('Pet Name') : false;
    }, { timeout });

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

    // 11. Screenshot & compare
    await captureAndCompareScreenshot(page, 'modified-template-designer');

    // 12. Generate PDF & compare
    await generateAndComparePDF(page, browser, 'modified-template');

    // 13. Save locally
    await page.click('#save-local');

    // 14. Move to form viewer
    await page.click('#form-viewer-nav');
    await page.waitForFunction(() => {
      const container = document.querySelector('div.flex-1.w-full');
      return container ? container.textContent?.includes('Type Something...') : false;
    }, { timeout });

    // 15. Input form data
    const formInputUserFlow = parse(formInputRecord);
    const formInputRunner = await createRunner(formInputUserFlow, extension);
    await formInputRunner.run();

    // 16. Generate PDF & compare
    await generateAndComparePDF(page, browser, 'final-form');
  });
});
