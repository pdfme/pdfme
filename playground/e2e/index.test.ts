import puppeteer, { Browser, Page } from 'puppeteer';
import { execSync, ChildProcessWithoutNullStreams } from 'child_process';
import { spawn } from 'child_process';

jest.setTimeout(60000);

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

    await new Promise((resolve) => setTimeout(resolve, 2000));

    browser = await puppeteer.launch({
      headless: !isRunningLocal,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();

    await page.setViewport({ width: 1366, height: 768 });
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
    if (!page) throw new Error('Page not initialized');
    await page.goto('http://localhost:4173/');
    const title = await page.title();
    expect(title).toBe('pdfme Playground');

    await page.waitForNetworkIdle();

    const screenshot = await page.screenshot();
    expect(screenshot).toMatchImageSnapshot({
      customDiffConfig: { threshold: 0.2 },

    });
  });
});
