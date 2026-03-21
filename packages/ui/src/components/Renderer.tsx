import React, { useEffect, useContext, ReactNode, useRef, useMemo } from 'react';
import {
  Mode,
  ZOOM,
  UIRenderProps,
  SchemaForUI,
  BasePdf,
  Schema,
  Plugin,
  UIOptions,
  cloneDeep,
} from '@pdfme/common';
import { theme as antdTheme } from 'antd';
import { SELECTABLE_CLASSNAME } from '../constants.js';
import { PluginsRegistry, OptionsContext, I18nContext, CacheContext } from '../contexts.js';

type RendererProps = Omit<
  UIRenderProps<Schema>,
  'schema' | 'rootElement' | 'options' | 'theme' | 'i18n' | '_cache'
> & {
  basePdf: BasePdf;
  schema: SchemaForUI;
  value: string;
  outline: string;
  onChangeHoveringSchemaId?: (id: string | null) => void;
  scale: number;
  selectable?: boolean;
};

type ReRenderCheckProps = {
  plugin?: Plugin<Schema>;
  value: string;
  mode: Mode;
  scale: number;
  schema: SchemaForUI;
  options: UIOptions;
};

const useRenderKey = (arg: ReRenderCheckProps) => {
  const { plugin, value, mode, scale, schema, options } = arg;
  const _options = cloneDeep(options);
  if (_options.font) {
    Object.values(_options.font).forEach((fontObj) => {
      (fontObj as { data: string }).data = '...';
    });
  }
  const optionStr = JSON.stringify(_options);

  return useMemo(() => {
    if (plugin?.uninterruptedEditMode && mode === 'designer') {
      return mode;
    } else {
      return JSON.stringify([value, mode, scale, schema, optionStr]);
    }
  }, [value, mode, scale, schema, optionStr, plugin]);
};

const Wrapper = ({
  children,
  outline,
  onChangeHoveringSchemaId,
  schema,
  selectable = true,
}: RendererProps & { children: ReactNode }) => (
  <div
    title={schema.name}
    onMouseEnter={() => onChangeHoveringSchemaId && onChangeHoveringSchemaId(schema.id)}
    onMouseLeave={() => onChangeHoveringSchemaId && onChangeHoveringSchemaId(null)}
    className={selectable ? SELECTABLE_CLASSNAME : ''}
    id={schema.id}
    style={{
      position: 'absolute',
      cursor: schema.readOnly ? 'initial' : 'pointer',
      height: schema.height * ZOOM,
      width: schema.width * ZOOM,
      top: schema.position.y * ZOOM,
      left: schema.position.x * ZOOM,
      transform: `rotate(${schema.rotate ?? 0}deg)`,
      opacity: schema.opacity ?? 1,
      outline,
    }}
  >
    {schema.required && (
      <span
        style={{
          color: 'red',
          position: 'absolute',
          top: -12,
          left: -12,
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        *
      </span>
    )}
    {children}
  </div>
);

const Renderer = (props: RendererProps) => {
  const { schema, basePdf, value, mode, onChange, stopEditing, tabIndex, placeholder, scale } =
    props;

  const pluginsRegistry = useContext(PluginsRegistry);
  const options = useContext(OptionsContext);
  const i18n = useContext(I18nContext) as (key: string) => string;
  const { token: theme } = antdTheme.useToken();

  const ref = useRef<HTMLDivElement>(null);
  const _cache = useContext(CacheContext);
  const plugin = pluginsRegistry.findByType(schema.type);
  const renderArgsRef = useRef({
    plugin,
    value,
    schema,
    basePdf,
    mode,
    onChange,
    stopEditing,
    tabIndex,
    placeholder,
    options,
    theme,
    i18n,
    scale,
    _cache,
  });

  renderArgsRef.current = {
    plugin,
    value,
    schema,
    basePdf,
    mode,
    onChange,
    stopEditing,
    tabIndex,
    placeholder,
    options,
    theme,
    i18n,
    scale,
    _cache,
  };

  const renderKey = useRenderKey({
    plugin,
    value,
    mode,
    scale,
    schema,
    options,
  });

  useEffect(() => {
    const element = ref.current;
    const renderArgs = renderArgsRef.current;
    if (!renderArgs.plugin?.ui || !element || !schema.type) return;

    let cancelled = false;
    element.innerHTML = '';
    element.dataset.pdfmeRenderReady = 'false';
    const render = renderArgs.plugin.ui;

    void Promise.resolve(
      render({
        value: renderArgs.value,
        schema: renderArgs.schema,
        basePdf: renderArgs.basePdf,
        rootElement: element,
        mode: renderArgs.mode,
        onChange: renderArgs.onChange,
        stopEditing: renderArgs.stopEditing,
        tabIndex: renderArgs.tabIndex,
        placeholder: renderArgs.placeholder,
        options: renderArgs.options,
        theme: renderArgs.theme,
        i18n: renderArgs.i18n,
        scale: renderArgs.scale,
        _cache: renderArgs._cache,
      }),
    ).finally(() => {
      if (!cancelled) {
        element.dataset.pdfmeRenderReady = 'true';
      }
    });

    return () => {
      cancelled = true;
      if (element) {
        element.innerHTML = '';
        delete element.dataset.pdfmeRenderReady;
      }
    };
  }, [renderKey, schema.type]);

  if (!plugin) {
    console.error(`[@pdfme/ui] Renderer for type ${schema.type} not found. 
Check this document: https://pdfme.com/docs/custom-schemas`);
    return <></>;
  }

  return (
    <Wrapper {...props}>
      <div style={{ height: '100%', width: '100%' }} ref={ref} />
    </Wrapper>
  );
};
export default Renderer;
