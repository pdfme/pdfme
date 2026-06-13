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
import { toast } from 'react-toastify';
import { getErrorMessage } from './lib/errors';
import { getPlugins } from './plugins';

const templateAssetSourceKinds = ['designer', 'jsx', 'md2pdf'] as const;
const templateAssetStatuses = ['published', 'draft'] as const;

type TemplateAssetSourceKind = (typeof templateAssetSourceKinds)[number];
type TemplateAssetStatus = (typeof templateAssetStatuses)[number];

export type TemplateAssetMetadata = {
  description: string;
  order?: number;
  sourceKind: TemplateAssetSourceKind;
  status?: TemplateAssetStatus;
  tags: string[];
  title: string;
};

const isTemplateAssetSourceKind = (value: unknown): value is TemplateAssetSourceKind =>
  templateAssetSourceKinds.includes(value as TemplateAssetSourceKind);

const isTemplateAssetStatus = (value: unknown): value is TemplateAssetStatus =>
  templateAssetStatuses.includes(value as TemplateAssetStatus);

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

export const readFile = (file: File, type: 'text' | 'dataURL' | 'arrayBuffer') => {
  return new Promise<string | ArrayBuffer>((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.addEventListener('load', () => {
      if (fileReader.result != null) {
        resolve(fileReader.result);
      } else {
        reject(new Error(`Failed to read file "${file.name}"`));
      }
    });
    fileReader.addEventListener('error', () => {
      reject(fileReader.error ?? new Error(`Failed to read file "${file.name}"`));
    });
    if (type === 'text') {
      fileReader.readAsText(file);
    } else if (type === 'dataURL') {
      fileReader.readAsDataURL(file);
    } else {
      fileReader.readAsArrayBuffer(file);
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
): Promise<boolean> => {
  if (!currentRef) return false;
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

    // Copy into a fresh Uint8Array so the Blob never picks up extra bytes
    // when the result is a view over a larger ArrayBuffer.
    const blob = new Blob([new Uint8Array(pdf)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url);
    // Release the object URL once the new tab has had time to load it.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
  } catch (e) {
    console.error(e);
    toast.error(`${getErrorMessage(e)} (check the console for the full stack trace)`);
    return false;
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
  const response = await fetch(`/template-assets/${templateId}/template.json`);
  if (!response.ok) {
    throw new Error(`Failed to load template "${templateId}": ${response.statusText}`);
  }

  const template = (await response.json()) as Template;
  checkTemplate(template);
  return template;
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
  if (metadata.status != null && !isTemplateAssetStatus(metadata.status)) {
    throw new Error(`Template metadata "${templateId}" has unsupported status.`);
  }
  if (!metadata.tags || metadata.tags.length === 0) {
    throw new Error(`Template metadata "${templateId}" must include tags.`);
  }

  return {
    description: metadata.description,
    order: metadata.order,
    sourceKind: metadata.sourceKind,
    status: metadata.status,
    tags: metadata.tags,
    title: metadata.title.trim(),
  };
};

export const getDefaultPlaygroundTemplate = () => getTemplateById(DEFAULT_PLAYGROUND_TEMPLATE_ID);
export const getDefaultPlaygroundTemplateMetadata = () =>
  getTemplateMetadataById(DEFAULT_PLAYGROUND_TEMPLATE_ID);
