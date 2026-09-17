import React from 'react';
import { act, waitFor } from '@testing-library/react';
import { BLANK_PDF, type Template, type UIProps } from '@pdfme/common';
import { BaseUIClass } from '../src/class';
import { measureUiContainerSize, type ContainerBox } from '../src/containerSize';

class TestUI extends BaseUIClass {
  public show() {
    this.render();
  }

  public getSize() {
    return this.size;
  }

  protected render() {
    this.mount(<div data-testid="base-ui-mounted">ready</div>);
  }
}

const template: Template = {
  basePdf: BLANK_PDF,
  schemas: [[]],
};

const VIEWPORT = { width: 800, height: 600 };

const box = (
  clientWidth: number,
  clientHeight: number,
  rect: { top: number; left: number; right: number; bottom: number },
): ContainerBox => ({
  clientWidth,
  clientHeight,
  getBoundingClientRect: () => rect,
});

describe('measureUiContainerSize', () => {
  test.each([
    {
      name: 'uses layout size when fully on screen',
      container: box(640, 480, { top: 0, left: 0, right: 640, bottom: 480 }),
      expected: { width: 640, height: 480 },
    },
    {
      name: 'falls back to the viewport when layout and intersection are 0',
      container: box(0, 0, { top: 0, left: 0, right: 0, bottom: 0 }),
      expected: { width: 800, height: 600 },
    },
    {
      name: 'keeps layout size when the container is below the fold',
      container: box(640, 480, { top: 700, left: 0, right: 640, bottom: 1180 }),
      expected: { width: 640, height: 480 },
    },
    {
      name: 'keeps both layout dimensions when only one axis is off-screen',
      container: box(640, 480, { top: 700, left: -100, right: 540, bottom: 1180 }),
      expected: { width: 640, height: 480 },
    },
    {
      name: 'keeps layout height when the host sits exactly on the fold',
      container: box(640, 480, { top: 600, left: 0, right: 640, bottom: 1080 }),
      expected: { width: 640, height: 480 },
    },
    {
      name: 'keeps layout height when only 1px is visible at the fold',
      container: box(640, 480, { top: 599, left: 0, right: 640, bottom: 1079 }),
      expected: { width: 640, height: 480 },
    },
    {
      name: 'keeps layout height when 10px is visible at the fold',
      container: box(640, 480, { top: 590, left: 0, right: 640, bottom: 1070 }),
      expected: { width: 640, height: 480 },
    },
    {
      name: 'clips to the visible height when on-screen content is taller than the viewport',
      container: box(640, 800, { top: 0, left: 0, right: 640, bottom: 800 }),
      viewport: { width: 800, height: 400 },
      expected: { width: 640, height: 400 },
    },
    {
      name: 'keeps layout size when a fitting host is only partly in view',
      container: box(640, 480, { top: -100, left: 0, right: 640, bottom: 380 }),
      expected: { width: 640, height: 480 },
    },
  ])('$name', ({ container, viewport = VIEWPORT, expected }) => {
    expect(measureUiContainerSize(container, viewport)).toEqual(expected);
  });
});

test('BaseUIClass mount renders without forcing a synchronous flush', async () => {
  const originalResizeObserver = globalThis.ResizeObserver;

  class ResizeObserverMock {
    constructor(_callback: ResizeObserverCallback) {}

    public observe() {}
    public unobserve() {}
    public disconnect() {}
  }

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

describe('BaseUIClass setSize', () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  let observerCallback: ResizeObserverCallback | undefined;

  const installResizeObserver = () => {
    observerCallback = undefined;
    class ResizeObserverMock {
      constructor(callback: ResizeObserverCallback) {
        observerCallback = callback;
      }

      public observe() {}
      public unobserve() {}
      public disconnect() {}
    }

    globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
  };

  const createObservedContainer = ({
    clientWidth,
    clientHeight,
    rect,
  }: {
    clientWidth: number;
    clientHeight: number;
    rect: { top: number; left: number; right: number; bottom: number };
  }) => {
    const domContainer = document.createElement('div');
    Object.defineProperty(domContainer, 'clientWidth', { configurable: true, value: clientWidth });
    Object.defineProperty(domContainer, 'clientHeight', { configurable: true, value: clientHeight });
    const rectSpy = vi.spyOn(domContainer, 'getBoundingClientRect').mockReturnValue({
      ...rect,
      width: rect.right - rect.left,
      height: rect.bottom - rect.top,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    });
    document.body.appendChild(domContainer);
    return { domContainer, rectSpy };
  };

  beforeEach(() => {
    vi.useFakeTimers();
    installResizeObserver();
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    globalThis.ResizeObserver = originalResizeObserver;
  });

  const flushSetSize = (ui: TestUI) => {
    act(() => {
      observerCallback?.([] as unknown as ResizeObserverEntry[], {} as ResizeObserver);
      vi.advanceTimersByTime(100);
      ui.show();
    });
  };

  test('does not collapse to 0 when the container is below the fold', () => {
    const { domContainer } = createObservedContainer({
      clientWidth: 640,
      clientHeight: 480,
      rect: { top: 700, left: 0, right: 640, bottom: 1180 },
    });

    try {
      const ui = new TestUI({ domContainer, template } as UIProps);
      flushSetSize(ui);
      expect(ui.getSize()).toEqual({ width: 640, height: 480 });
      ui.destroy();
    } finally {
      domContainer.remove();
    }
  });

  test('shrinks to the visible height when on-screen content is taller than the viewport', () => {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(400);
    const { domContainer } = createObservedContainer({
      clientWidth: 640,
      clientHeight: 800,
      rect: { top: 0, left: 0, right: 640, bottom: 800 },
    });

    try {
      const ui = new TestUI({ domContainer, template } as UIProps);
      flushSetSize(ui);
      expect(ui.getSize()).toEqual({ width: 640, height: 400 });
      ui.destroy();
    } finally {
      domContainer.remove();
    }
  });

  test('keeps layout size when a 1px-visible host is later scrolled fully into view', () => {
    const { domContainer, rectSpy } = createObservedContainer({
      clientWidth: 640,
      clientHeight: 480,
      rect: { top: 599, left: 0, right: 640, bottom: 1079 },
    });

    try {
      const ui = new TestUI({ domContainer, template } as UIProps);
      flushSetSize(ui);
      expect(ui.getSize()).toEqual({ width: 640, height: 480 });

      rectSpy.mockReturnValue({
        top: 0,
        left: 0,
        right: 640,
        bottom: 480,
        width: 640,
        height: 480,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      expect(ui.getSize()).toEqual({ width: 640, height: 480 });

      flushSetSize(ui);
      expect(ui.getSize()).toEqual({ width: 640, height: 480 });
      ui.destroy();
    } finally {
      domContainer.remove();
    }
  });
});
