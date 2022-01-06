import React, { forwardRef, RefObject, Ref, ReactNode } from 'react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { ZOOM, SELECTABLE_CLASSNAME } from '../../libs/constants';
import { Schema, barcodeSchemaTypes } from '../../libs/type';
import TextSchema from './TextSchema';
import ImageSchema from './ImageSchema';
import BarcodeSchema from './BarcodeSchema';

export type SchemaUIProps = {
  schema: Schema;
  editable: boolean;
  onChange: (value: string) => void;
  tabIndex?: number;
  placeholder?: string;
};

type Props = SchemaUIProps & { border: string };

const getBgc = (schema: Schema) =>
  schema.type === 'text' && schema.backgroundColor ? schema.backgroundColor : 'transparent';

const Wrapper = ({ children, border, schema }: Props & { children: ReactNode }) => (
  <div>
    <Tippy delay={0} interactive content={schema.key}>
      <div
        className={SELECTABLE_CLASSNAME}
        id={schema.id}
        style={{
          position: 'absolute',
          height: schema.height * ZOOM,
          width: schema.width * ZOOM,
          top: schema.position.y * ZOOM,
          left: schema.position.x * ZOOM,
          border,
          backgroundColor: getBgc(schema),
        }}
      >
        {children}
      </div>
    </Tippy>
  </div>
);

const SchemaUI = (props: Props, ref: Ref<HTMLTextAreaElement | HTMLInputElement>) => {
  const r = {
    [props.editable ? 'ref' : '']: ref as RefObject<HTMLTextAreaElement | HTMLInputElement>,
  };
  const { type } = props.schema;
  const barcodeTypes = barcodeSchemaTypes.map((t) => t as string);

  return (
    <Wrapper {...props}>
      {type === 'text' && <TextSchema {...r} {...props} />}
      {type === 'image' && <ImageSchema {...r} {...props} />}
      {barcodeTypes.includes(type) && <BarcodeSchema {...r} {...props} />}
    </Wrapper>
  );
};
export default forwardRef<HTMLTextAreaElement | HTMLInputElement, Props>(SchemaUI);
