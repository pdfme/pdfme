/** @jsxImportSource @pdfme/jsx */
import { describe, expect, it } from 'vitest';
import { PAGE_SIZE_PRESETS } from '@pdfme/common';

import { Box, List, Page, PageBreak, Row, Spacer, Stack, Table, Text } from '../components.js';
import { renderToTemplate } from '../render.js';

describe('@pdfme/jsx renderToTemplate', () => {
  it('renders a Page with a fixed Text schema', () => {
    const result = renderToTemplate(
      <Page margin={{ x: 10, y: 12 }}>
        <Text size={14} align="center">
          Hello pdfme
        </Text>
      </Page>,
    );

    expect(result.template.basePdf).toMatchObject({
      ...PAGE_SIZE_PRESETS.A4,
      padding: [12, 10, 12, 10],
    });
    expect(result.template.schemas).toHaveLength(1);
    expect(result.template.schemas[0]).toHaveLength(1);

    const text = result.template.schemas[0]?.[0];
    expect(text).toMatchObject({
      type: 'text',
      content: 'Hello pdfme',
      readOnly: true,
      position: { x: 10, y: 12 },
      width: 190,
      fontSize: 14,
      alignment: 'center',
    });
    expect(result.inputs).toEqual([{}]);
  });

  it('renders named Text as an input-backed schema', () => {
    const result = renderToTemplate(
      <Page>
        <Text name="customerName">Alice</Text>
      </Page>,
    );

    const text = result.template.schemas[0]?.[0];
    expect(text).toMatchObject({
      name: 'customerName',
      readOnly: false,
      content: 'Alice',
    });
    expect(result.inputs[0]).toEqual({ customerName: 'Alice' });
  });

  it('uses Page font as the default fontName', () => {
    const result = renderToTemplate(
      <Page font="Roboto">
        <Text>Title</Text>
      </Page>,
    );

    expect(result.template.schemas[0]?.[0]?.fontName).toBe('Roboto');
  });

  it('uses shared page size presets with orientation', () => {
    const result = renderToTemplate(
      <Page size="Letter" orientation="landscape">
        <Text>Landscape</Text>
      </Page>,
    );

    expect(result.template.basePdf).toMatchObject({
      width: 279.4,
      height: 215.9,
    });
  });

  it('stacks children with gaps and spacer height', () => {
    const result = renderToTemplate(
      <Page margin={0}>
        <Stack gap={2}>
          <Text height={6}>A</Text>
          <Spacer height={4} />
          <Text height={6}>B</Text>
        </Stack>
      </Page>,
    );

    const [first, second] = result.template.schemas[0] ?? [];
    expect(first?.position.y).toBe(0);
    expect(second?.position.y).toBe(14);
  });

  it('distributes Row width across flex children', () => {
    const result = renderToTemplate(
      <Page size={{ width: 100, height: 100 }} margin={0}>
        <Row gap={4}>
          <Text width={20}>Fixed</Text>
          <Text>Flex 1</Text>
          <Text>Flex 2</Text>
        </Row>
      </Page>,
    );

    const [, flex1, flex2] = result.template.schemas[0] ?? [];
    expect(flex1?.position.x).toBe(24);
    expect(flex1?.width).toBe(36);
    expect(flex2?.position.x).toBe(64);
    expect(flex2?.width).toBe(36);
  });

  it('renders Box background before its children', () => {
    const result = renderToTemplate(
      <Page margin={0}>
        <Box background="#eeeeee" padding={2}>
          <Text height={6}>Inside</Text>
        </Box>
      </Page>,
    );

    const [box, text] = result.template.schemas[0] ?? [];
    expect(box).toMatchObject({
      type: 'rectangle',
      color: '#eeeeee',
      position: { x: 0, y: 0 },
      height: 10,
    });
    expect(text).toMatchObject({
      type: 'text',
      position: { x: 2, y: 2 },
    });
  });

  it('renders List and Table schemas with readOnly content by default', () => {
    const result = renderToTemplate(
      <Page>
        <List items={['One', { text: 'Two', level: 1 }]} listStyle="ordered" />
        <Table
          head={['Name', 'Score']}
          rows={[
            ['Alice', 10],
            ['Bob', 12],
          ]}
          widths={[70, 30]}
        />
      </Page>,
    );

    const [list, table] = result.template.schemas[0] ?? [];
    expect(list).toMatchObject({
      type: 'list',
      readOnly: true,
      listStyle: 'ordered',
    });
    expect(JSON.parse(list?.content ?? '[]')).toEqual(['One', '\tTwo']);
    expect(table).toMatchObject({
      type: 'table',
      readOnly: true,
      head: ['Name', 'Score'],
      headWidthPercentages: [70, 30],
    });
    expect(JSON.parse(table?.content ?? '[]')).toEqual([
      ['Alice', '10'],
      ['Bob', '12'],
    ]);
  });

  it('splits pages at PageBreak', () => {
    const result = renderToTemplate(
      <Page>
        <Text>First</Text>
        <PageBreak />
        <Text>Second</Text>
      </Page>,
    );

    expect(result.template.schemas).toHaveLength(2);
    expect(result.template.schemas[0]?.[0]?.content).toBe('First');
    expect(result.template.schemas[1]?.[0]?.content).toBe('Second');
  });

  it('accepts a fragment of Page nodes', () => {
    const result = renderToTemplate(
      <>
        <Page>
          <Text>First</Text>
        </Page>
        <Page>
          <Text>Second</Text>
        </Page>
      </>,
    );

    expect(result.template.schemas).toHaveLength(2);
    expect(result.template.schemas[0]?.[0]?.content).toBe('First');
    expect(result.template.schemas[1]?.[0]?.content).toBe('Second');
  });

  it('preserves inline-markdown textFormat for linked text', () => {
    const result = renderToTemplate(
      <Page>
        <Text textFormat="inline-markdown">[pdfme](https://pdfme.com)</Text>
      </Page>,
    );

    expect(result.template.schemas[0]?.[0]).toMatchObject({
      type: 'text',
      textFormat: 'inline-markdown',
      content: '[pdfme](https://pdfme.com)',
    });
  });
});
