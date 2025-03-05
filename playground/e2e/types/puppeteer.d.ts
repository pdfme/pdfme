declare module 'puppeteer' {
  export interface Browser {
    newPage(): Promise<Page>;
    waitForTarget(predicate: (target: any) => boolean, options?: { timeout?: number }): Promise<any>;
    close(): Promise<void>;
  }

  export interface Page {
    setRequestInterception(value: boolean): Promise<void>;
    setViewport(viewport: { width: number; height: number }): Promise<void>;
    setDefaultNavigationTimeout(timeout: number): Promise<void>;
    on(event: string, callback: (req: any) => void): void;
    goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<any>;
    waitForSelector(selector: string, options?: { timeout?: number }): Promise<any>;
    waitForFunction(fn: Function | string, options?: { timeout?: number }): Promise<any>;
    click(selector: string): Promise<void>;
    $eval(selector: string, fn: (el: Element) => any): Promise<any>;
    $(selector: string): Promise<any>;
    bringToFront(): Promise<void>;
    evaluate(fn: Function | string, ...args: any[]): Promise<any>;
    screenshot(options?: { encoding?: string }): Promise<Buffer | string>;
    close(): Promise<void>;
    url(): string;
  }

  export default {
    launch: (options?: any) => Promise<Browser>
  };
}
