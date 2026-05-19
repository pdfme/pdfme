import React from 'react';
import { act, waitFor } from '@testing-library/react';
import { BLANK_PDF, type Template, type UIProps } from '@pdfme/common';
import { BaseUIClass } from '../src/class';

class TestUI extends BaseUIClass {
  public show() {
    this.render();
  }

  protected render() {
    this.mount(<div data-testid="base-ui-mounted">ready</div>);
  }
}

class ResizeObserverMock {
  constructor(_callback: ResizeObserverCallback) {}
  public observe() {}
  public unobserve() {}
  public disconnect() {}
}

const template: Template = {
  basePdf: BLANK_PDF,
  schemas: [[]],
};

test('BaseUIClass mount renders without forcing a synchronous flush', async () => {
  const originalResizeObserver = globalThis.ResizeObserver;

  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

  const domContainer = document.createElement('div');
  Object.defineProperty(domContainer, 'clientHeight', { configurable: true, value: 240 });
  Object.defineProperty(domContainer, 'clientWidth', { configurable: true, value: 320 });
  document.body.appendChild(domContainer);

  try {
    const ui = new TestUI({ domContainer, template } as UIProps);

    act(() => {
      ui.show();
    });

    await waitFor(() => {
      expect(domContainer.querySelector('[data-testid="base-ui-mounted"]')).toBeInTheDocument();
    });

    ui.destroy();
  } finally {
    domContainer.remove();
    globalThis.ResizeObserver = originalResizeObserver;
  }
});

test('constructor stores a copy of the options object, not the original reference', () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

  const domContainer = document.createElement('div');
  Object.defineProperty(domContainer, 'clientHeight', { configurable: true, value: 240 });
  Object.defineProperty(domContainer, 'clientWidth', { configurable: true, value: 320 });
  document.body.appendChild(domContainer);

  try {
    const initialOptions = { lang: 'en' as const };
    const ui = new TestUI({ domContainer, template, options: initialOptions } as UIProps);

    expect(ui.getOptions()).not.toBe(initialOptions);
    expect(ui.getOptions().lang).toBe('en');

    ui.destroy();
  } finally {
    domContainer.remove();
    globalThis.ResizeObserver = originalResizeObserver;
  }
});

test('updateOptions creates a new options object reference', () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

  const domContainer = document.createElement('div');
  Object.defineProperty(domContainer, 'clientHeight', { configurable: true, value: 240 });
  Object.defineProperty(domContainer, 'clientWidth', { configurable: true, value: 320 });
  document.body.appendChild(domContainer);

  try {
    const initialOptions = { lang: 'en' as const };
    const ui = new TestUI({ domContainer, template, options: initialOptions } as UIProps);

    const optionsBefore = ui.getOptions();

    act(() => {
      ui.updateOptions({ lang: 'ja' as const });
    });

    const optionsAfter = ui.getOptions();

    expect(optionsAfter).not.toBe(optionsBefore);
    expect(optionsAfter.lang).toBe('ja');

    ui.destroy();
  } finally {
    domContainer.remove();
    globalThis.ResizeObserver = originalResizeObserver;
  }
});
