import { useEffect, useRef } from 'react';
import { Form, Template } from '@pdfme/ui';
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
      form.current.destroy();
      form.current = null;
    };
  }, [formRef]);

  useEffect(() => {
    form.current?.updateTemplate(template);
    form.current?.setInputs([{}]);
  }, [template]);

  return form.current;
};
