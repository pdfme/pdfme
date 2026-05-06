/** @jsxImportSource @pdfme/jsx */
import { describe, expect, it } from 'vitest';
import { PAGE_SIZE_PRESETS } from '@pdfme/common';

import {
  Box,
  Ellipse,
  Image,
  Line,
  List,
  MultiVariableText,
  Page,
  PageBreak,
  Rectangle,
  Row,
  Spacer,
  Stack,
  Svg,
  Table,
  Text,
} from '../components.js';
import { renderToTemplate } from '../render.js';

const SAMPLE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

const SAMPLE_SVG = '<svg viewBox="0 0 10 10"><path d="M0 0h10v10H0z"/></svg>';

describe('@pdfme/jsx renderToTemplate', () => {
  it('renders a Page with a fixed Text schema', async () => {
    const result = await renderToTemplate(
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

  it('renders named Text as an input-backed schema', async () => {
    const result = await renderToTemplate(
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

  it('renders named MultiVariableText as a JSON input-backed schema', async () => {
    const result = await renderToTemplate(
      <Page>
        <MultiVariableText
          name="message"
          text="Hello **{name}**, status: `{status}`"
          values={{ name: 'Alice **literal**', status: 'draft' }}
          textFormat="inline-markdown"
          size={12}
        />
      </Page>,
    );

    const schema = result.template.schemas[0]?.[0];
    const value = JSON.stringify({ name: 'Alice **literal**', status: 'draft' });
    expect(schema).toMatchObject({
      name: 'message',
      type: 'multiVariableText',
      readOnly: false,
      content: value,
      text: 'Hello **{name}**, status: `{status}`',
      variables: ['name', 'status'],
      textFormat: 'inline-markdown',
      fontSize: 12,
    });
    expect(schema?.height).toBeGreaterThan(0);
    expect(result.inputs[0]).toEqual({ message: value });
  });

  it('renders unnamed MultiVariableText as resolved read-only text', async () => {
    const result = await renderToTemplate(
      <Page>
        <MultiVariableText text="Hello {name}" values={{ name: 'Alice' }} />
      </Page>,
    );

    const schema = result.template.schemas[0]?.[0];
    expect(schema).toMatchObject({
      type: 'multiVariableText',
      readOnly: true,
      content: 'Hello Alice',
      text: 'Hello {name}',
      variables: ['name'],
    });
    expect(schema?.height).toBeGreaterThan(0);
    expect(result.inputs[0]).toEqual({});
  });

  it('orders MultiVariableText variables from props, template placeholders, then values', async () => {
    const result = await renderToTemplate(
      <Page>
        <MultiVariableText
          name="message"
          text="Hello {name}, role: {role}"
          variables={['manual', 'role']}
          values={{ status: 'draft' }}
        />
      </Page>,
    );

    expect(result.template.schemas[0]?.[0]).toMatchObject({
      type: 'multiVariableText',
      variables: ['manual', 'role', 'name', 'status'],
    });
  });

  it('escapes read-only MultiVariableText values inside inline-markdown', async () => {
    const result = await renderToTemplate(
      <Page>
        <MultiVariableText
          text="Hello **{name}**"
          values={{ name: 'Alice **literal**' }}
          textFormat="inline-markdown"
        />
      </Page>,
    );

    const schema = result.template.schemas[0]?.[0];
    expect(schema).toMatchObject({
      type: 'multiVariableText',
      readOnly: true,
      textFormat: 'inline-markdown',
    });
    expect(schema?.content).toContain('Alice \\*\\*literal\\*\\*');
    expect(schema?.content).not.toContain('Alice **literal**');
  });

  it('uses MultiVariableText children as the template string', async () => {
    const result = await renderToTemplate(
      <Page>
        <MultiVariableText values={{ name: 'Alice' }}>{'Hello {name}'}</MultiVariableText>
      </Page>,
    );

    expect(result.template.schemas[0]?.[0]).toMatchObject({
      type: 'multiVariableText',
      readOnly: true,
      text: 'Hello {name}',
      content: 'Hello Alice',
      variables: ['name'],
    });
  });

  it('removes missing MultiVariableText placeholder values from read-only content', async () => {
    const result = await renderToTemplate(
      <Page>
        <MultiVariableText text="Hello {name}, {missing}" values={{ name: 'Alice' }} />
      </Page>,
    );

    expect(result.template.schemas[0]?.[0]).toMatchObject({
      type: 'multiVariableText',
      readOnly: true,
      content: 'Hello Alice, ',
      variables: ['name', 'missing'],
    });
  });

  it('uses Page font as the default fontName', async () => {
    const result = await renderToTemplate(
      <Page font="Roboto">
        <Box>
          <Text>Title</Text>
        </Box>
      </Page>,
    );

    expect(result.template.schemas[0]?.[0]?.fontName).toBe('Roboto');
  });

  it('uses shared page size presets with orientation', async () => {
    const result = await renderToTemplate(
      <Page size="Letter" orientation="landscape">
        <Text>Landscape</Text>
      </Page>,
    );

    expect(result.template.basePdf).toMatchObject({
      width: 279.4,
      height: 215.9,
    });
  });

  it('stacks children with gaps and spacer height', async () => {
    const result = await renderToTemplate(
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

  it('accounts for child margins in Stack layout', async () => {
    const result = await renderToTemplate(
      <Page size={{ width: 100, height: 100 }} margin={0}>
        <Stack gap={2}>
          <Text height={6} margin={{ top: 1, bottom: 2, left: 3 }}>
            A
          </Text>
          <Text height={6}>B</Text>
        </Stack>
      </Page>,
    );

    const [first, second] = result.template.schemas[0] ?? [];
    expect(first).toMatchObject({
      position: { x: 3, y: 1 },
      width: 97,
    });
    expect(second?.position.y).toBe(11);
  });

  it('accounts for Spacer margins in Stack layout', async () => {
    const result = await renderToTemplate(
      <Page size={{ width: 100, height: 100 }} margin={0}>
        <Stack gap={1}>
          <Text height={4}>A</Text>
          <Spacer height={3} margin={{ top: 2, bottom: 5 }} />
          <Text height={4}>B</Text>
        </Stack>
      </Page>,
    );

    const [, second] = result.template.schemas[0] ?? [];
    expect(second?.position.y).toBe(16);
  });

  it('aligns fixed-width Stack children on the cross axis', async () => {
    const result = await renderToTemplate(
      <Page size={{ width: 100, height: 100 }} margin={0}>
        <Stack alignItems="center">
          <Text width={40} height={6}>
            Centered
          </Text>
        </Stack>
      </Page>,
    );

    expect(result.template.schemas[0]?.[0]).toMatchObject({
      position: { x: 30, y: 0 },
      width: 40,
    });
  });

  it('justifies Stack children on the main axis when height is explicit', async () => {
    const result = await renderToTemplate(
      <Page size={{ width: 100, height: 100 }} margin={0}>
        <Stack height={30} justifyContent="end">
          <Text height={6}>A</Text>
          <Text height={4}>B</Text>
        </Stack>
        <Text height={4}>After</Text>
      </Page>,
    );

    const [first, second, after] = result.template.schemas[0] ?? [];
    expect(first?.position.y).toBe(20);
    expect(second?.position.y).toBe(26);
    expect(after?.position.y).toBe(30);
  });

  it('measures Text auto height with pdfme text wrapping', async () => {
    const singleLine = await renderToTemplate(
      <Page margin={0}>
        <Text width={60}>Short text</Text>
      </Page>,
    );
    const wrapped = await renderToTemplate(
      <Page margin={0}>
        <Text width={20}>This text should wrap into several rendered lines.</Text>
      </Page>,
    );

    expect(wrapped.template.schemas[0]?.[0]?.height).toBeGreaterThan(
      singleLine.template.schemas[0]?.[0]?.height ?? 0,
    );
  });

  it('distributes Row width across flex children', async () => {
    const result = await renderToTemplate(
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

  it('distributes Row width by flexGrow weights', async () => {
    const result = await renderToTemplate(
      <Page size={{ width: 120, height: 100 }} margin={0}>
        <Row>
          <Text flexGrow={2}>Wide</Text>
          <Text flex={1}>Narrow</Text>
        </Row>
      </Page>,
    );

    const [wide, narrow] = result.template.schemas[0] ?? [];
    expect(wide).toMatchObject({
      position: { x: 0, y: 0 },
      width: 80,
    });
    expect(narrow).toMatchObject({
      position: { x: 80, y: 0 },
      width: 40,
    });
  });

  it('uses explicit Row width as flex basis before flexGrow', async () => {
    const result = await renderToTemplate(
      <Page size={{ width: 120, height: 100 }} margin={0}>
        <Row width={120}>
          <Text width={20} flexGrow={1}>
            A
          </Text>
          <Text width={20} flexGrow={3}>
            B
          </Text>
        </Row>
      </Page>,
    );

    const [first, second] = result.template.schemas[0] ?? [];
    expect(first).toMatchObject({ position: { x: 0, y: 0 }, width: 40 });
    expect(second).toMatchObject({ position: { x: 40, y: 0 }, width: 80 });
  });

  it('accounts for child margins when distributing Row width', async () => {
    const result = await renderToTemplate(
      <Page size={{ width: 100, height: 100 }} margin={0}>
        <Row gap={4}>
          <Text width={20} margin={{ right: 2 }}>
            Fixed
          </Text>
          <Text margin={{ left: 2 }}>Flex 1</Text>
          <Text>Flex 2</Text>
        </Row>
      </Page>,
    );

    const [, flex1, flex2] = result.template.schemas[0] ?? [];
    expect(flex1).toMatchObject({
      position: { x: 28, y: 0 },
      width: 34,
    });
    expect(flex2).toMatchObject({
      position: { x: 66, y: 0 },
      width: 34,
    });
  });

  it('aligns Row children on the cross axis', async () => {
    const result = await renderToTemplate(
      <Page size={{ width: 100, height: 100 }} margin={0}>
        <Row alignItems="center">
          <Text width={20} height={6}>
            Small
          </Text>
          <Text width={20} height={14}>
            Tall
          </Text>
        </Row>
      </Page>,
    );

    const [small, tall] = result.template.schemas[0] ?? [];
    expect(small?.position.y).toBe(4);
    expect(tall?.position.y).toBe(0);
  });

  it('justifies fixed-width Row children on the main axis', async () => {
    const result = await renderToTemplate(
      <Page size={{ width: 100, height: 100 }} margin={0}>
        <Row width={100} justifyContent="space-between">
          <Text width={20} height={6}>
            A
          </Text>
          <Text width={20} height={6}>
            B
          </Text>
          <Text width={20} height={6}>
            C
          </Text>
        </Row>
      </Page>,
    );

    const [first, second, third] = result.template.schemas[0] ?? [];
    expect(first?.position.x).toBe(0);
    expect(second?.position.x).toBe(40);
    expect(third?.position.x).toBe(80);
  });

  it('uses explicit Row height for Stack advancement', async () => {
    const result = await renderToTemplate(
      <Page size={{ width: 100, height: 100 }} margin={0}>
        <Stack>
          <Row height={20}>
            <Text width={20} height={6}>
              Row item
            </Text>
          </Row>
          <Text height={6}>After row</Text>
        </Stack>
      </Page>,
    );

    const [, after] = result.template.schemas[0] ?? [];
    expect(after?.position.y).toBe(20);
  });

  it('renders Box background before its children', async () => {
    const result = await renderToTemplate(
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

  it('does not render a rectangle schema for a Box without visual styles', async () => {
    const result = await renderToTemplate(
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

  it('renders List and Table schemas with readOnly content by default', async () => {
    const result = await renderToTemplate(
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

  it('renders Image and Svg schemas', async () => {
    const result = await renderToTemplate(
      <Page margin={0}>
        <Stack gap={2}>
          <Image src={SAMPLE_PNG} width={20} height={12} rotate={5} opacity={0.8} />
          <Svg width={18} height={10} rotate={10} opacity={0.6}>
            {SAMPLE_SVG}
          </Svg>
        </Stack>
      </Page>,
    );

    const [image, svg] = result.template.schemas[0] ?? [];
    expect(image).toMatchObject({
      type: 'image',
      content: SAMPLE_PNG,
      readOnly: true,
      position: { x: 0, y: 0 },
      width: 20,
      height: 12,
      rotate: 5,
      opacity: 0.8,
    });
    expect(svg).toMatchObject({
      type: 'svg',
      content: SAMPLE_SVG,
      readOnly: true,
      position: { x: 0, y: 14 },
      width: 18,
      height: 10,
      rotate: 10,
      opacity: 0.6,
    });
  });

  it('renders named Image and Svg as input-backed schemas', async () => {
    const result = await renderToTemplate(
      <Page margin={0}>
        <Image name="logo" src={SAMPLE_PNG} width={20} height={12} />
        <Svg name="icon" svg={SAMPLE_SVG} width={10} height={10} />
      </Page>,
    );

    const [image, svg] = result.template.schemas[0] ?? [];
    expect(image).toMatchObject({ name: 'logo', type: 'image', readOnly: false });
    expect(svg).toMatchObject({ name: 'icon', type: 'svg', readOnly: false });
    expect(result.inputs[0]).toEqual({ logo: SAMPLE_PNG, icon: SAMPLE_SVG });
  });

  it('uses empty input values for named Image and Svg without initial content', async () => {
    const result = await renderToTemplate(
      <Page margin={0}>
        <Image name="logo" width={20} height={12} />
        <Svg name="icon" width={10} height={10} />
      </Page>,
    );

    const [image, svg] = result.template.schemas[0] ?? [];
    expect(image).toMatchObject({ name: 'logo', type: 'image', content: '', readOnly: false });
    expect(svg).toMatchObject({ name: 'icon', type: 'svg', content: '', readOnly: false });
    expect(result.inputs[0]).toEqual({ logo: '', icon: '' });
  });

  it('renders visual shape and line schemas', async () => {
    const result = await renderToTemplate(
      <Page margin={0}>
        <Stack gap={1}>
          <Rectangle width={30} height={10} fill="#eeeeee" radius={2} />
          <Ellipse width={12} height={8} fill="#00aa88" borderColor="#004433" />
          <Line height={0.8} color="#555555" />
        </Stack>
      </Page>,
    );

    const [rectangle, ellipse, line] = result.template.schemas[0] ?? [];
    expect(rectangle).toMatchObject({
      type: 'rectangle',
      color: '#eeeeee',
      borderWidth: 0,
      radius: 2,
      position: { x: 0, y: 0 },
      width: 30,
      height: 10,
      readOnly: true,
    });
    expect(ellipse).toMatchObject({
      type: 'ellipse',
      color: '#00aa88',
      borderWidth: 1,
      borderColor: '#004433',
      position: { x: 0, y: 11 },
      width: 12,
      height: 8,
    });
    expect(line).toMatchObject({
      type: 'line',
      color: '#555555',
      position: { x: 0, y: 20 },
      width: 210,
      height: 0.8,
      readOnly: true,
    });
  });

  it('uses an outline by default for empty Rectangle', async () => {
    const result = await renderToTemplate(
      <Page margin={0}>
        <Rectangle width={20} height={8} />
      </Page>,
    );

    expect(result.template.schemas[0]?.[0]).toMatchObject({
      type: 'rectangle',
      color: '',
      borderWidth: 1,
      borderColor: '#000000',
    });
  });

  it('rejects duplicate names across visual schemas', async () => {
    await expect(
      renderToTemplate(
        <Page margin={0}>
          <Rectangle name="mark" width={20} height={8} />
          <Ellipse name="mark" width={8} height={8} />
        </Page>,
      ),
    ).rejects.toThrow('duplicate schema name "mark"');
  });

  it('splits pages at PageBreak', async () => {
    const result = await renderToTemplate(
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

  it('rejects PageBreak inside Row', async () => {
    await expect(
      renderToTemplate(
        <Page>
          <Row>
            <Text>Before</Text>
            <PageBreak />
            <Text>After</Text>
          </Row>
        </Page>,
      ),
    ).rejects.toThrow('<PageBreak> can only be used inside <Page>, <Stack>, or <Box>');

    await expect(
      renderToTemplate(
        <Page>
          <Row>
            <Stack>
              <PageBreak />
            </Stack>
          </Row>
        </Page>,
      ),
    ).rejects.toThrow('<PageBreak> can only be used inside <Page>, <Stack>, or <Box>');
  });

  it('accepts a fragment of Page nodes', async () => {
    const result = await renderToTemplate(
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

  it('rejects mixed Page sizes and margins', async () => {
    await expect(
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
    ).rejects.toThrow('all <Page> nodes must use the same size');

    await expect(
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
    ).rejects.toThrow('all <Page> nodes must use the same size');
  });

  it('uses per-prefix auto names', async () => {
    const result = await renderToTemplate(
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

  it('throws on duplicate explicit schema names', async () => {
    await expect(
      renderToTemplate(
        <Page>
          <Text name="field">First</Text>
          <Text name="field">Second</Text>
        </Page>,
      ),
    ).rejects.toThrow('duplicate schema name "field"');
  });

  it('keeps named inputs merged across rendered pages', async () => {
    const result = await renderToTemplate(
      <Page>
        <Text name="first">First</Text>
        <PageBreak />
        <Text name="second">Second</Text>
      </Page>,
    );

    expect(result.template.schemas).toHaveLength(2);
    expect(result.inputs).toEqual([{ first: 'First', second: 'Second' }]);
  });

  it('supports Stack inside Row flex allocation', async () => {
    const result = await renderToTemplate(
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

  it('preserves inline-markdown textFormat for linked text', async () => {
    const result = await renderToTemplate(
      <Page>
        <Text textFormat="inline-markdown">[pdfme](https://pdfme.com)</Text>
      </Page>,
    );

    expect(result.template.schemas[0]?.[0]).toMatchObject({
      type: 'text',
      textFormat: 'inline-markdown',
      content: '[pdfme](https://pdfme.com)',
    });
    expect(result.template.schemas[0]?.[0]?.height).toBeGreaterThan(0);
  });

  it('rejects inline-markdown for editable Text', async () => {
    await expect(
      renderToTemplate(
        <Page>
          <Text name="message" textFormat="inline-markdown">
            [pdfme](https://pdfme.com)
          </Text>
        </Page>,
      ),
    ).rejects.toThrow('editable <Text> does not support textFormat="inline-markdown"');
  });
});
