import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Editor, EditorCtl } from '../src';
import { blankPdf } from '../src/constants';

export default {
  title: 'Example/TemplateEditorVisualForDev',
  component: Editor,
} as ComponentMeta<typeof Editor>;

const Template: ComponentStory<typeof Editor> = (args) => <Editor {...args} />;

// By passing using the Args format for exported stories, you can control the props for a component for reuse in a test
// https://storybook.js.org/docs/react/workflows/unit-testing
export const Default = Template.bind({});

const devTemplate = {
  columns: ['field1', 'field2'],
  sampledata: [
    {
      field1: 'aa',
      field2: 'aaaaaaaaaaaa',
    },
  ],
  fontName: '',
  basePdf: blankPdf,
  schemas: [
    {
      field1: {
        type: 'text',
        position: { x: 20, y: 20 },
        width: 100,
        height: 15,
        alignment: 'left',
        fontSize: 30,
        characterSpacing: 0,
        lineHeight: 1,
      },
      field2: {
        type: 'text',
        position: { x: 20, y: 35 },
        width: 100,
        height: 40,
        alignment: 'left',
        fontSize: 20,
        characterSpacing: 0,
        lineHeight: 1,
      },
    },
  ],
};

const getForDevTemplate = () => devTemplate;

Default.args = {
  lang: 'en',
  initTemplate: () => new Promise((r) => r(getForDevTemplate())),
  saveTemplate: (arg) => {
    console.log(arg);
    return Promise.resolve();
  },
  EditorCtl: EditorCtl,
};
