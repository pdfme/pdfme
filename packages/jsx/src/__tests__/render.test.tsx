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
      verticalAlignment: 'top',
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
        <Box>
          <Text>Title</Text>
        </Box>
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

  it('does not render a rectangle schema for a Box without visual styles', () => {
    const result = renderToTemplate(
      <Page margin={0}>
        <Box padding={2}>
          <Text height={6}>Inside</Text>
        </Box>
      </Page>,
    );

    expect(result.template.schemas[0]).toHaveLength(1);
    expect(result.template.schemas[0]?.[0]).toMatchObject({
      type: 'text',
      content: 'Inside',
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

  it('rejects PageBreak inside Row', () => {
    expect(() =>
      renderToTemplate(
        <Page>
          <Row>
            <Text>Before</Text>
            <PageBreak />
            <Text>After</Text>
          </Row>
        </Page>,
      ),
    ).toThrow('<PageBreak> can only be used inside <Page>, <Stack>, or <Box>');

    expect(() =>
      renderToTemplate(
        <Page>
          <Row>
            <Stack>
              <PageBreak />
            </Stack>
          </Row>
        </Page>,
      ),
    ).toThrow('<PageBreak> can only be used inside <Page>, <Stack>, or <Box>');
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

  it('rejects mixed Page sizes and margins', () => {
    expect(() =>
      renderToTemplate(
        <>
          <Page size="A4" margin={10}>
            <Text>First</Text>
          </Page>
          <Page size="Letter" margin={10}>
            <Text>Second</Text>
          </Page>
        </>,
      ),
    ).toThrow('all <Page> nodes must use the same size');

    expect(() =>
      renderToTemplate(
        <>
          <Page margin={10}>
            <Text>First</Text>
          </Page>
          <Page margin={12}>
            <Text>Second</Text>
          </Page>
        </>,
      ),
    ).toThrow('all <Page> nodes must use the same size');
  });

  it('uses per-prefix auto names', () => {
    const result = renderToTemplate(
      <Page>
        <Text>First</Text>
        <List items={['One']} />
        <Text>Second</Text>
      </Page>,
    );

    expect(result.template.schemas[0]?.map((schema) => schema.name)).toEqual([
      'text_1',
      'list_1',
      'text_2',
    ]);
  });

  it('throws on duplicate explicit schema names', () => {
    expect(() =>
      renderToTemplate(
        <Page>
          <Text name="field">First</Text>
          <Text name="field">Second</Text>
        </Page>,
      ),
    ).toThrow('duplicate schema name "field"');
  });

  it('keeps named inputs merged across rendered pages', () => {
    const result = renderToTemplate(
      <Page>
        <Text name="first">First</Text>
        <PageBreak />
        <Text name="second">Second</Text>
      </Page>,
    );

    expect(result.template.schemas).toHaveLength(2);
    expect(result.inputs).toEqual([{ first: 'First', second: 'Second' }]);
  });

  it('supports Stack inside Row flex allocation', () => {
    const result = renderToTemplate(
      <Page size={{ width: 100, height: 100 }} margin={0}>
        <Row gap={4}>
          <Text width={20}>Fixed</Text>
          <Stack>
            <Text height={6}>Nested</Text>
          </Stack>
        </Row>
      </Page>,
    );

    const [, nested] = result.template.schemas[0] ?? [];
    expect(nested).toMatchObject({
      content: 'Nested',
      position: { x: 24, y: 0 },
      width: 76,
    });
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
