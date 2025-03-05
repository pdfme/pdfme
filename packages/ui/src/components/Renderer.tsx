import React, { useEffect, useContext, ReactNode, useRef, useMemo } from 'react';
import {
  Dict,
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
  plugin: Plugin<Schema>;
  value: string;
  mode: Mode;
  scale: number;
  schema: SchemaForUI;
  options: UIOptions;
};

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
  const { schema, basePdf, value, mode, onChange, stopEditing, tabIndex, placeholder } =
    props;

  const pluginsRegistry = useContext(PluginsRegistry);
  const options = useContext(OptionsContext);
  const i18n = useContext(I18nContext) as (key: keyof Dict | string) => string;
  const { token: theme } = antdTheme.useToken();

  const ref = useRef<HTMLDivElement>(null);
  const _cache = useContext(CacheContext);
  // Safely extract schema type
  const schemaType = typeof schema.type === 'string' ? schema.type : '';
  
  // Find plugin with matching schema type using a type-safe approach
  const plugin = Object.values(pluginsRegistry || {}).find(
    (plugin) => {
      if (!plugin || typeof plugin !== 'object') return false;
      if (!plugin.propPanel || typeof plugin.propPanel !== 'object') return false;
      if (!plugin.propPanel.defaultSchema || typeof plugin.propPanel.defaultSchema !== 'object') return false;
      
      // Use Record<string, unknown> to safely access properties
      const defaultSchema = plugin.propPanel.defaultSchema as Record<string, unknown>;
      return 'type' in defaultSchema && 
             typeof defaultSchema.type === 'string' && 
             defaultSchema.type === schemaType;
    }
  );

  // Always call hooks at the top level
  // Create a memoized render function to avoid dependency issues
  const renderUI = useMemo(() => {
    // Return the render function
    return () => {
      if (ref.current && schema.type && plugin && plugin.ui) {
        ref.current.innerHTML = '';
        void plugin.ui({
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
          _cache,
        });
      }
    };
  }, [
    value, schema, basePdf, mode, onChange, 
    stopEditing, tabIndex, placeholder, options, 
    theme, i18n, _cache, plugin
  ]);
  
  // Use effect with simpler dependencies
  useEffect(() => {
    // Call the memoized render function
    renderUI();
    
    // Store ref.current in a variable to avoid React hooks exhaustive-deps warning
    const currentRef = ref.current;
    return () => {
      if (currentRef) {
        currentRef.innerHTML = '';
      }
    };
  }, [renderUI]);

  if (!plugin || !plugin.ui) {
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
