import { getInputFromTemplate, type Template } from '@pdfme/common';

export type TemplateInput = Record<string, string>;

export const reconcileInputsWithTemplate = (
  template: Template,
  previousInputs: TemplateInput[] | null | undefined,
): TemplateInput[] => {
  const defaultInputs = getInputFromTemplate(template);
  if (!previousInputs || previousInputs.length === 0) return defaultInputs;

  return defaultInputs.map((defaultInput, index) => {
    const previousInput = previousInputs[index] ?? {};
    const nextInput: TemplateInput = { ...defaultInput };

    for (const name of Object.keys(nextInput)) {
      if (previousInput[name] != null) {
        nextInput[name] = previousInput[name];
      }
    }

    return nextInput;
  });
};
