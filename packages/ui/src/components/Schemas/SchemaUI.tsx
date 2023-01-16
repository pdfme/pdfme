import React, { forwardRef, RefObject, Ref, ReactNode } from 'react';
import { SchemaForUI, isTextSchema, isImageSchema, isBarcodeSchema } from '@pdfme/common';
import { ZOOM, SELECTABLE_CLASSNAME } from '../../constants';
import TextSchema from './TextSchema';
import ImageSchema from './ImageSchema';
import BarcodeSchema from './BarcodeSchema';

export interface SchemaUIProps {
  schema: SchemaForUI;
  editable: boolean;
  onChange: (value: string) => void;
  tabIndex?: number;
  placeholder?: string;
}

type Props = SchemaUIProps & {
  border: string;
  onChangeHoveringSchemaId?: (id: string | null) => void;
};

const Wrapper = ({
  children,
  border,
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
      border,
    }}
  >
    {children}
  </div>
);

const SchemaUI = (props: Props, ref: Ref<HTMLTextAreaElement | HTMLInputElement>) => {
  const r = {
    [props.editable ? 'ref' : '']: ref as RefObject<HTMLTextAreaElement | HTMLInputElement>,
  };
  const { schema } = props;

  return (
    <Wrapper {...props}>
      {isTextSchema(schema) && <TextSchema {...r} {...props} schema={schema} />}
      {isImageSchema(schema) && <ImageSchema {...r} {...props} schema={schema} />}
      {isBarcodeSchema(schema) && <BarcodeSchema {...r} {...props} schema={schema} />}
    </Wrapper>
  );
};
export default forwardRef<HTMLTextAreaElement | HTMLInputElement, Props>(SchemaUI);
