import puppeteer, { ElementHandle } from 'puppeteer';
import { execSync } from 'child_process';
import { spawn } from 'child_process';
import * as path from 'path';

describe('Playground E2E Tests', () => {
  let browser;
  let page;
  let previewProcess;

  beforeAll(async () => {
    // Build the entire pdfme project
    console.log('Building pdfme project...');
    execSync('npm run build', { 
      cwd: path.resolve(process.cwd(), '..'),
      stdio: 'inherit'
    });

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
      headless: true,
    });
    page = await browser.newPage();
  }, 60000); // Increase timeout to 60 seconds for build process

  afterAll(async () => {
    // Close the browser
    if (browser) {
      await browser.close();
    }

    // Kill the preview server
    if (previewProcess) {
      process.kill(-previewProcess.pid);
    }
  });

  test('Page title should be "pdfme Playground"', async () => {
    await page.goto('http://localhost:4173/');
    const title = await page.title();
    expect(title).toBe('pdfme Playground');
  });

  describe('Templates Page', () => {
    beforeEach(async () => {
      await page.goto('http://localhost:4173/templates');
      // Wait for templates to load
      await page.waitForTimeout(2000);
    });

    test('Templates page loads with template items', async () => {
      // Check for template items
      const templateItems = await page.$$('.relative.border.border-gray-200.rounded-lg');
      expect(templateItems.length).toBeGreaterThan(0);
    });

    test('Template items have images', async () => {
      // Check for template images
      const templateImages = await page.$$('.relative.h-72.w-full img');
      expect(templateImages.length).toBeGreaterThan(0);
    });

    test('Template items have navigation buttons', async () => {
      // Check for "Go to Designer" buttons
      const designerButtons = await page.$$('button');
      const designerButtonsFiltered: ElementHandle<Element>[] = [];
      for (const button of designerButtons) {
        const text = await button.evaluate(el => el.textContent);
        if (text && text.includes('Go to Designer')) {
          designerButtonsFiltered.push(button);
        }
      }
      expect(designerButtonsFiltered.length).toBeGreaterThan(0);

      // Check for "Go to Form/Viewer" buttons
      const formViewerButtons = await page.$$('button');
      const formViewerButtonsFiltered: ElementHandle<Element>[] = [];
      for (const button of formViewerButtons) {
        const text = await button.evaluate(el => el.textContent);
        if (text && text.includes('Go to Form/Viewer')) {
          formViewerButtonsFiltered.push(button);
        }
      }
      expect(formViewerButtonsFiltered.length).toBeGreaterThan(0);
    });

    test('Can navigate to Designer from template', async () => {
      // Click the first "Go to Designer" button
      const designerButtons = await page.$$('button');
      let designerButton;
      for (const button of designerButtons) {
        const text = await button.evaluate(el => el.textContent);
        if (text && text.includes('Go to Designer')) {
          designerButton = button;
          break;
        }
      }
      await designerButton.click();
      
      // Wait for navigation to complete
      await page.waitForNavigation();
      
      // Check the URL
      const url = page.url();
      expect(url).toContain('/designer');
    });
  });

  describe('Designer Page', () => {
    beforeEach(async () => {
      await page.goto('http://localhost:4173/designer');
      // Wait for designer to load
      await page.waitForTimeout(2000);
    });

    test('Designer page loads with UI elements', async () => {
      // Check for language selector
      const langSelector = await page.$('select');
      expect(langSelector).not.toBeNull();

      // Check for buttons
      const buttons = await page.$$('button');
      let saveButton = null;
      let resetButton = null;
      let downloadButton = null;
      let generateButton = null;
      
      for (const button of buttons) {
        const text = await button.evaluate(el => el.textContent);
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
      // Select a different language
      await page.select('select', 'ja');
      
      // Wait for UI to update
      await page.waitForTimeout(500);
      
      // Verify language change (this is a basic check, could be enhanced)
      const currentValue = await page.$eval('select', el => el.value);
      expect(currentValue).toBe('ja');
    });

    test('Can reset template', async () => {
      // Click the Reset button
      const resetButtons = await page.$$('button');
      let resetButton;
      for (const button of resetButtons) {
        const text = await button.evaluate(el => el.textContent);
        if (text && text.includes('Reset')) {
          resetButton = button;
          break;
        }
      }
      await resetButton.click();
      
      // Wait for UI to update
      await page.waitForTimeout(500);
    });

    test('Can save template locally', async () => {
      // Click the Save Local button
      const saveButtons = await page.$$('button');
      let saveButton;
      for (const button of saveButtons) {
        const text = await button.evaluate(el => el.textContent);
        if (text && text.includes('Save Local')) {
          saveButton = button;
          break;
        }
      }
      await saveButton.click();
      
      // Wait for UI to update
      await page.waitForTimeout(500);
      
      // Check for toast notification (success message)
      const toastMessage = await page.$('.Toastify__toast');
      expect(toastMessage).not.toBeNull();
    });
  });

  describe('Form & Viewer Page', () => {
    beforeEach(async () => {
      await page.goto('http://localhost:4173/form-and-viewer');
      // Wait for form to load
      await page.waitForTimeout(2000);
    });

    test('Form & Viewer page loads with UI elements', async () => {
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
      let getInputsButton = null;
      let setInputsButton = null;
      let saveInputsButton = null;
      let resetInputsButton = null;
      let generateButton = null;
      
      for (const button of buttons) {
        const text = await button.evaluate(el => el.textContent);
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
      // Check that Form mode is selected by default
      const formRadioChecked = await page.$eval('input[type="radio"][value="form"]', el => el.checked);
      expect(formRadioChecked).toBe(true);

      // Switch to Viewer mode
      await page.click('input[type="radio"][value="viewer"]');
      
      // Wait for UI to update
      await page.waitForTimeout(500);
      
      // Check that Viewer mode is now selected
      const viewerRadioChecked = await page.$eval('input[type="radio"][value="viewer"]', el => el.checked);
      expect(viewerRadioChecked).toBe(true);
    });

    test('Can save inputs', async () => {
      // Click the Save Inputs button
      const saveInputsButtons = await page.$$('button');
      let saveInputsButton;
      for (const button of saveInputsButtons) {
        const text = await button.evaluate(el => el.textContent);
        if (text && text.includes('Save Inputs')) {
          saveInputsButton = button;
          break;
        }
      }
      await saveInputsButton.click();
      
      // Wait for UI to update
      await page.waitForTimeout(500);
      
      // Check for toast notification (success message)
      const toastMessage = await page.$('.Toastify__toast');
      expect(toastMessage).not.toBeNull();
    });

    test('Can reset inputs', async () => {
      // Click the Reset Inputs button
      const resetInputsButtons = await page.$$('button');
      let resetInputsButton;
      for (const button of resetInputsButtons) {
        const text = await button.evaluate(el => el.textContent);
        if (text && text.includes('Reset Inputs')) {
          resetInputsButton = button;
          break;
        }
      }
      await resetInputsButton.click();
      
      // Wait for UI to update
      await page.waitForTimeout(500);
    });
  });

  describe('Navigation', () => {
    beforeEach(async () => {
      await page.goto('http://localhost:4173/');
    });

    test('Can navigate to Designer page', async () => {
      // Find and click the Designer link
      const designerLink = await page.waitForSelector('a[href="/designer"]');
      await designerLink.click();
      
      // Wait for navigation to complete
      await page.waitForNavigation();
      
      // Check the URL
      const url = page.url();
      expect(url).toContain('/designer');
    });

    test('Can navigate to Form & Viewer page', async () => {
      // Find and click the Form & Viewer link
      const formViewerLink = await page.waitForSelector('a[href="/form-and-viewer"]');
      await formViewerLink.click();
      
      // Wait for navigation to complete
      await page.waitForNavigation();
      
      // Check the URL
      const url = page.url();
      expect(url).toContain('/form-and-viewer');
    });

    test('Can navigate to Templates page', async () => {
      // Find and click the Templates link
      const templatesLink = await page.waitForSelector('a[href="/templates"]');
      await templatesLink.click();
      
      // Wait for navigation to complete
      await page.waitForNavigation();
      
      // Check the URL
      const url = page.url();
      expect(url).toContain('/templates');
    });
  });
});
