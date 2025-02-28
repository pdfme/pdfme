import fs from 'fs';
import puppeteer, { Browser, Page } from 'puppeteer';
import { createRunner, parse, PuppeteerRunnerExtension } from '@puppeteer/replay';
import { execSync, ChildProcessWithoutNullStreams } from 'child_process';
import { spawn } from 'child_process';
import type { MatchImageSnapshotOptions } from 'jest-image-snapshot';
import templateCreationRecord from './templateCreationRecord.json';
import formInputRecord from './formInputRecord.json';

const baseUrl = 'http://localhost:4173';

const timeout = 60000;
jest.setTimeout(timeout * 5);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const snapShotOpt: MatchImageSnapshotOptions = {
  failureThreshold: 1,
  failureThresholdType: 'percent',
  blur: 1,
  customDiffConfig: { threshold: 0.2 },
};

const viewport = { width: 1366, height: 768 };

const generatePdfAndTakeScreenshot = async (arg: { page: Page; browser: Browser }) => {
  const { page, browser } = arg;
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
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout });

  await sleep(2000);

  const screenshot = await newPage.screenshot();

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
    await sleep(2000);

    browser = await puppeteer.launch({
      headless: !isRunningLocal,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();
    await page.setViewport(viewport);
    page.setDefaultNavigationTimeout(timeout);
    page.on('request', (req) => {
      const ignoreDomains = [
        'https://fonts.gstatic.com/',
        'https://media.ethicalads.io/',
      ];
      if (ignoreDomains.some((d) => req.url().startsWith(d))) {
        console.log(`[Request Ignored]: ${req.url()}`);
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
      console.log('1. テンプレート一覧画面に遷移');
      await page.goto(`${baseUrl}/templates`);

      console.log('2. Invoiceテンプレートをクリック');
      await page.waitForSelector('#template-img-invoice', { timeout });
      await page.click('#template-img-invoice');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout });
      await sleep(1000);

      console.log('3. デザイナーでスクリーンショット');
      let screenshot = await page.screenshot();
      expect(screenshot).toMatchImageSnapshot(snapShotOpt);

      console.log('4. PDFを生成してスクリーンショット取得');
      screenshot = await generatePdfAndTakeScreenshot({ page, browser });
      expect(screenshot).toMatchImageSnapshot(snapShotOpt);

      console.log('5. テンプレート一覧画面に戻る');
      await page.click('#templates-nav');
      await sleep(1000);

      console.log('6. Pedigreeテンプレートをクリック');
      await page.waitForSelector('#template-img-pedigree', { timeout });
      await page.click('#template-img-pedigree');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout });
      await sleep(1000);

      console.log('7. デザイナーでスクリーンショット');
      screenshot = await page.screenshot();
      expect(screenshot).toMatchImageSnapshot(snapShotOpt);

      console.log('8. PDFを生成してスクリーンショット取得');
      screenshot = await generatePdfAndTakeScreenshot({ page, browser });
      expect(screenshot).toMatchImageSnapshot(snapShotOpt);

      console.log('9. Resetボタンを押してテンプレートをリセット');
      await page.$eval('#reset-template', (el: Element) => (el as HTMLElement).click());
      await sleep(500);

      console.log('10. templateCreationRecord の操作手順を再生して要素を追加');
      const templateCreationUserFlow = parse(templateCreationRecord);
      const templateCreationRunner = await createRunner(templateCreationUserFlow, extension);
      await templateCreationRunner.run();

      console.log('11. デザイナーで再度スクリーンショット');
      screenshot = await page.screenshot();
      expect(screenshot).toMatchImageSnapshot(snapShotOpt);

      console.log('12. PDFを生成してスクリーンショットを撮り、スナップショットと比較');
      screenshot = await generatePdfAndTakeScreenshot({ page, browser });
      expect(screenshot).toMatchImageSnapshot(snapShotOpt);

      console.log('13. Save Localボタンでローカル保存 ');
      await page.click('#save-local');
      await sleep(500);

      console.log('14. form-viewer-nav をクリックしてフォームビューアーに遷移');
      await page.click('#form-viewer-nav');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout });
      await sleep(1000);

      console.log('15. formInputRecord の手順でフォームに入力');
      const formInputUserFlow = parse(formInputRecord);
      const formInputRunner = await createRunner(formInputUserFlow, extension);
      await formInputRunner.run();

      console.log('16. PDFを生成し、スクリーンショットを撮り、スナップショットと比較');
      screenshot = await generatePdfAndTakeScreenshot({ page, browser });
      expect(screenshot).toMatchImageSnapshot(snapShotOpt);
    } catch (e) {
      // テストで失敗した瞬間のスクリーンショットを取得し、保存
      console.error(e);
      const screenshot = await page.screenshot();
      fs.writeFileSync('e2e-error-screenshot.png', screenshot, 'base64');
      throw e;
    }
  });
});
