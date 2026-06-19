import { getInputFromTemplate, type Template } from '@pdfme/common';
import { getFontsData } from '../helper';
import { getPlugins } from '../plugins';
import type { PlaygroundProject } from './playgroundProjects';

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(blob);
  });

export const createTemplateThumbnailDataUrl = async (
  template: Template,
  inputs?: Record<string, string>[],
) => {
  const [{ generate }, { pdf2img }] = await Promise.all([
    import('@pdfme/generator'),
    import('@pdfme/converter'),
  ]);
  const pdf = await generate({
    inputs: inputs ?? getInputFromTemplate(template),
    options: { font: getFontsData() },
    plugins: getPlugins(),
    template,
  });
  const images = await pdf2img(pdf.buffer, {
    range: { end: 1 },
  });
  const thumbnail = images[0];
  if (!thumbnail) {
    throw new Error('Failed to create template thumbnail');
  }

  return blobToDataUrl(new Blob([thumbnail], { type: 'image/png' }));
};

export const getProjectThumbnailInputs = (project: Pick<PlaygroundProject, 'inputs' | 'kind'>) =>
  project.kind === 'template' ? undefined : project.inputs;
