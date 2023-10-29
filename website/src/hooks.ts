import { useEffect, useRef, useState } from 'react';
import type { Template } from '@pdfme/common';
import type { Form, Viewer } from '@pdfme/ui';
import { text, image, barcodes } from '@pdfme/schemas';
import { getFont } from './libs/helper';

const useForceUpdate = () => {
  const [, forceUpdate] = useState(0);
  return () => forceUpdate((s) => s + 1);
};

export const useForm = (props: {
  formRef: React.MutableRefObject<HTMLDivElement>;
  template: Template | null;
}) => {
  const { formRef, template } = props;
  const form = useRef<Form | null>(null);
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    if (formRef.current && form.current === null && template) {
      Promise.all([import('@pdfme/ui'), getFont()]).then(([{ Form }, font]) => {
        form.current = new Form({
          domContainer: formRef.current,
          template,
          plugins: { text, image, ...barcodes },
          inputs: [{}],
          options: { font },
        });
        form.current.onChangeInput(forceUpdate);
        forceUpdate();
      });
    } else if (form.current && template) {
      form.current?.updateTemplate(template);
      form.current.setInputs([{}]);
    }
    forceUpdate();
  }, [formRef.current, template]);

  return form.current;
};

export const useViewer = (props: {
  viewerRef: React.MutableRefObject<HTMLDivElement>;
  template: Template | null;
}) => {
  const { viewerRef, template } = props;
  const viewer = useRef<Viewer | null>(null);
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    if (viewerRef.current && viewer.current === null && template) {
      Promise.all([import('@pdfme/ui'), getFont()]).then(([{ Viewer }, font]) => {
        viewer.current = new Viewer({
          domContainer: viewerRef.current,
          template,
          plugins: { text, image, ...barcodes },
          inputs: [{}],
          options: { font },
        });
        forceUpdate();
      });
    } else if (viewer.current && template) {
      viewer.current?.updateTemplate(template);
      viewer.current.setInputs([{}]);
    }
    forceUpdate();
  }, [viewerRef.current, template]);

  return viewer.current;
};
