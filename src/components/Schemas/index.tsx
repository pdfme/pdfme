import React, { forwardRef, RefObject, Ref, ReactNode } from 'react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { zoom, selectableClassName, barcodeList } from '../../libs/constants';
import { Schema } from '../../libs/type';
import TextSchema from './TextSchema';
import ImageSchema from './ImageSchema';
import BarcodeSchema from './BarcodeSchema';

export type SchemaUIProps = {
  schema: Schema;
  editable: boolean;
  placeholder: string;
  tabIndex: number;
  onChange: (value: string) => void;
};

type Props = SchemaUIProps & { border: string };

const getBgc = (schema: Schema) =>
  schema.type === 'text' && schema.backgroundColor ? schema.backgroundColor : 'transparent';

const Wapper = ({ children, border, schema }: Props & { children: ReactNode }) => (
  <div>
    <Tippy delay={0} interactive content={schema.key}>
      <div
        className={selectableClassName}
        id={schema.id}
        style={{
          position: 'absolute',
          height: schema.height * zoom,
          width: schema.width * zoom,
          top: schema.position.y * zoom,
          left: schema.position.x * zoom,
          border,
          backgroundColor: getBgc(schema),
        }}
      >
        {children}
      </div>
    </Tippy>
  </div>
);

const Schema = (props: Props, ref: Ref<HTMLTextAreaElement | HTMLInputElement>) => {
  const r = {
    [props.editable ? 'ref' : '']: ref as RefObject<HTMLTextAreaElement | HTMLInputElement>,
  };

  return (
    <Wapper {...props}>
      {props.schema.type === 'text' && <TextSchema {...r} {...props} />}
      {props.schema.type === 'image' && <ImageSchema {...r} {...props} />}
      {(barcodeList as string[]).includes(props.schema.type) && <BarcodeSchema {...r} {...props} />}
    </Wapper>
  );
};
export default forwardRef<HTMLTextAreaElement | HTMLInputElement, Props>(Schema);
