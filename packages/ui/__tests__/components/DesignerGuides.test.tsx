import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Designer from '../../src/components/Designer/index.js';
import { type GuidesController } from '../../src/components/Designer/Canvas/index.js';
import { I18nContext, FontContext, PluginsRegistry } from '../../src/contexts';
import { i18n } from '../../src/i18n';
import { getDefaultFont, pluginRegistry } from '@pdfme/common';
import { setupUIMock, getSampleTemplate } from '../assets/helper';
import { text, image } from '@pdfme/schemas';
import { SELECTABLE_CLASSNAME } from '../../src/constants';

const plugins = { text, image };

/**
 * Stub GuidesComponent so that in jsdom we can control getGuides / loadGuides
 * without needing real canvas layout.  Each instance stores its own guide array.
 */
const makeGuideInstance = () => {
  let guides: number[] = [];
  return {
    getGuides: () => guides,
    loadGuides: (g: number[]) => {
      guides = g;
    },
    scroll: () => {},
    scrollGuides: () => {},
    resize: () => {},
  };
};

// Map from the underlying DOM element to our stub instance so that forwardRef
// can produce a stable ref object.
const refMap = new Map<object, ReturnType<typeof makeGuideInstance>>();

vi.mock('@scena/react-guides', () => {
  const GuidesStub = React.forwardRef<
    ReturnType<typeof makeGuideInstance>,
    Record<string, unknown>
  >((_props, ref) => {
    const instance = makeGuideInstance();
    React.useImperativeHandle(ref, () => instance, []);
    return <div data-testid="guides-stub" />;
  });
  GuidesStub.displayName = 'GuidesStub';
  return { default: GuidesStub };
});

const renderDesignerAndGetController = async (): Promise<GuidesController> => {
  setupUIMock();
  let capturedController: GuidesController | null = null;

  act(() => {
    render(
      <I18nContext.Provider value={i18n}>
        <FontContext.Provider value={getDefaultFont()}>
          <PluginsRegistry.Provider value={pluginRegistry(plugins)}>
            <Designer
              template={getSampleTemplate()}
              onSaveTemplate={() => {}}
              onChangeTemplate={() => {}}
              size={{ width: 1200, height: 1200 }}
              onPageCursorChange={() => {}}
              onMountGuidesController={(controller) => {
                capturedController = controller;
              }}
            />
          </PluginsRegistry.Provider>
        </FontContext.Provider>
      </I18nContext.Provider>,
    );
  });

  // Wait for the canvas and guides to mount.
  await waitFor(() => expect(capturedController).not.toBeNull());

  return capturedController!;
};

test('getGuides returns empty arrays for each page when no guides are set', async () => {
  const controller = await renderDesignerAndGetController();

  const guides = controller.getGuides();

  // The sample template has 1 page → outer arrays have length 1.
  expect(guides.horizontal).toHaveLength(1);
  expect(guides.vertical).toHaveLength(1);
  expect(guides.horizontal[0]).toEqual([]);
  expect(guides.vertical[0]).toEqual([]);
});

test('setGuides loads positions into guide refs and getGuides returns them', async () => {
  const controller = await renderDesignerAndGetController();

  const input = {
    horizontal: [[10, 20, 30]],
    vertical: [[15, 25]],
  };

  act(() => {
    controller.setGuides(input);
  });

  const result = controller.getGuides();

  expect(result.horizontal[0]).toEqual([10, 20, 30]);
  expect(result.vertical[0]).toEqual([15, 25]);
});

test('setGuides is a no-op for pages that have no mounted guide ref', async () => {
  const controller = await renderDesignerAndGetController();

  // Page index 5 does not exist — should not throw.
  expect(() => {
    act(() => {
      controller.setGuides({
        horizontal: [[], [], [], [], [], [99]],
        vertical: [[], [], [], [], [], [88]],
      });
    });
  }).not.toThrow();

  // Existing page is still accessible.
  const result = controller.getGuides();
  expect(result.horizontal).toHaveLength(1);
});
