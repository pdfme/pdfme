import puppeteer from 'puppeteer';
import { readEditableText } from '../../packages/schemas/src/text/uiRender.js';

describe('text case formatting in a real browser', () => {
  it('preserves source case and line breaks when reading an unchanged editable field', async () => {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent('<div id="text" contenteditable="true"></div>');
      await page.addScriptTag({
        content: `window.readEditableText = ${readEditableText.toString()};`,
      });

      const result = await page.evaluate(() => {
        const element = document.querySelector<HTMLDivElement>('#text');
        if (!element) throw new Error('Editable text element was not created.');
        element.style.textTransform = 'uppercase';
        element.innerText = 'Hello\nworld';
        const displayedText = element.innerText;
        const readText = (
          window as Window & { readEditableText?: (element: HTMLDivElement) => string }
        ).readEditableText;
        if (!readText) throw new Error('Editable text reader was not registered.');
        return {
          displayedText,
          sourceText: readText(element),
          textTransform: element.style.textTransform,
        };
      });

      expect(result).toEqual({
        displayedText: 'HELLO\nWORLD',
        sourceText: 'Hello\nworld',
        textTransform: 'uppercase',
      });
    } finally {
      await browser.close();
    }
  });
});
