import puppeteer, { Browser, Page } from 'puppeteer';
import { execSync, ChildProcessWithoutNullStreams } from 'child_process';
import { spawn } from 'child_process';
import type { MatchImageSnapshotOptions } from 'jest-image-snapshot';
import formInputRecord from './formInputRecord.json';
import templateCreataionRecord from './templateCreataionRecord.json';

const timeout = 60000;

jest.setTimeout(timeout * 3);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const snapShotOpt: MatchImageSnapshotOptions = {
  failureThreshold: 1,
  failureThresholdType: 'percent',
  blur: 1,
  customDiffConfig: { threshold: 0.2 },
};

const viewport = { width: 1366, height: 768 };

const generatePdfAndTakeScreenshot = async ({
  page,
  browser,
}: {
  page: Page;
  browser: Browser;
}) => {
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

  await newPage.goto(newPage.url(), { waitUntil: 'networkidle0', timeout });
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

    await page.goto('http://localhost:4173', { waitUntil: 'networkidle0', timeout });

    const screenshot = await generatePdfAndTakeScreenshot({ page, browser });

    expect(screenshot).toMatchImageSnapshot(snapShotOpt);

    // 1. まずテンプレート一覧画面に遷移(http://localhost:4173/templates)
    // 2. Invoiceテンプレートをクリックし、自動的にデザイナーに遷移(#template-img-invoice)
    // 3. デザイナーでスクリーンショットを撮り、スナップショットと比較
    // 4. PDFを生成してスクリーンショットを撮り、スナップショットと比較
    // 5. テンプレート一覧画面に戻る(#templates-nav)
    // 6. Pedigreeテンプレートをクリックし、自動的にデザイナーに遷移(#template-img-pedigree)
    // 7. デザイナーでスクリーンショットを撮り、スナップショットと比較
    // 8. PDFを生成してスクリーンショットを撮り、スナップショットと比較
    // 9. Restボタンを押してテンプレートをリセットする(#reset-template)
    // 10. テキストボックスなど、いろいろ追加 (templateCreataionRecord)
    // 11. デザイナーでスクリーンショットを撮り、スナップショットと比較
    // 12. PDFを生成してスクリーンショットを撮り、スナップショットと比較
    // 13. Save Localボタンを押してローカルに保存(#save-local)
    // 14. フォームビューアーにナビジェーションをクリックして遷移(#form-viewer-nav)
    // 15. フォームに入力して(formInputRecord)
    // 16. PDFを生成してスクリーンショットを撮り、スナップショットと比較
  });
});
