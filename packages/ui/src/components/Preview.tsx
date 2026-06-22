import React, { useRef, useState, useEffect, useContext, useCallback } from 'react';
import {
  Template,
  SchemaForUI,
  PreviewProps,
  Size,
  getDynamicTemplate,
  isBlankPdf,
  replacePlaceholders,
} from '@pdfme/common';
import { getDynamicLayoutForSchema, isDynamicLayoutSchema } from '@pdfme/schemas/dynamicLayout';
import { getTextLineRange, mergeTextLineRangeValue } from '@pdfme/schemas/texts';
import UnitPager from './UnitPager.js';
import Root from './Root.js';
import StaticSchema from './StaticSchema.js';
import ErrorScreen from './ErrorScreen.js';
import CtlBar from './CtlBar.js';
import Paper from './Paper.js';
import Renderer from './Renderer.js';
import { useUIPreProcessor, useScrollPageCursor, useZoom } from '../hooks.js';
import { FontContext, OptionsContext } from '../contexts.js';
import { SELECTABLE_CLASSNAME } from '../constants.js';
import {
  template2SchemasList,
  getPagesScrollTopByIndex,
  useMaxZoom,
  getDynamicHeightReflowChanges,
} from '../helper.js';
import { theme } from 'antd';

const _cache = new Map<string | number, unknown>();

const applySchemaChange = (schema: SchemaForUI, key: string, value: unknown) => {
  if (key === 'position.x') {
    schema.position.x = value as number;
    return;
  }
  if (key === 'position.y') {
    schema.position.y = value as number;
    return;
  }

  // @ts-expect-error Dynamic property assignment
  schema[key] = value;
};

