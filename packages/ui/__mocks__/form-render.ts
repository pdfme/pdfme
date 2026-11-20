const formState: Record<string, unknown> = {};

type FormWatch = Record<string, (...args: unknown[]) => void>;

let formWatch: FormWatch | undefined;
let formRenderProps: Record<string, unknown> = {};

export const getFormRenderProps = () => formRenderProps;

export const useForm = () => ({
  resetFields: () => {
    Object.keys(formState).forEach((key) => {
      delete formState[key];
    });
  },
  setValues: (values: Record<string, unknown>) => {
    Object.assign(formState, values);
  },
  getValues: () => formState,
  validateFields: () => Promise.resolve(formState),
});

export const emitFormWatch = (patch: Record<string, unknown>) => {
  Object.assign(formState, patch);
  formWatch?.['#']?.(formState, patch);
};

const FormRender = (props: { watch?: FormWatch; [key: string]: unknown }) => {
  const { watch } = props;
  formRenderProps = props;
  formWatch = watch;
  return null;
};

export default FormRender;
