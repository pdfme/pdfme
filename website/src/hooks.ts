import { useEffect, useRef } from 'react';
import { Form, Viewer, Template } from '@pdfme/ui';
import { getFont, cloneDeep } from './libs/helper';

export const useForm = (props: {
  formRef: React.MutableRefObject<HTMLDivElement>;
  template: Template;
}) => {
  const { formRef, template } = props;
  const form = useRef<Form | null>(null);

  useEffect(() => {
    if (formRef.current) {
      getFont().then((font) => {
        form.current = new Form({
          domContainer: formRef.current,
          template,
          inputs: cloneDeep(template.sampledata ?? [{}]),
          options: { font },
        });
      });
    }
    return () => {
      form.current?.destroy();
      form.current = null;
    };
  }, [formRef.current]);

  useEffect(() => {
    form.current?.updateTemplate(template);
    form.current?.setInputs([{}]);
  }, [template, form.current]);

  return form.current;
};

export const useViewer = (props: {
  viewerRef: React.MutableRefObject<HTMLDivElement>;
  template: Template;
}) => {
  const { viewerRef, template } = props;
  const viewer = useRef<Viewer | null>(null);

  useEffect(() => {
    if (viewerRef.current) {
      getFont().then((font) => {
        viewer.current = new Viewer({
          domContainer: viewerRef.current,
          template,
          inputs: cloneDeep(template.sampledata ?? [{}]),
          options: { font },
        });
      });
    }
    return () => {
      viewer.current?.destroy();
      viewer.current = null;
    };
  }, [viewerRef.current]);

  useEffect(() => {
    viewer.current?.updateTemplate(template);
    viewer.current?.setInputs([{}]);
  }, [template, viewer.current]);

  return viewer.current;
};
