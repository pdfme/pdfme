const formState: Record<string, unknown> = {};

type FormWatch = Record<string, (...args: unknown[]) => void>;

let formWatch: FormWatch | undefined;

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

const FormRender = ({ watch }: { watch?: FormWatch }) => {
  formWatch = watch;
  return null;
};

export default FormRender;
