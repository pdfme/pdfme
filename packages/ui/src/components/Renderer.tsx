import React, { useEffect, useContext, ReactNode, useRef } from 'react';
import { ZOOM, UIRenderProps, SchemaForUI, Schema } from '@pdfme/common';
import { SELECTABLE_CLASSNAME } from '../constants';
import { PluginsRegistry, OptionsContext } from '../contexts';

type RendererProps = Omit<
  UIRenderProps<Schema>,
  'value' | 'schema' | 'onChange' | 'rootElement' | 'options'
> & {
  schema: SchemaForUI;
  onChange: (value: string) => void;
  outline: string;
  onChangeHoveringSchemaId?: (id: string | null) => void;
  scale: number;
};

const Wrapper = ({
  children,
  outline,
  onChangeHoveringSchemaId,
  schema,
}: RendererProps & { children: ReactNode }) => (
  <div
    title={schema.key}
    onMouseEnter={() => onChangeHoveringSchemaId && onChangeHoveringSchemaId(schema.id)}
    onMouseLeave={() => onChangeHoveringSchemaId && onChangeHoveringSchemaId(null)}
    className={SELECTABLE_CLASSNAME}
    id={schema.id}
    style={{
      position: 'absolute',
      cursor: 'pointer',
      height: schema.height * ZOOM,
      width: schema.width * ZOOM,
      top: schema.position.y * ZOOM,
      left: schema.position.x * ZOOM,
      transform: `rotate(${schema.rotate ?? 0}deg)`,
      outline,
    }}
  >
    {children}
  </div>
);

const Renderer = (props: RendererProps) => {
  const pluginsRegistry = useContext(PluginsRegistry);
  const options = useContext(OptionsContext);

  const { schema, mode, onChange, stopEditing, tabIndex, placeholder, scale } = props;

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && schema.type) {

      const render = Object.values(pluginsRegistry).find(
        (plugin) => plugin?.propPanel.defaultSchema.type === schema.type
      )?.ui

      if (!render) {
        console.error(`[@pdfme/ui] Renderer for type ${schema.type} not found.
Check this document: https://pdfme.com/docs/custom-schemas`);
        return;
      }

      ref.current.innerHTML = '';

      const editable = mode === 'form' || mode === 'designer';

      render({
        value: schema.data,
        schema,
        rootElement: ref.current,
        mode,
        onChange: editable ? onChange : undefined,
        stopEditing: editable ? stopEditing : undefined,
        tabIndex,
        placeholder,
        options,
      });
    }
    return () => {
      if (ref.current) {
        ref.current.innerHTML = '';
      }
    };
  }, [JSON.stringify(schema), mode, options, scale]);

  return (
    <Wrapper {...props}>
      <div style={{ height: '100%', width: '100%' }} ref={ref} />
    </Wrapper>
  );
};
export default Renderer;
