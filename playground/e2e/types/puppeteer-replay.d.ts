declare module '@puppeteer/replay' {
  import { Browser, Page } from 'puppeteer';

  export function parse(record: any): any;
  export function createRunner(flow: any, extension: any): Promise<{ run: () => Promise<void> }>;

  export class PuppeteerRunnerExtension {
    constructor(browser: Browser, page: Page, options?: { timeout?: number });
  }
}
