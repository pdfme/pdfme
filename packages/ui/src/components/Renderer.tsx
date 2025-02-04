import React, { useEffect, useContext, ReactNode, useRef, useMemo } from 'react';
import { Dict, Mode, ZOOM, UIRenderProps, SchemaForUI, BasePdf, Schema, Plugin, UIOptions, cloneDeep } from '@pdfme/common';
import { theme as antdTheme } from 'antd';
import { SELECTABLE_CLASSNAME } from '../constants';
import { PluginsRegistry, OptionsContext, I18nContext } from '../contexts';

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
  plugin: Plugin<any>,
  value: string,
  mode: Mode,
  scale: number,
  schema: SchemaForUI,
  options: UIOptions,
}

export const useRerenderDependencies = (arg: ReRenderCheckProps) => {
  const { plugin, value, mode, scale, schema, options } = arg;
  const _options = cloneDeep(options);
  if (_options.font) {
    Object.values(_options.font).forEach((fontObj) => {
      (fontObj as { data: string }).data = '...';
    });
  }
  const optionStr = JSON.stringify(_options);

  return useMemo(() => {
    if (plugin.uninterruptedEditMode && mode === 'designer') {
      return [mode];
    } else {
      return [value, mode, scale, JSON.stringify(schema), optionStr];
    }
  }, [plugin.uninterruptedEditMode, value, mode, scale, schema, optionStr]);
};


const Wrapper = ({
  children,
  outline,
  onChangeHoveringSchemaId,
  schema,
  selectable = true
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
    {schema.required &&
      <span style={{
        color: 'red',
        position: 'absolute',
        top: -12,
        left: -12,
        fontSize: 18,
        fontWeight: 700,
      }}>*</span>
    }
    {children}
  </div>
);

const Renderer = (props: RendererProps) => {
  const { schema, basePdf, value, mode, onChange, stopEditing, tabIndex, placeholder, scale } =
    props;

  const pluginsRegistry = useContext(PluginsRegistry);
  const options = useContext(OptionsContext);
  const i18n = useContext(I18nContext) as (key: keyof Dict | string) => string;
  const { token: theme } = antdTheme.useToken();

  
  const ref = useRef<HTMLDivElement>(null);
  const _cache = useRef<Map<any, any>>(new Map());
  const plugin = Object.values(pluginsRegistry).find(
    (plugin) => plugin?.propPanel.defaultSchema.type === schema.type
  ) as Plugin<any>;

  if (!plugin || !plugin.ui) {
    console.error(`[@pdfme/ui] Renderer for type ${schema.type} not found. 
Check this document: https://pdfme.com/docs/custom-schemas`);
    return <></>;
  }
  const reRenderDependencies = useRerenderDependencies({
    plugin,
    value,
    mode,
    scale,
    schema,
    options,
  });

  useEffect(() => {
    if (ref.current && schema.type) {
      ref.current.innerHTML = '';
      const render = plugin.ui;

      void render({
        value,
        schema,
        basePdf,
        rootElement: ref.current,
        mode,
        onChange,
        stopEditing,
        tabIndex,
        placeholder,
        options,
        theme,
        i18n,
        _cache: _cache.current,
      });
    }
    return () => {
      if (ref.current) {
        ref.current.innerHTML = '';
      }
    };
  }, reRenderDependencies);

  return (
    <Wrapper {...props}>
      <div style={{ height: '100%', width: '100%' }} ref={ref} />
    </Wrapper>
  );
};
export default Renderer;
