const formState: Record<string, unknown> = {};

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

const FormRender = () => null;

export default FormRender;
