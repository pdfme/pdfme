import fs from 'fs';
import puppeteer, { Browser, Page } from 'puppeteer';
import { createRunner, parse, PuppeteerRunnerExtension } from '@puppeteer/replay';
import { execSync, ChildProcessWithoutNullStreams } from 'child_process';
import { spawn } from 'child_process';
import type { MatchImageSnapshotOptions } from 'jest-image-snapshot';
import templateCreationRecord from './templateCreationRecord.json';
import formInputRecord from './formInputRecord.json';

const baseUrl = 'http://localhost:4173';

const timeout = 20000;
jest.setTimeout(timeout * 5);

const snapShotOpt: MatchImageSnapshotOptions = {
  failureThreshold: 1,
  failureThresholdType: 'percent',
  blur: 1,
  customDiffConfig: { threshold: 0.2 },
};

const viewport = { width: 1366, height: 768 };

const generatePdfAndTakeScreenshot = async (arg: { page: Page; browser: Browser }) => {
  const { page, browser } = arg;
  await page.waitForSelector('#generate-pdf', { timeout });
  await page.click('#generate-pdf');

  const newTarget = await browser.waitForTarget((target) => target.url().startsWith('blob:'), {
    timeout,
  });
  const newPage = await newTarget.page();

  if (!newPage) {
    throw new Error('[generatePdfAndTakeScreenshot]: New page not found');
  }

  await newPage.setViewport(viewport);
  await newPage.bringToFront();
  await newPage.goto(newPage.url(), { waitUntil: 'networkidle2', timeout });

  const screenshot = await newPage.screenshot({ encoding: 'base64' });

  await newPage.close();
  await page.bringToFront();

  return screenshot;
};

describe('Playground E2E Tests', () => {
  const isRunningLocal = process.env.LOCAL === 'true';
  let browser: Browser | undefined;
  let page: Page | undefined;
  let previewProcess: ChildProcessWithoutNullStreams | undefined;

  beforeAll(async () => {
    if (isRunningLocal) {
      console.log('Skip Building playground in local mode');
    } else {
      console.log('Building playground...');
      execSync('npm run build', { stdio: 'inherit' });
    }

    console.log('Starting preview server...');
    previewProcess = spawn('npm', ['run', 'preview'], {
      detached: true,
      stdio: 'pipe',
    });

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
    if (previewProcess && previewProcess.pid) {
      process.kill(-previewProcess.pid);
    }
  });

  test('E2E suite', async () => {
    if (!browser) throw new Error('Browser not initialized');
    if (!page) throw new Error('Page not initialized');

    const extension = new PuppeteerRunnerExtension(browser, page, { timeout });

    try {
      console.log('1. Navigate to template list screen');
      await page.goto(`${baseUrl}/templates`);

      console.log('2. Click on Invoice template');
      await page.waitForSelector('#template-img-invoice', { timeout });
      await page.click('#template-img-invoice');

      await page.waitForFunction(
        () => {
          const container = document.querySelector('div.flex-1.w-full');
          return container ? container.textContent?.includes('INVOICE') : false;
        },
        { timeout }
      );

      console.log('3. Take screenshot in designer');
      let screenshot = await page.screenshot({ encoding: 'base64' });
      expect(screenshot).toMatchImageSnapshot(snapShotOpt);

      console.log('4. Generate PDF and capture screenshot');
      screenshot = await generatePdfAndTakeScreenshot({ page, browser });
      expect(screenshot).toMatchImageSnapshot(snapShotOpt);

      console.log('5. Return to template list screen');
      await page.click('#templates-nav');
      await page.reload();

      console.log('6. Click on Pedigree template');
      await page.waitForSelector('#template-img-pedigree', { timeout });
      await page.click('#template-img-pedigree');
      await page.waitForFunction(
        () => {
          const container = document.querySelector('div.flex-1.w-full');
          return container ? container.textContent?.includes('Pet Name') : false;
        },
        { timeout }
      );

      console.log('7. Take screenshot in designer');
      screenshot = await page.screenshot({ encoding: 'base64' });
      expect(screenshot).toMatchImageSnapshot(snapShotOpt);

      console.log('8. Generate PDF and capture screenshot');
      screenshot = await generatePdfAndTakeScreenshot({ page, browser });
      expect(screenshot).toMatchImageSnapshot(snapShotOpt);

      console.log('9. Press Reset button to reset template');
      await page.$eval('#reset-template', (el: Element) => (el as HTMLElement).click());

      console.log('10. Replay templateCreationRecord operations to add elements');
      const templateCreationUserFlow = parse(templateCreationRecord);
      const templateCreationRunner = await createRunner(templateCreationUserFlow, extension);
      await templateCreationRunner.run();

      console.log('11. Take another screenshot in designer');
      screenshot = await page.screenshot({ encoding: 'base64' });
      expect(screenshot).toMatchImageSnapshot(snapShotOpt);

      console.log('12. Generate PDF, take screenshot, and compare with snapshot');
      screenshot = await generatePdfAndTakeScreenshot({ page, browser });
      expect(screenshot).toMatchImageSnapshot(snapShotOpt);

      console.log('13. Save locally using Save Local button');
      await page.click('#save-local');

      console.log('14. Click on form-viewer-nav to navigate to form viewer');
      await page.click('#form-viewer-nav');
      await page.waitForFunction(
        () => {
          const container = document.querySelector('div.flex-1.w-full');
          return container ? container.textContent?.includes('Type Something...') : false;
        },
        { timeout }
      );

      console.log('15. Input form data following formInputRecord steps');
      const formInputUserFlow = parse(formInputRecord);
      const formInputRunner = await createRunner(formInputUserFlow, extension);
      await formInputRunner.run();

      console.log('16. Generate PDF, take screenshot, and compare with snapshot');
      screenshot = await generatePdfAndTakeScreenshot({ page, browser });
      expect(screenshot).toMatchImageSnapshot(snapShotOpt);
    } catch (e) {
      console.error(e);
      const screenshot = await page.screenshot({ encoding: 'base64' });
      fs.writeFileSync('e2e-error-screenshot.png', screenshot, 'base64');
      throw e;
    }
  });
});
