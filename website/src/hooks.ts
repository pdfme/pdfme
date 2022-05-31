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
    if (formRef.current && form.current === null) {
      getFont().then((font) => {
        form.current = new Form({
          domContainer: formRef.current,
          template,
          inputs: [{}],
          options: { font },
        });
      });
    } else {
      form.current.updateTemplate(template);
      form.current.setInputs([{}]);
    }
  }, [formRef.current, template]);

  return form.current;
};

export const useViewer = (props: {
  viewerRef: React.MutableRefObject<HTMLDivElement>;
  template: Template;
}) => {
  const { viewerRef, template } = props;
  const viewer = useRef<Viewer | null>(null);

  useEffect(() => {
    if (viewerRef.current && viewer.current === null) {
      getFont().then((font) => {
        viewer.current = new Viewer({
          domContainer: viewerRef.current,
          template,
          inputs: cloneDeep(template.sampledata ?? [{}]),
          options: { font },
        });
      });
    } else {
      viewer.current?.updateTemplate(template);
      viewer.current?.setInputs([{}]);
    }
  }, [viewerRef.current, template]);

  return viewer.current;
};
