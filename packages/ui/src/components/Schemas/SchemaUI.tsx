import React, { useEffect, useContext, ReactNode, useRef } from 'react';
import { isImageSchema, isBarcodeSchema } from '@pdfme/common';
import ImageSchema from './ImageSchema';
import BarcodeSchema from './BarcodeSchema';
import { ZOOM, SELECTABLE_CLASSNAME } from '../../constants';
import { RendererContext, OptionsContext } from '../../contexts';
import { SchemaUIProps } from "../../types"

type Props = SchemaUIProps & {
  outline: string;
  onChangeHoveringSchemaId?: (id: string | null) => void;
};

const Wrapper = ({
  children,
  outline,
  onChangeHoveringSchemaId,
  schema,
}: Props & { children: ReactNode }) => (
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
      outline,
    }}
  >
    {children}
  </div>
);

const SchemaUI = (props: Props) => {
  const rendererRegistry = useContext(RendererContext);
  const options = useContext(OptionsContext);

  const { schema, editable, onChange, stopEditing, tabIndex, placeholder } = props;

  const ref = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (ref.current && schema.type) {
      const schemaType = schema.type as string;
      const renderer = rendererRegistry[schemaType];
      if (!renderer) {
        console.error(`Renderer for type ${schema.type} not found`);
        return;
      }

      renderer.render({
        value: schema.data,
        schema,
        rootElement: ref.current,
        editing: editable, // FIXME editingが正しく動かないはず というかeditingという名前がよくない mode という名前がいいかも
        onChange: editable ? onChange : undefined,
        stopEditing: editable ? stopEditing : undefined, // FIXME これもchangeModeとかにしたい
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
  }, [JSON.stringify(schema), editable, options]);


  return (
    <Wrapper {...props}>
      <div ref={ref}></div>
      {/* {isImageSchema(schema) && <ImageSchema {...r} {...props} schema={schema} />} */}
      {/* {isBarcodeSchema(schema) && <BarcodeSchema {...r} {...props} schema={schema} />}  */}
    </Wrapper>
  );
};
export default SchemaUI
