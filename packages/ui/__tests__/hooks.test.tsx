import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { BLANK_PDF, PAGE_SIZE_PRESETS, type SchemaForUI, type Template } from '@pdfme/common';
import * as converter from '@pdfme/converter';
import * as helper from '../src/helper';
import { useInitEvents, useScrollPageCursor, useUIPreProcessor } from '../src/hooks';

vi.mock('@pdfme/converter', () => ({
  pdf2size: vi.fn(),
  pdf2img: vi.fn(),
}));

const createTemplate = (): Template => ({
  basePdf: 'data:application/pdf;base64,AA==',
  schemas: [[]],
});

test('useUIPreProcessor stores converter failures without unhandled rejections', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const pdf2sizeMock = vi.mocked(converter.pdf2size);
  const pdf2imgMock = vi.mocked(converter.pdf2img);
  const template = createTemplate();
  const size = { width: 1200, height: 1200 };

  pdf2sizeMock.mockRejectedValue(new Error('corrupt basePdf'));

  const { result } = renderHook(() =>
    useUIPreProcessor({
      template,
      size,
      zoomLevel: 1,
      maxZoom: 1,
    }),
  );

  await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));

  expect(result.current.error?.message).toContain('corrupt basePdf');
  expect(pdf2imgMock).toHaveBeenCalledTimes(1);
});

test('useUIPreProcessor runs pdf sizing and imaging in parallel with isolated buffers', async () => {
  const pdf2sizeMock = vi.mocked(converter.pdf2size);
  const pdf2imgMock = vi.mocked(converter.pdf2img);
  const template = createTemplate();
  const size = { width: 1200, height: 1200 };

  let resolvePdf2size!: (value: Array<{ width: number; height: number }>) => void;
  const pdf2sizePromise = new Promise<Array<{ width: number; height: number }>>((resolve) => {
    resolvePdf2size = resolve;
  });
  pdf2sizeMock.mockImplementation(() => pdf2sizePromise);
  pdf2imgMock.mockResolvedValueOnce([new Uint8Array([137, 80, 78, 71]).buffer]);

  const { result } = renderHook(() =>
    useUIPreProcessor({
      template,
      size,
      zoomLevel: 1,
      maxZoom: 1,
    }),
  );

  await waitFor(() => expect(pdf2imgMock).toHaveBeenCalled());

  expect(pdf2sizeMock).toHaveBeenCalled();
  expect(pdf2sizeMock.mock.calls[0][0]).not.toBe(pdf2imgMock.mock.calls[0][0]);

  resolvePdf2size([PAGE_SIZE_PRESETS.A4]);

  await waitFor(() => expect(result.current.pageSizes).toEqual([PAGE_SIZE_PRESETS.A4]));
});

test('useInitEvents paste ignores missing DOM nodes instead of storing null active elements', () => {
  vi.useFakeTimers();

  const schema = {
    id: 'field-1',
    name: 'field1',
    type: 'text',
    content: 'value',
    position: { x: 0, y: 0 },
    width: 100,
    height: 20,
  } as SchemaForUI;
  const activeElement = document.createElement('div');
  activeElement.id = schema.id;
  const template: Template = {
    basePdf: BLANK_PDF,
    schemas: [[schema]],
  };
  const pageSizes = [PAGE_SIZE_PRESETS.A4];
  const schemasList = [[schema]];
  const changeSchemas = vi.fn();
  const commitSchemas = vi.fn();
  const removeSchemas = vi.fn();
  const onSaveTemplate = vi.fn();
  const setSchemasList = vi.fn();
  const onEdit = vi.fn();
  const onEditEnd = vi.fn();
  const past = { current: [] as SchemaForUI[][] };
  const future = { current: [] as SchemaForUI[][] };

  let shortcuts: Parameters<typeof helper.initShortCuts>[0] | undefined;

  vi.spyOn(helper, 'initShortCuts').mockImplementation((arg) => {
    shortcuts = arg;
  });
  vi.spyOn(helper, 'destroyShortCuts').mockImplementation(() => undefined);
  vi.spyOn(helper, 'uuid').mockReturnValue('pasted-field');
  vi.spyOn(document, 'getElementById').mockReturnValue(null);

  renderHook(() =>
    useInitEvents({
      pageCursor: 0,
      pageSizes,
      activeElements: [activeElement],
      template,
      schemasList,
      changeSchemas,
      commitSchemas,
      removeSchemas,
      onSaveTemplate,
      past,
      future,
      setSchemasList,
      onEdit,
      onEditEnd,
    }),
  );

  expect(shortcuts).toBeDefined();

  act(() => {
    shortcuts!.copy();
    shortcuts!.paste();
    vi.runAllTimers();
  });

  expect(commitSchemas).toHaveBeenCalledTimes(1);
  expect(onEdit).toHaveBeenCalledWith([]);

  vi.useRealTimers();
});

const mockRect = ({
  left,
  top,
  width,
  height,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
}) =>
  ({
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => undefined,
  }) as DOMRect;

test('useScrollPageCursor selects the page with the largest visible area', async () => {
  const container = document.createElement('div');
  const firstPaper = document.createElement('div');
  const secondPaper = document.createElement('div');
  const containerRef = { current: container };
  const paperRefs = { current: [firstPaper, secondPaper] };
  const onChangePageCursor = vi.fn();
  let firstPaperRect = mockRect({ left: 0, top: -20, width: 100, height: 80 });
  let secondPaperRect = mockRect({ left: 0, top: 60, width: 100, height: 100 });

  vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
    mockRect({ left: 0, top: 0, width: 100, height: 100 }),
  );
  vi.spyOn(firstPaper, 'getBoundingClientRect').mockImplementation(() => firstPaperRect);
  vi.spyOn(secondPaper, 'getBoundingClientRect').mockImplementation(() => secondPaperRect);

  renderHook(() =>
    useScrollPageCursor({
      ref: containerRef,
      paperRefs,
      pageSizes: [PAGE_SIZE_PRESETS.A4, PAGE_SIZE_PRESETS.A4],
      scale: 2.5,
      pageCursor: 0,
      onChangePageCursor,
    }),
  );

  await act(async () => {
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
  });

  expect(onChangePageCursor).not.toHaveBeenCalled();

  firstPaperRect = mockRect({ left: 0, top: -60, width: 100, height: 100 });
  secondPaperRect = mockRect({ left: 0, top: 40, width: 100, height: 100 });

  act(() => {
    container.dispatchEvent(new Event('scroll'));
  });

  expect(onChangePageCursor).toHaveBeenCalledWith(1);
});
