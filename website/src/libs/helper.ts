import { Template, Font, checkTemplate, getInputFromTemplate } from '@pdfme/common';
import { examplePdfb64, dogPngb64 } from './sampleData';
export const getSampleTemplate = (): Template => ({
  schemas: [
    {
      name: {
        type: 'text',
        content: 'Pet Name',
        position: {
          x: 25.06,
          y: 26.35,
        },
        width: 77.77,
        height: 18.7,
        fontSize: 36,
        fontColor: '#14b351',
      },

      photo: {
        type: 'image',
        content: dogPngb64,
        position: {
          x: 24.99,
          y: 65.61,
        },
        width: 60.66,
        height: 93.78,
      },
      age: {
        type: 'text',
        content: '4 years',
        position: {
          x: 36,
          y: 179.46,
        },
        width: 43.38,
        height: 6.12,
        fontSize: 12,
      },
      sex: {
        type: 'text',
        content: 'Male',
        position: {
          x: 36,
          y: 186.23,
        },
        width: 43.38,
        height: 6.12,
        fontSize: 12,
      },
      weight: {
        type: 'text',
        content: '33 pounds',
        position: {
          x: 40,
          y: 192.99,
        },
        width: 43.38,
        height: 6.12,
        fontSize: 12,
      },
      breed: {
        type: 'text',
        content: 'Mutt',
        position: {
          x: 40,
          y: 199.09,
        },
        width: 43.38,
        height: 6.12,
        fontSize: 12,
      },
      owner: {
        type: 'qrcode',
        content: 'https://pdfme.com/',
        position: {
          x: 115.09,
          y: 204.43,
        },
        width: 26.53,
        height: 26.53,
      },
    },
  ],
  basePdf: examplePdfb64,
});

export const cloneDeep = (obj) => JSON.parse(JSON.stringify(obj));

export const downloadJsonFile = (json: any, title: string) => {
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

export const getTemplateFromJsonFile = (file: File) => {
  return readFile(file, 'text').then((jsonStr) => {
    const template: Template = JSON.parse(jsonStr as string);
    try {
      checkTemplate(template);
      return template;
    } catch (e) {
      throw e;
    }
  });
};

export const getGeneratorSampleCode = (template: Template) =>
  `import { text, image, barcodes } from "@pdfme/schemas";
import { generate } from "@pdfme/generator";

(async () => {
  const template = ${JSON.stringify(template, null, 2)};
  const plugins = { text, image, qrcode: barcodes.qrcode };
  const inputs = ${JSON.stringify(getInputFromTemplate(template), null, 2)};

  const pdf = await generate({ template, plugins, inputs });

  // Node.js
  // fs.writeFileSync(path.join(__dirname, 'test.pdf'), pdf);

  // Browser
  const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
  window.open(URL.createObjectURL(blob));
})();`.trim();

export const getDesignerSampleCode = (template: Template) =>
  `import { text, image, barcodes } from "@pdfme/schemas";
import { Designer } from "@pdfme/ui";

const domContainer = document.getElementById('container');
const template = ${JSON.stringify(template, null, 2)};
const plugins = { text, image, qrcode: barcodes.qrcode };

const designer = new Designer({ domContainer, template, plugins });`.trim();

export const getFormSampleCode = (template: Template) =>
  `import { text, image, barcodes } from "@pdfme/schemas";
import { Form } from "@pdfme/ui";

const domContainer = document.getElementById('container');
const template = ${JSON.stringify(template, null, 2)};
const plugins = { text, image, qrcode: barcodes.qrcode };
const inputs = ${JSON.stringify(getInputFromTemplate(template), null, 2)};

const form = new Form({ domContainer, template, plugins, inputs });`.trim();

export const getViewerSampleCode = (template: Template) =>
  `import { text, image, barcodes } from "@pdfme/schemas";
import { Viewer } from "@pdfme/ui";

const domContainer = document.getElementById('container');
const template = ${JSON.stringify(template, null, 2)};
const plugins = { text, image, qrcode: barcodes.qrcode };
const inputs = ${JSON.stringify(getInputFromTemplate(template), null, 2)};

const viewer = new Viewer({ domContainer, template, plugins });`.trim();

const fonts = ['Roboto-Regular', 'PinyonScript-Regular'];
export const getFont = () =>
  Promise.all(
    fonts.map((font) => fetch(`/fonts/${font}.ttf`).then((res) => res.arrayBuffer()))
  ).then((buffers) =>
    fonts.reduce(
      (acc, cur, index) =>
        Object.assign(acc, {
          [cur]: { data: buffers[index], fallback: index === 0 },
        }),
      {} as Font
    )
  );

const divide = <T>(ary: T[], n: number): T[][] => {
  if (!Array.isArray(ary) || isNaN(n)) throw Error('Error: divide unexpected argument'); // eslint-disable-line
  let idx = 0;
  const results = [];
  while (idx + n < ary.length) {
    const result = ary.slice(idx, idx + n);
    results.push(result);
    idx += n;
  }

  const rest = ary.slice(idx, ary.length + 1);
  results.push(rest);
  return results;
};

const get = (obj: any, path: string | number, defaultValue?: any) => {
  const travel = (regexp: RegExp) =>
    String.prototype.split
      .call(path, regexp)
      .filter(Boolean)
      .reduce((res, key) => (res !== null && res !== undefined ? res[key] : res), obj);
  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
  return result === undefined || result === obj ? defaultValue : result;
};

const getLabelLengthInPage = (template: Template) => {
  if (!isMultiLabel(template)) return 1;
  const keys = template.schemas.flatMap((schemaObj) => Object.keys(schemaObj));
  const rowNums = keys.map((column) => Number(column.match(/^{\d+}/)![0].replace(/{|}/g, '')));
  return Math.max(...rowNums);
};

const isMultiLabel = (template: Template) => {
  const keys = template.schemas.flatMap((schemaObj) => Object.keys(schemaObj));
  if (keys.length === 0) return false;
  const regex = RegExp(/^{\d+}.*/);
  return regex.test(keys[0]);
};

export const normalizeDatas = (datas: { [key: string]: string }[], template: Template) => {
  if (!isMultiLabel(template)) return datas;
  const returnData = divide(datas, getLabelLengthInPage(template)).map((labelsInPage) =>
    labelsInPage.reduce((obj, data, index) => {
      Object.entries(data).forEach((entry) => {
        const [key, value] = entry;
        obj[`{${index + 1}}${key}`] = value; // eslint-disable-line
      });
      return obj;
    }, {})
  );
  return returnData;
};

export const deNormalizeDatas = (datas: { [key: string]: string }[], template: Template) => {
  if (!isMultiLabel(template)) return datas;
  const result: any[] = [];
  const labelLengthInPage = getLabelLengthInPage(template);
  datas.forEach((data, _index) => {
    const length = labelLengthInPage * _index;
    Object.entries(data).forEach((entry) => {
      let [key, value] = entry;
      const prop = key.replace(/\{(\d+)\}/g, '');
      const index =
        Number(
          key
            .match(/\{(\d+)\}/g)?.[0]
            .replace('{', '')
            .replace('}', '')
        ) - 1;
      result[index + length] = {
        ...get(result, index + length, {}),
        [prop]: value,
      };
    });
  });
  return result;
};
