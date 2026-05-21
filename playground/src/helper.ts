import {
  Template,
  Font,
  PAGE_SIZE_PRESETS,
  checkTemplate,
  getInputFromTemplate,
  getDefaultFont,
} from '@pdfme/common';
import { Form, Viewer, Designer } from '@pdfme/ui';
import { generate, generateForm } from '@pdfme/generator';
import { getPlugins } from './plugins';

const templateAssetSourceKinds = ['designer', 'jsx', 'md2pdf'] as const;

type TemplateAssetSourceKind = (typeof templateAssetSourceKinds)[number];

export type TemplateAssetMetadata = {
  description: string;
  order?: number;
  sourceKind: TemplateAssetSourceKind;
  tags: string[];
  title: string;
};

const isTemplateAssetSourceKind = (value: unknown): value is TemplateAssetSourceKind =>
  templateAssetSourceKinds.includes(value as TemplateAssetSourceKind);

export const getFontsData = (): Font => ({
  ...getDefaultFont(),
  'PinyonScript-Regular': {
    fallback: false,
    data: 'https://fonts.gstatic.com/s/pinyonscript/v22/6xKpdSJbL9-e9LuoeQiDRQR8aOLQO4bhiDY.ttf',
  },
  NotoSerifJP: {
    fallback: false,
    data: 'https://fonts.gstatic.com/s/notoserifjp/v30/xn71YHs72GKoTvER4Gn3b5eMRtWGkp6o7MjQ2bwxOubAILO5wBCU.ttf',
  },
  NotoSansJP: {
    fallback: false,
    data: 'https://fonts.gstatic.com/s/notosansjp/v53/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75vY0rw-oME.ttf',
  },
});

const getFormFontsData = (): Font =>
  Object.fromEntries(
    Object.entries(getFontsData()).map(([fontName, font]) => [
      fontName,
      { ...font, fallback: fontName === 'NotoSansJP', subset: false },
    ]),
  );

export const readFile = (file: File | null, type: 'text' | 'dataURL' | 'arrayBuffer') => {
  return new Promise<string | ArrayBuffer>((r) => {
    const fileReader = new FileReader();
    fileReader.addEventListener('load', (e) => {
      if (e && e.target && e.target.result && file !== null) {
        r(e.target.result);
      }
    });
    if (file !== null) {
      if (type === 'text') {
        fileReader.readAsText(file);
      } else if (type === 'dataURL') {
        fileReader.readAsDataURL(file);
      } else if (type === 'arrayBuffer') {
        fileReader.readAsArrayBuffer(file);
      }
    }
  });
};

export const downloadJsonFile = (json: unknown, title: string) => {
  if (typeof window !== 'undefined') {
    const blob = new Blob([JSON.stringify(json)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
};

export const translations: { label: string; value: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'th', label: 'Thai' },
  { value: 'pl', label: 'Polish' },
  { value: 'it', label: 'Italian' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
];

export const generatePDF = async (
  currentRef: Designer | Form | Viewer | null,
  output: 'pdf' | 'form' = 'pdf',
) => {
  if (!currentRef) return;
  const template = currentRef.getTemplate();
  const options = currentRef.getOptions();
  const inputs =
    typeof (currentRef as Viewer | Form).getInputs === 'function'
      ? (currentRef as Viewer | Form).getInputs()
      : getInputFromTemplate(template);
  const font = output === 'form' ? getFormFontsData() : getFontsData();

  try {
    const pdf = await (output === 'form' ? generateForm : generate)({
      template,
      inputs,
      options: {
        font,
        lang: options.lang,
        title: 'pdfme',
      },
      plugins: getPlugins(),
    });

    const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
    window.open(URL.createObjectURL(blob));
  } catch (e) {
    alert(e + '\n\nCheck the console for full stack trace');
    throw e;
  }
};

export const isJsonString = (str: string) => {
  try {
    JSON.parse(str);
  } catch {
    return false;
  }
  return true;
};

export const DEFAULT_PLAYGROUND_TEMPLATE_ID = 'invoice';

export const getBlankTemplate = () =>
  ({
    schemas: [{}],
    basePdf: {
      ...PAGE_SIZE_PRESETS.A4,
      padding: [20, 10, 20, 10],
    },
  }) as Template;

export const getTemplateById = async (templateId: string): Promise<Template> => {
  const template = await fetch(`/template-assets/${templateId}/template.json`).then((res) =>
    res.json(),
  );
  checkTemplate(template);
  return template as Template;
};

export const getTemplateMetadataById = async (
  templateId: string,
): Promise<TemplateAssetMetadata> => {
  const response = await fetch(`/template-assets/${templateId}/metadata.json`);
  if (!response.ok) {
    throw new Error(`Failed to load template metadata: ${response.statusText}`);
  }

  const metadata = (await response.json()) as Partial<TemplateAssetMetadata>;
  if (!metadata.title?.trim()) {
    throw new Error(`Template metadata "${templateId}" must include title.`);
  }
  if (!metadata.description?.trim()) {
    throw new Error(`Template metadata "${templateId}" must include description.`);
  }
  if (!isTemplateAssetSourceKind(metadata.sourceKind)) {
    throw new Error(`Template metadata "${templateId}" must include sourceKind.`);
  }
  if (!metadata.tags || metadata.tags.length === 0) {
    throw new Error(`Template metadata "${templateId}" must include tags.`);
  }

  return {
    description: metadata.description,
    order: metadata.order,
    sourceKind: metadata.sourceKind,
    tags: metadata.tags,
    title: metadata.title.trim(),
  };
};

export const getDefaultPlaygroundTemplate = () => getTemplateById(DEFAULT_PLAYGROUND_TEMPLATE_ID);
export const getDefaultPlaygroundTemplateMetadata = () =>
  getTemplateMetadataById(DEFAULT_PLAYGROUND_TEMPLATE_ID);
