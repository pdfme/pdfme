import { BLANK_PDF, Template } from '@pdfme/common';
import { PDFDocument } from '@pdfme/pdf-lib';
import { select } from '@pdfme/schemas';
import generateForm from '../src/generateForm.js';
import { getFont } from './utils.js';

describe('generateForm', () => {
  test('creates a blank AcroForm from editable text without inputs', async () => {
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [
        [
          {
            name: 'patientName',
            type: 'text',
            content: '',
            position: { x: 20, y: 25 },
            width: 80,
            height: 10,
            fontSize: 12,
            required: true,
          },
        ],
      ],
    };

    const pdf = await generateForm({ template });
    const field = (await PDFDocument.load(pdf)).getForm().getTextField('patientName');

    expect(field.getText()).toBeUndefined();
    expect(field.isMultiline()).toBe(true);
    expect(field.isRequired()).toBe(true);
  });

  test('prefills AcroForm text fields and leaves readOnly text as normal PDF content', async () => {
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [
        [
          {
            name: 'patientName',
            type: 'text',
            content: '',
            position: { x: 20, y: 25 },
            width: 80,
            height: 10,
            fontName: 'NotoSansJP',
            fontSize: 12,
          },
          {
            name: 'fixedLabel',
            type: 'text',
            readOnly: true,
            content: 'Patient',
            position: { x: 20, y: 40 },
            width: 80,
            height: 10,
            fontSize: 12,
          },
        ],
      ],
    };

    const pdf = await generateForm({
      inputs: [{ patientName: '山田 太郎' }],
      template,
      options: { font: getFont() },
    });

    const form = (await PDFDocument.load(pdf)).getForm();

    expect(form.getFields().map((field) => field.getName())).toEqual(['patientName']);
    expect(form.getTextField('patientName').getText()).toBe('山田 太郎');
  });

  test('renames duplicate fields during multi-input generation', async () => {
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [
        [
          {
            name: 'patientName',
            type: 'text',
            content: '',
            position: { x: 20, y: 25 },
            width: 80,
            height: 10,
            fontSize: 12,
          },
        ],
      ],
    };

    const pdf = await generateForm({
      inputs: [{ patientName: 'first' }, { patientName: 'second' }],
      template,
    });

    const fieldNames = (await PDFDocument.load(pdf))
      .getForm()
      .getFields()
      .map((field) => field.getName());

    expect(fieldNames).toEqual(['patientName', 'patientName_2']);
  });

  test('converts editable checkbox schemas into AcroForm checkboxes', async () => {
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [
        [
          {
            name: 'agreement',
            type: 'checkbox',
            content: 'false',
            position: { x: 20, y: 25 },
            width: 8,
            height: 8,
            color: '#000000',
            required: true,
          },
        ],
      ],
    };

    const pdf = await generateForm({
      inputs: [{ agreement: 'true' }],
      template,
    });

    const field = (await PDFDocument.load(pdf)).getForm().getCheckBox('agreement');

    expect(field.isChecked()).toBe(true);
    expect(field.isRequired()).toBe(true);
  });

  test('converts editable radioGroup schemas into an AcroForm radio group', async () => {
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [
        [
          {
            name: 'genderMale',
            type: 'radioGroup',
            content: 'false',
            position: { x: 20, y: 25 },
            width: 8,
            height: 8,
            group: 'gender',
            color: '#000000',
            required: true,
          },
          {
            name: 'genderFemale',
            type: 'radioGroup',
            content: 'false',
            position: { x: 45, y: 25 },
            width: 8,
            height: 8,
            group: 'gender',
            color: '#000000',
            required: true,
          },
        ],
      ],
    };

    const pdf = await generateForm({
      inputs: [{ genderMale: 'false', genderFemale: 'true' }],
      template,
    });

    const field = (await PDFDocument.load(pdf)).getForm().getRadioGroup('gender');

    expect(field.getOptions()).toEqual(['genderMale', 'genderFemale']);
    expect(field.getSelected()).toBe('genderFemale');
    expect(field.isRequired()).toBe(true);
  });

  test('renames radio group fields during multi-input generation', async () => {
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [
        [
          {
            name: 'answerYes',
            type: 'radioGroup',
            content: 'false',
            position: { x: 20, y: 25 },
            width: 8,
            height: 8,
            group: 'answer',
            color: '#000000',
          },
          {
            name: 'answerNo',
            type: 'radioGroup',
            content: 'false',
            position: { x: 45, y: 25 },
            width: 8,
            height: 8,
            group: 'answer',
            color: '#000000',
          },
        ],
      ],
    };

    const pdf = await generateForm({
      inputs: [
        { answerYes: 'true', answerNo: 'false' },
        { answerYes: 'false', answerNo: 'true' },
      ],
      template,
    });

    const form = (await PDFDocument.load(pdf)).getForm();

    expect(form.getFields().map((field) => field.getName())).toEqual(['answer', 'answer_2']);
    expect(form.getRadioGroup('answer').getSelected()).toBe('answerYes');
    expect(form.getRadioGroup('answer_2').getSelected()).toBe('answerNo');
  });

  test('does not require inputs for required editable schemas that are not AcroForm fields yet', async () => {
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [
        [
          {
            name: 'department',
            type: 'select',
            content: '',
            position: { x: 20, y: 25 },
            width: 80,
            height: 10,
            options: ['Internal medicine', 'Surgery'],
            required: true,
          },
        ],
      ],
    };

    const pdf = await generateForm({
      template,
      plugins: { Select: select },
    });

    expect((await PDFDocument.load(pdf)).getForm().getFields()).toEqual([]);
  });
});
