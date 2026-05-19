import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Designer from '../../src/components/Designer/index.js';
import { type GuidesController } from '../../src/components/Designer/Canvas/index.js';
import { I18nContext, FontContext, PluginsRegistry } from '../../src/contexts';
import { i18n } from '../../src/i18n';
import { PAGE_SIZE_PRESETS, Template, getDefaultFont, pluginRegistry } from '@pdfme/common';
import { setupUIMock, getSampleTemplate } from '../assets/helper';
import * as hooks from '../../src/hooks';
import { text, image } from '@pdfme/schemas';

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

test('getGuides does not return stale data after a page is removed', async () => {
  // Override the mock to simulate a 2-page template.
  const twoPageSizes = [PAGE_SIZE_PRESETS.A4, PAGE_SIZE_PRESETS.A4];
  vi.spyOn(hooks, 'useUIPreProcessor').mockReturnValue({
    backgrounds: ['data:image/png;base64,a...', 'data:image/png;base64,b...'],
    pageSizes: twoPageSizes,
    scale: 1,
    error: null,
    refresh: () => Promise.resolve(),
  });
  const FontFace = vi.fn().mockReturnValue({ load: () => Promise.resolve() });
  global.window.FontFace = FontFace;

  // Use a BlankPdf (not BLANK_PDF string) so template2SchemasList derives page count from
  // schemas, not from parsing a 1-page PDF (which would truncate to 1 page).
  const twoPageTemplate: Template = {
    basePdf: { width: 210, height: 297, padding: [0, 0, 0, 0] },
    schemas: [getSampleTemplate().schemas[0], []],
  };

  let capturedController: GuidesController | null = null;
  let setTemplateState!: (t: Template) => void;

  const Wrapper = () => {
    const [template, setTemplate] = React.useState<Template>(twoPageTemplate);
    setTemplateState = setTemplate;
    return (
      <I18nContext.Provider value={i18n}>
        <FontContext.Provider value={getDefaultFont()}>
          <PluginsRegistry.Provider value={pluginRegistry(plugins)}>
            <Designer
              template={template}
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
      </I18nContext.Provider>
    );
  };

  act(() => {
    render(<Wrapper />);
  });

  await waitFor(() => expect(capturedController).not.toBeNull());

  // Wait until both pages' Guides components have mounted and populated the refs.
  await waitFor(() => {
    expect(capturedController!.getGuides().horizontal).toHaveLength(2);
  });

  // Set distinct guides on page 1 (index 1) so we can detect staleness.
  act(() => {
    capturedController!.setGuides({
      horizontal: [[], [50, 100]],
      vertical: [[], [25]],
    });
  });

  expect(capturedController!.getGuides().horizontal[1]).toEqual([50, 100]);

  // Shrink to 1 page so the second Guides component unmounts.
  vi.spyOn(hooks, 'useUIPreProcessor').mockReturnValue({
    backgrounds: ['data:image/png;base64,a...'],
    pageSizes: [PAGE_SIZE_PRESETS.A4],
    scale: 1,
    error: null,
    refresh: () => Promise.resolve(),
  });

  act(() => {
    setTemplateState(getSampleTemplate());
  });

  await waitFor(() => {
    const guides = capturedController!.getGuides();
    // Every entry must be stale-free: either the slot was cleared (null → [])
    // or the array shrank. Either way no entry should hold the old [50, 100]/[25].
    expect(guides.horizontal.every((g) => g.length === 0)).toBe(true);
    expect(guides.vertical.every((g) => g.length === 0)).toBe(true);
  });
});