const Preview = ({
  template,
  inputs,
  size,
  onChangeInput,
  onPageChange,
}: Omit<PreviewProps, 'domContainer'> & {
  onChangeInput?: (args: { index: number; value: string; name: string }) => void;
  onPageChange?: (pageInfo: { currentPage: number; totalPages: number }) => void;
  size: Size;
}) => {
  const { token } = theme.useToken();

  const font = useContext(FontContext);
  const options = useContext(OptionsContext);
  const maxZoom = useMaxZoom();

  const containerRef = useRef<HTMLDivElement>(null);
  const paperRefs = useRef<HTMLDivElement[]>([]);

  const [unitCursor, setUnitCursor] = useState(0);
  const [pageCursor, setPageCursor] = useState(0);
  const [activeSchemaId, setActiveSchemaId] = useState<string | null>(null);
  const [schemasList, setSchemasList] = useState<SchemaForUI[][]>([[]] as SchemaForUI[][]);

  const { backgrounds, pageSizes, baseScale, error, refresh } = useUIPreProcessor({
    template,
    size,
    zoomLevel: 1,
    maxZoom,
  });
  const { displayScale, renderScale, zoomLevel, zoomMode, setZoomLevel, fitWidth, fitHeight } =
    useZoom({
      baseScale,
      maxZoom,
      pageCursor,
      pageSizes,
      containerRef,
      paperRefs,
      size,
      initialZoomLevel: options.zoomLevel ?? 1,
    });
  const previousOptionsZoomLevelRef = useRef(options.zoomLevel);

  const isForm = Boolean(onChangeInput);

  const input = inputs[unitCursor];
  const latestFontRef = useRef(font);
  const latestInputRef = useRef(input);
  const latestRefreshRef = useRef(refresh);
  const isMountedRef = useRef(true);
  const initRequestIdRef = useRef(0);

  useEffect(() => {
    latestFontRef.current = font;
  }, [font]);

  useEffect(() => {
    latestInputRef.current = input;
  }, [input]);

  useEffect(() => {
    latestRefreshRef.current = refresh;
  }, [refresh]);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  const init = useCallback((template: Template, inputOverride?: Record<string, string>) => {
    const requestId = ++initRequestIdRef.current;
    const currentInput = inputOverride ?? latestInputRef.current;
    const options = { font: latestFontRef.current };
    const currentRefresh = latestRefreshRef.current;
    getDynamicTemplate({
      template,
      input: currentInput,
      options,
      _cache,
      getDynamicHeights: getDynamicLayoutForSchema,
    })
      .then(async (dynamicTemplate) => {
        const sl = await template2SchemasList(dynamicTemplate);
        if (!isMountedRef.current || requestId !== initRequestIdRef.current) {
          return;
        }
        setSchemasList(sl);
        if (dynamicTemplate !== template) {
          await currentRefresh(dynamicTemplate);
        }
      })
      .catch((err) => console.error(`[@pdfme/ui] `, err));
  }, []);

  useEffect(() => {
    if (previousOptionsZoomLevelRef.current === options.zoomLevel) {
      return;
    }

    previousOptionsZoomLevelRef.current = options.zoomLevel;
    if (typeof options.zoomLevel === 'number') {
      setZoomLevel(options.zoomLevel);
    }
  }, [options.zoomLevel, setZoomLevel]);

  useEffect(() => {
    if (unitCursor > inputs.length - 1) {
      setUnitCursor(inputs.length - 1);
      return;
    }
    init(template);
  }, [init, inputs, size, template, unitCursor]);

  useEffect(() => {
    setActiveSchemaId(null);
  }, [unitCursor]);

  useScrollPageCursor({
    ref: containerRef,
    paperRefs,
    pageSizes,
    scale: displayScale,
    pageCursor,
    onChangePageCursor: (p) => {
      setPageCursor(p);
      if (onPageChange) {
        onPageChange({ currentPage: p, totalPages: schemasList.length });
      }
    },
  });

  const handleChangeInput = ({ name, value }: { name: string; value: string }) =>
    onChangeInput && onChangeInput({ index: unitCursor, name, value });

  const handleOnChangeRenderer = async (
    args: { key: string; value: unknown }[],
    schema: SchemaForUI,
  ) => {
    let isNeedInit = false;
    let newInputValue: string | undefined;

    for (const { key: _key, value } of args) {
      if (_key === 'content') {
        const oldValue = (input?.[schema.name] as string) || '';
        const rawNewValue = value as string;
        const newValue =
          schema.type === 'text' && getTextLineRange(schema)
            ? await mergeTextLineRangeValue({
                value: oldValue,
                replacement: rawNewValue,
                schema: schema as unknown as Parameters<
                  typeof mergeTextLineRangeValue
                >[0]['schema'],
                font,
                _cache,
              })
            : rawNewValue;
        if (newValue === oldValue) continue;
        handleChangeInput({ name: schema.name, value: newValue });
        // TODO Improve this to allow schema types to determine whether the execution of getDynamicTemplate is required.
        if (isDynamicLayoutSchema(schema)) {
          isNeedInit = true;
          newInputValue = newValue;
        }
      } else {
        const pageSchemas = schemasList[pageCursor] || [];
        const targetSchema = pageSchemas.find((s) => s.id === schema.id) as SchemaForUI;
        if (!targetSchema) continue;

        if (_key === 'height' && isBlankPdf(template.basePdf)) {
          getDynamicHeightReflowChanges({
            schemas: pageSchemas,
            schema: targetSchema,
            height: value,
          }).forEach(({ key, value, schemaId }) => {
            const reflowTarget = pageSchemas.find((s) => s.id === schemaId);
            if (reflowTarget) applySchemaChange(reflowTarget, key, value);
          });
        }

        applySchemaChange(targetSchema, _key, value);
      }
    }
    if (isNeedInit && newInputValue !== undefined) {
      // Pass the updated input directly to recalculate with new value
      const updatedInput = { ...input, [schema.name]: newInputValue };
      init(template, updatedInput);
    }
    setSchemasList([...schemasList]);
  };

  if (error) {
    return <ErrorScreen size={size} error={error} />;
  }

  return (
    <Root size={size} scale={displayScale}>
      <CtlBar
        size={size}
        pageCursor={pageCursor}
        pageNum={schemasList.length}
        setPageCursor={(p) => {
          if (!containerRef.current) return;
          containerRef.current.scrollTop = getPagesScrollTopByIndex(pageSizes, p, displayScale);
          setPageCursor(p);
          if (onPageChange) {
            onPageChange({ currentPage: p, totalPages: schemasList.length });
          }
        }}
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
        zoomMode={zoomMode}
        fitWidth={fitWidth}
        fitHeight={fitHeight}
      />
      <UnitPager
        size={size}
        unitCursor={unitCursor}
        unitNum={inputs.length}
        setUnitCursor={setUnitCursor}
      />
      <div
        ref={containerRef}
        onPointerDown={(event) => {
          if (!isForm) return;
          const target = event.target;
          if (!(target instanceof Element) || !target.closest(`.${SELECTABLE_CLASSNAME}`)) {
            setActiveSchemaId(null);
          }
        }}
        style={{ ...size, position: 'relative', overflow: 'auto' }}
      >
        <Paper
          paperRefs={paperRefs}
          scale={displayScale}
          size={size}
          schemasList={schemasList}
          pageSizes={pageSizes}
          backgrounds={backgrounds}
          renderSchema={({ schema, index }) => {
            const hasInputValue = Boolean(
              input && Object.prototype.hasOwnProperty.call(input, schema.name),
            );
            const value = schema.readOnly
              ? replacePlaceholders({
                  content: schema.content || '',
                  variables: { ...input, totalPages: schemasList.length, currentPage: index + 1 },
                  schemas: schemasList,
                })
              : String(hasInputValue ? (input?.[schema.name] ?? '') : '');
            return (
              <Renderer
                key={schema.id}
                schema={schema}
                basePdf={template.basePdf}
                value={value}
                mode={isForm ? 'form' : 'viewer'}
                placeholder={hasInputValue ? undefined : schema.content}
                tabIndex={index + 100}
                onChange={(arg) => {
                  const args = Array.isArray(arg) ? arg : [arg];
                  void handleOnChangeRenderer(args, schema);
                }}
                outline={
                  isForm && !schema.readOnly ? `1px dashed ${token.colorPrimary}` : 'transparent'
                }
                scale={renderScale}
                isActive={isForm && activeSchemaId === schema.id}
                onChangeActiveSchemaId={isForm ? setActiveSchemaId : undefined}
              />
            );
          }}
          renderPaper={({ index }) => (
            <StaticSchema
              template={template}
              scale={renderScale}
              input={input}
              totalPages={schemasList.length}
              currentPage={index + 1}
            />
          )}
        />
      </div>
    </Root>
  );
};

export default Preview;
