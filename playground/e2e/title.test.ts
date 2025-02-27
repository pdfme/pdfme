import puppeteer, { Browser, Page, ElementHandle } from 'puppeteer';
import { execSync, ChildProcessWithoutNullStreams } from 'child_process';
import { spawn } from 'child_process';

jest.setTimeout(30000);

describe('Playground E2E Tests', () => {
  let browser: Browser | undefined;
  let page: Page | undefined;
  let previewProcess: ChildProcessWithoutNullStreams | undefined;

  beforeAll(async () => {
    // Build the playground
    console.log('Building playground...');
    execSync('npm run build', { stdio: 'inherit' });

    // Start the preview server
    console.log('Starting preview server...');
    previewProcess = spawn('npm', ['run', 'preview'], {
      detached: true,
      stdio: 'pipe',
    });

    // Wait for the server to start
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Launch the browser
    browser = await puppeteer.launch({
      headless: process.env.LOCAL !== "true",
    });
    page = await browser.newPage();
    
    // Set viewport size to match a typical 13-inch laptop screen
    await page.setViewport({
      width: 1366,
      height: 768,
    });
  }, 60000); // Increase timeout to 60 seconds for build process

  afterAll(async () => {
    // Close the browser
    if (browser) {
      await browser.close();
    }

    // Kill the preview server
    if (previewProcess && previewProcess.pid) {
      process.kill(-previewProcess.pid);
    }
  });

  test('Page title should be "pdfme Playground"', async () => {
    if (!page) throw new Error('Page not initialized');
    await page.goto('http://localhost:4173/');
    const title = await page.title();
    expect(title).toBe('pdfme Playground');
  });

  describe.skip('Templates Page', () => {
    beforeEach(async () => {
      if (!page) throw new Error('Page not initialized');
      await page.goto('http://localhost:4173/templates');
      // Wait for templates to load
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    test('Templates page loads with template items', async () => {
      if (!page) throw new Error('Page not initialized');
      // Check for template items
      const templateItems = await page.$$('.relative.border.border-gray-200.rounded-lg');
      expect(templateItems.length).toBeGreaterThan(0);
    });

    test('Template items have images', async () => {
      if (!page) throw new Error('Page not initialized');
      // Check for template images
      const templateImages = await page.$$('.relative.h-72.w-full img');
      expect(templateImages.length).toBeGreaterThan(0);
    });

    test('Template items have navigation buttons', async () => {
      if (!page) throw new Error('Page not initialized');
      // Check for "Go to Designer" buttons
      const designerButtons = await page.$$('button');
      const designerButtonsFiltered: ElementHandle<Element>[] = [];
      for (const button of designerButtons) {
        const text = await button.evaluate((el: Element) => el.textContent);
        if (text && text.includes('Go to Designer')) {
          designerButtonsFiltered.push(button);
        }
      }
      expect(designerButtonsFiltered.length).toBeGreaterThan(0);

      // Check for "Go to Form/Viewer" buttons
      const formViewerButtons = await page.$$('button');
      const formViewerButtonsFiltered: ElementHandle<Element>[] = [];
      for (const button of formViewerButtons) {
        const text = await button.evaluate((el: Element) => el.textContent);
        if (text && text.includes('Go to Form/Viewer')) {
          formViewerButtonsFiltered.push(button);
        }
      }
      expect(formViewerButtonsFiltered.length).toBeGreaterThan(0);
    });

    test('Can navigate to Designer from template', async () => {
      if (!page) throw new Error('Page not initialized');
      // Click the first "Go to Designer" button
      const designerButtons = await page.$$('button');
      let designerButton: ElementHandle<Element> | undefined;
      for (const button of designerButtons) {
        const text = await button.evaluate((el: Element) => el.textContent);
        if (text && text.includes('Go to Designer')) {
          designerButton = button;
          break;
        }
      }
      if (!designerButton) throw new Error('No designer button found');
      await designerButton.click();
      
      // Wait for navigation to complete
      await page.waitForNavigation();
      
      // Check the URL
      const url = page.url();
      expect(url).toContain('/designer');
    });
  });

  describe.skip('Designer Page', () => {
    beforeEach(async () => {
      if (!page) throw new Error('Page not initialized');
      await page.goto('http://localhost:4173/designer');
      // Wait for designer to load
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    test('Designer page loads with UI elements', async () => {
      if (!page) throw new Error('Page not initialized');
      // Check for language selector
      const langSelector = await page.$('select');
      expect(langSelector).not.toBeNull();

      // Check for buttons
      const buttons = await page.$$('button');
      let saveButton: ElementHandle<Element> | null = null;
      let resetButton: ElementHandle<Element> | null = null;
      let downloadButton: ElementHandle<Element> | null = null;
      let generateButton: ElementHandle<Element> | null = null;
      
      for (const button of buttons) {
        const text = await button.evaluate((el: Element) => el.textContent);
        if (text && text.includes('Save Local')) {
          saveButton = button;
        } else if (text && text.includes('Reset')) {
          resetButton = button;
        } else if (text && text.includes('DL Template')) {
          downloadButton = button;
        } else if (text && text.includes('Generate PDF')) {
          generateButton = button;
        }
      }
      
      expect(saveButton).not.toBeNull();
      expect(resetButton).not.toBeNull();
      expect(downloadButton).not.toBeNull();
      expect(generateButton).not.toBeNull();
    });

    test('Can change language', async () => {
      if (!page) throw new Error('Page not initialized');
      // Select a different language
      await page.select('select', 'ja');
      
      // Wait for UI to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify language change (this is a basic check, could be enhanced)
      const currentValue = await page.$eval('select', (el: HTMLSelectElement) => el.value);
      expect(currentValue).toBe('ja');
    });

    test('Can reset template', async () => {
      if (!page) throw new Error('Page not initialized');
      // Click the Reset button
      const resetButtons = await page.$$('button');
      let resetButton: ElementHandle<Element> | undefined;
      for (const button of resetButtons) {
        const text = await button.evaluate((el: Element) => el.textContent);
        if (text && text.includes('Reset')) {
          resetButton = button;
          break;
        }
      }
      if (!resetButton) throw new Error('Reset button not found');
      await resetButton.click();
      
      // Wait for UI to update
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    test('Can save template locally', async () => {
      if (!page) throw new Error('Page not initialized');
      // Click the Save Local button
      const saveButtons = await page.$$('button');
      let saveButton: ElementHandle<Element> | undefined;
      for (const button of saveButtons) {
        const text = await button.evaluate((el: Element) => el.textContent);
        if (text && text.includes('Save Local')) {
          saveButton = button;
          break;
        }
      }
      if (!saveButton) throw new Error('Save button not found');
      await saveButton.click();
      
      // Wait for UI to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check for toast notification (success message)
      const toastMessage = await page.$('.Toastify__toast');
      expect(toastMessage).not.toBeNull();
    });
  });

  describe.skip('Form & Viewer Page', () => {
    beforeEach(async () => {
      if (!page) throw new Error('Page not initialized');
      await page.goto('http://localhost:4173/form-and-viewer');
      // Wait for form to load
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    test('Form & Viewer page loads with UI elements', async () => {
      if (!page) throw new Error('Page not initialized');
      // Check for language selector
      const langSelector = await page.$('select');
      expect(langSelector).not.toBeNull();

      // Check for mode radio buttons
      const formRadio = await page.$('input[type="radio"][value="form"]');
      expect(formRadio).not.toBeNull();

      const viewerRadio = await page.$('input[type="radio"][value="viewer"]');
      expect(viewerRadio).not.toBeNull();

      // Check for buttons
      const buttons = await page.$$('button');
      let getInputsButton: ElementHandle<Element> | null = null;
      let setInputsButton: ElementHandle<Element> | null = null;
      let saveInputsButton: ElementHandle<Element> | null = null;
      let resetInputsButton: ElementHandle<Element> | null = null;
      let generateButton: ElementHandle<Element> | null = null;
      
      for (const button of buttons) {
        const text = await button.evaluate((el: Element) => el.textContent);
        if (text && text.includes('Get Inputs')) {
          getInputsButton = button;
        } else if (text && text.includes('Set Inputs')) {
          setInputsButton = button;
        } else if (text && text.includes('Save Inputs')) {
          saveInputsButton = button;
        } else if (text && text.includes('Reset Inputs')) {
          resetInputsButton = button;
        } else if (text && text.includes('Generate PDF')) {
          generateButton = button;
        }
      }
      
      expect(getInputsButton).not.toBeNull();
      expect(setInputsButton).not.toBeNull();
      expect(saveInputsButton).not.toBeNull();
      expect(resetInputsButton).not.toBeNull();
      expect(generateButton).not.toBeNull();
    });

    test('Can switch between Form and Viewer modes', async () => {
      if (!page) throw new Error('Page not initialized');
      // Check that Form mode is selected by default
      const formRadioChecked = await page.$eval('input[type="radio"][value="form"]', (el: HTMLInputElement) => el.checked);
      expect(formRadioChecked).toBe(true);

      // Switch to Viewer mode
      await page.click('input[type="radio"][value="viewer"]');
      
      // Wait for UI to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check that Viewer mode is now selected
      const viewerRadioChecked = await page.$eval('input[type="radio"][value="viewer"]', (el: HTMLInputElement) => el.checked);
      expect(viewerRadioChecked).toBe(true);
    });

    test('Can save inputs', async () => {
      if (!page) throw new Error('Page not initialized');
      // Click the Save Inputs button
      const saveInputsButtons = await page.$$('button');
      let saveInputsButton: ElementHandle<Element> | undefined;
      for (const button of saveInputsButtons) {
        const text = await button.evaluate((el: Element) => el.textContent);
        if (text && text.includes('Save Inputs')) {
          saveInputsButton = button;
          break;
        }
      }
      if (!saveInputsButton) throw new Error('Save inputs button not found');
      await saveInputsButton.click();
      
      // Wait for UI to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check for toast notification (success message)
      const toastMessage = await page.$('.Toastify__toast');
      expect(toastMessage).not.toBeNull();
    });

    test('Can reset inputs', async () => {
      if (!page) throw new Error('Page not initialized');
      // Click the Reset Inputs button
      const resetInputsButtons = await page.$$('button');
      let resetInputsButton: ElementHandle<Element> | undefined;
      for (const button of resetInputsButtons) {
        const text = await button.evaluate((el: Element) => el.textContent);
        if (text && text.includes('Reset Inputs')) {
          resetInputsButton = button;
          break;
        }
      }
      if (!resetInputsButton) throw new Error('Reset inputs button not found');
      await resetInputsButton.click();
      
      // Wait for UI to update
      await new Promise(resolve => setTimeout(resolve, 500));
    });
  });

  describe.skip('Navigation', () => {
    beforeEach(async () => {
      if (!page) throw new Error('Page not initialized');
      await page.goto('http://localhost:4173/');
    });

    test('Can navigate to Designer page', async () => {
      if (!page) throw new Error('Page not initialized');
      // Find and click the Designer link
      const designerLink = await page.waitForSelector('a[href="/designer"]');
      if (!designerLink) throw new Error('Designer link not found');
      await designerLink.click();
      
      // Wait for navigation to complete
      await page.waitForNavigation();
      
      // Check the URL
      const url = page.url();
      expect(url).toContain('/designer');
    });

    test('Can navigate to Form & Viewer page', async () => {
      if (!page) throw new Error('Page not initialized');
      // Find and click the Form & Viewer link
      const formViewerLink = await page.waitForSelector('a[href="/form-and-viewer"]');
      if (!formViewerLink) throw new Error('Form & Viewer link not found');
      await formViewerLink.click();
      
      // Wait for navigation to complete
      await page.waitForNavigation();
      
      // Check the URL
      const url = page.url();
      expect(url).toContain('/form-and-viewer');
    });

    test('Can navigate to Templates page', async () => {
      if (!page) throw new Error('Page not initialized');
      // Find and click the Templates link
      const templatesLink = await page.waitForSelector('a[href="/templates"]');
      if (!templatesLink) throw new Error('Templates link not found');
      await templatesLink.click();
      
      // Wait for navigation to complete
      await page.waitForNavigation();
      
      // Check the URL
      const url = page.url();
      expect(url).toContain('/templates');
    });
  });
});
