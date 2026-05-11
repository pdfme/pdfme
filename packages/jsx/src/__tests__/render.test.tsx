/** @jsxImportSource @pdfme/jsx */
import { describe, expect, it } from 'vitest';
import { isBlankPdf, PAGE_SIZE_PRESETS } from '@pdfme/common';

import {
  Absolute,
  Box,
  Document,
  Ellipse,
  Footer,
  Header,
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
  Static,
  Svg,
  Table,
  Text,
} from '../components.js';
import { renderToTemplate } from '../render.js';

const SAMPLE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

const SAMPLE_SVG = '<svg viewBox="0 0 10 10"><path d="M0 0h10v10H0z"/></svg>';
const RuntimeStatic = Static as unknown as (props: {
  placement: string;
  children?: unknown;
}) => ReturnType<typeof Static>;

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

  it('renders Text padding and border box props', async () => {
    const result = await renderToTemplate(
      <Page>
        <Text borderColor="#d0d7de" borderWidth={{ left: 0.8 }} padding={{ x: 3, y: 2 }}>
          Boxed text
        </Text>
      </Page>,
    );

    expect(result.template.schemas[0]?.[0]).toMatchObject({
      type: 'text',
      borderColor: '#d0d7de',
      borderWidth: { top: 0, right: 0, bottom: 0, left: 0.8 },
      padding: { top: 2, right: 3, bottom: 2, left: 3 },
    });
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

  it('returns explicit Stack height even when content overflows', async () => {
    const result = await renderToTemplate(
      <Page size={{ width: 100, height: 100 }} margin={0}>
        <Stack height={5} justifyContent="center">
          <Text height={10}>Overflow</Text>
        </Stack>
        <Text height={4}>After</Text>
      </Page>,
    );

    const [overflow, after] = result.template.schemas[0] ?? [];
    expect(overflow?.position.y).toBe(0);
    expect(after?.position.y).toBe(5);
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

  it('advances Stack children by auto-measured Text height', async () => {
    const result = await renderToTemplate(
      <Page margin={0}>
        <Stack gap={2}>
          <Text width={24} lineHeight={1.2}>
            This text wraps and does not specify height.
          </Text>
          <Text>After measured text</Text>
        </Stack>
      </Page>,
    );

    const [measured, after] = result.template.schemas[0] ?? [];
    expect(measured?.height).toBeGreaterThan(0);
    expect(after?.position.y).toBeCloseTo((measured?.height ?? 0) + 2);
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

  it('accounts for margins when distributing Row flexGrow width', async () => {
    const result = await renderToTemplate(
      <Page size={{ width: 120, height: 100 }} margin={0}>
        <Row gap={4}>
          <Text flexGrow={1} margin={{ left: 5, right: 5 }}>
            A
          </Text>
          <Text flexGrow={1}>B</Text>
        </Row>
      </Page>,
    );

    const [first, second] = result.template.schemas[0] ?? [];
    expect(first).toMatchObject({ position: { x: 5, y: 0 }, width: 53 });
    expect(second).toMatchObject({ position: { x: 67, y: 0 }, width: 53 });
  });

  it('renders zero-width Row child when flexGrow is zero without width', async () => {
    const result = await renderToTemplate(
      <Page size={{ width: 120, height: 100 }} margin={0}>
        <Row>
          <Text flexGrow={0}>Zero</Text>
          <Text>B</Text>
        </Row>
      </Page>,
    );

    const [zero, second] = result.template.schemas[0] ?? [];
    expect(zero).toMatchObject({ position: { x: 0, y: 0 }, width: 0 });
    expect(second).toMatchObject({ position: { x: 0, y: 0 }, width: 120 });
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

  it('grows Box background around auto-measured child content', async () => {
    const result = await renderToTemplate(
      <Page margin={0}>
        <Stack>
          <Box background="#eeeeee" padding={{ x: 3, y: 2 }}>
            <Text width={24} lineHeight={1.2}>
              Auto measured text inside a visual Box.
            </Text>
          </Box>
          <Text>After box</Text>
        </Stack>
      </Page>,
    );

    const [box, text, after] = result.template.schemas[0] ?? [];
    expect(text?.height).toBeGreaterThan(0);
    expect(box).toMatchObject({
      type: 'rectangle',
      color: '#eeeeee',
      position: { x: 0, y: 0 },
      height: (text?.height ?? 0) + 4,
    });
    expect(after?.position.y).toBeCloseTo(box?.height ?? 0);
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
          columnWeights={[70, 30]}
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

  it('normalizes Table columnWeights as relative column weights', async () => {
    const result = await renderToTemplate(
      <Page>
        <Table
          head={['Label', 'Description']}
          rows={[['Font', 'NotoSansJP']]}
          columnWeights={[38, 92]}
        />
      </Page>,
    );

    const [table] = result.template.schemas[0] ?? [];
    expect(table?.headWidthPercentages).toEqual([29.230769230769234, 70.76923076923077]);
  });

  it('defaults missing or invalid Table columnWeights to 1', async () => {
    const result = await renderToTemplate(
      <Page>
        <Table
          head={['A', 'B', 'C', 'D']}
          rows={[['1', '2', '3', '4']]}
          columnWeights={[50, 0, Number.NaN]}
        />
      </Page>,
    );

    const [table] = result.template.schemas[0] ?? [];
    const widths = Array.isArray(table?.headWidthPercentages) ? table.headWidthPercentages : [];
    expect(widths).toHaveLength(4);
    expect(widths[0]).toBeCloseTo((50 / 53) * 100);
    expect(widths[1]).toBeCloseTo((1 / 53) * 100);
    expect(widths[2]).toBeCloseTo((1 / 53) * 100);
    expect(widths[3]).toBeCloseTo((1 / 53) * 100);
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

  it('renders Absolute children without advancing Page flow', async () => {
    const result = await renderToTemplate(
      <Page size={{ width: 100, height: 100 }} margin={10}>
        <Text height={5}>Before</Text>
        <Absolute x={20} y={30} width={40}>
          <Text height={6}>Pinned</Text>
        </Absolute>
        <Text height={5}>After</Text>
      </Page>,
    );

    const [before, pinned, after] = result.template.schemas[0] ?? [];
    expect(before).toMatchObject({ content: 'Before', position: { x: 10, y: 10 } });
    expect(pinned).toMatchObject({
      content: 'Pinned',
      position: { x: 30, y: 40 },
      width: 40,
      height: 6,
    });
    expect(after).toMatchObject({ content: 'After', position: { x: 10, y: 15 } });
  });

  it('uses the full parent frame for Absolute when placement props are omitted', async () => {
    const result = await renderToTemplate(
      <Page size={{ width: 100, height: 100 }} margin={10}>
        <Absolute>
          <Text height={6}>Overlay</Text>
        </Absolute>
      </Page>,
    );

    expect(result.template.schemas[0]?.[0]).toMatchObject({
      content: 'Overlay',
      position: { x: 10, y: 10 },
      width: 80,
    });
  });

  it('renders multiple Absolute siblings independently in declaration order', async () => {
    const result = await renderToTemplate(
      <Page size={{ width: 100, height: 100 }} margin={0}>
        <Absolute x={10} y={5} width={20}>
          <Text height={6}>First</Text>
        </Absolute>
        <Absolute x={50} y={8} width={30}>
          <Text height={6}>Second</Text>
        </Absolute>
      </Page>,
    );

    expect(result.template.schemas[0]?.map((schema) => schema.content)).toEqual([
      'First',
      'Second',
    ]);
    expect(result.template.schemas[0]?.[0]).toMatchObject({ position: { x: 10, y: 5 } });
    expect(result.template.schemas[0]?.[1]).toMatchObject({ position: { x: 50, y: 8 } });
  });

  it('uses the Box content frame as the Absolute coordinate origin', async () => {
    const result = await renderToTemplate(
      <Page size={{ width: 100, height: 100 }} margin={0}>
        <Box padding={5}>
          <Absolute x={10} y={8} width={20}>
            <Text height={6}>Badge</Text>
          </Absolute>
          <Text height={6}>Flow</Text>
        </Box>
      </Page>,
    );

    const [badge, flow] = result.template.schemas[0] ?? [];
    expect(badge).toMatchObject({
      content: 'Badge',
      position: { x: 15, y: 13 },
      width: 20,
    });
    expect(flow).toMatchObject({ content: 'Flow', position: { x: 5, y: 5 } });
  });

  it('rejects Absolute outside Page, Header, Footer, Static, or Box', async () => {
    await expect(
      renderToTemplate(
        <Page>
          <Stack>
            <Absolute>
              <Text>Pin</Text>
            </Absolute>
          </Stack>
        </Page>,
      ),
    ).rejects.toThrow(
      '<Absolute> can only be used inside <Page>, <Header>, <Footer>, <Static>, or <Box>',
    );

    await expect(
      renderToTemplate(
        <Page>
          <Row>
            <Absolute>
              <Text>Pin</Text>
            </Absolute>
          </Row>
        </Page>,
      ),
    ).rejects.toThrow(
      '<Absolute> can only be used inside <Page>, <Header>, <Footer>, <Static>, or <Box>',
    );

    await expect(
      renderToTemplate(
        <Page>
          <Absolute>
            <Absolute>
              <Text>Pin</Text>
            </Absolute>
          </Absolute>
        </Page>,
      ),
    ).rejects.toThrow(
      '<Absolute> can only be used inside <Page>, <Header>, <Footer>, <Static>, or <Box>',
    );
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

  it('renders Document static children into blank basePdf staticSchema', async () => {
    const result = await renderToTemplate(
      <Document size={{ width: 100, height: 100 }} margin={10}>
        <Static>
          <Text height={6}>Overlay</Text>
        </Static>
        <Page>
          <Text height={6}>Body</Text>
        </Page>
      </Document>,
    );

    expect(isBlankPdf(result.template.basePdf)).toBe(true);
    if (!isBlankPdf(result.template.basePdf)) throw new Error('Expected blank basePdf');

    expect(result.template.basePdf.staticSchema).toHaveLength(1);
    expect(result.template.basePdf.staticSchema?.[0]).toMatchObject({
      type: 'text',
      content: 'Overlay',
      readOnly: true,
      position: { x: 0, y: 0 },
      width: 100,
      height: 6,
    });
    expect(result.template.schemas[0]?.[0]).toMatchObject({
      type: 'text',
      content: 'Body',
      position: { x: 10, y: 10 },
      width: 80,
    });
    expect(result.inputs).toEqual([{}]);
  });

  it('uses Document props as defaults for child Pages', async () => {
    const result = await renderToTemplate(
      <Document size={{ width: 100, height: 100 }} margin={{ x: 8, y: 12 }} font="NotoSansJP">
        <Page>
          <Text height={6}>First</Text>
        </Page>
        <Page>
          <Text height={6}>Second</Text>
        </Page>
      </Document>,
    );

    expect(result.template.basePdf).toMatchObject({
      width: 100,
      height: 100,
      padding: [12, 8, 12, 8],
    });
    expect(result.template.schemas[0]?.[0]).toMatchObject({
      content: 'First',
      fontName: 'NotoSansJP',
      position: { x: 8, y: 12 },
      width: 84,
    });
    expect(result.template.schemas[1]?.[0]).toMatchObject({
      content: 'Second',
      fontName: 'NotoSansJP',
      position: { x: 8, y: 12 },
      width: 84,
    });
  });

  it('lets Page props override Document defaults', async () => {
    const result = await renderToTemplate(
      <Document size={{ width: 100, height: 100 }} margin={10} font="NotoSansJP">
        <Page margin={{ x: 6, y: 14 }} font="Helvetica">
          <Text height={6}>Override</Text>
        </Page>
      </Document>,
    );

    expect(result.template.basePdf).toMatchObject({
      width: 100,
      height: 100,
      padding: [14, 6, 14, 6],
    });
    expect(result.template.schemas[0]?.[0]).toMatchObject({
      content: 'Override',
      fontName: 'Helvetica',
      position: { x: 6, y: 14 },
      width: 88,
    });
  });

  it('places Header and Footer inside the page margin areas', async () => {
    const result = await renderToTemplate(
      <Document size={{ width: 100, height: 100 }} margin={10}>
        <Header>
          <Text height={5}>Header</Text>
        </Header>
        <Footer>
          <Text height={4}>Footer</Text>
        </Footer>
        <Page>
          <Text height={6}>Body</Text>
        </Page>
      </Document>,
    );

    expect(isBlankPdf(result.template.basePdf)).toBe(true);
    if (!isBlankPdf(result.template.basePdf)) throw new Error('Expected blank basePdf');

    const [header, footer] = result.template.basePdf.staticSchema ?? [];
    expect(header).toMatchObject({ content: 'Header', position: { x: 10, y: 0 }, width: 80 });
    expect(footer).toMatchObject({ content: 'Footer', position: { x: 10, y: 90 }, width: 80 });
  });

  it('can place low-level Static footer content with full-page Stack justification', async () => {
    const result = await renderToTemplate(
      <Document size={{ width: 100, height: 100 }} margin={10}>
        <Static>
          <Stack height={100} justifyContent="space-between">
            <Text height={6}>Header</Text>
            <Text height={6}>Footer</Text>
          </Stack>
        </Static>
        <Page>
          <Text height={6}>Body</Text>
        </Page>
      </Document>,
    );

    expect(isBlankPdf(result.template.basePdf)).toBe(true);
    if (!isBlankPdf(result.template.basePdf)) throw new Error('Expected blank basePdf');

    const [header, footer] = result.template.basePdf.staticSchema ?? [];
    expect(header).toMatchObject({ content: 'Header', position: { x: 0, y: 0 } });
    expect(footer).toMatchObject({ content: 'Footer', position: { x: 0, y: 94 } });
  });

  it('places bottom Static blocks at the page bottom', async () => {
    const result = await renderToTemplate(
      <Document size={{ width: 100, height: 100 }} margin={10}>
        <Static placement="bottom">
          <Text height={6}>Footer</Text>
        </Static>
        <Page>
          <Text height={6}>Body</Text>
        </Page>
      </Document>,
    );

    expect(isBlankPdf(result.template.basePdf)).toBe(true);
    if (!isBlankPdf(result.template.basePdf)) throw new Error('Expected blank basePdf');

    expect(result.template.basePdf.staticSchema?.[0]).toMatchObject({
      type: 'text',
      content: 'Footer',
      position: { x: 0, y: 94 },
      width: 100,
      height: 6,
    });
  });

  it('uses the full page as the Absolute coordinate origin inside Static', async () => {
    const result = await renderToTemplate(
      <Document size={{ width: 100, height: 100 }} margin={10}>
        <Static>
          <Absolute x={80} y={90} width={15}>
            <Text height={4}>Stamp</Text>
          </Absolute>
        </Static>
        <Page>
          <Text height={6}>Body</Text>
        </Page>
      </Document>,
    );

    expect(isBlankPdf(result.template.basePdf)).toBe(true);
    if (!isBlankPdf(result.template.basePdf)) throw new Error('Expected blank basePdf');

    expect(result.template.basePdf.staticSchema?.[0]).toMatchObject({
      content: 'Stamp',
      position: { x: 80, y: 90 },
      width: 15,
    });
  });

  it('rejects Absolute inside bottom Static', async () => {
    await expect(
      renderToTemplate(
        <Document size={{ width: 100, height: 100 }} margin={10}>
          <Static placement="bottom">
            <Absolute x={10} y={10}>
              <Text>Stamp</Text>
            </Absolute>
          </Static>
          <Page>
            <Text height={6}>Body</Text>
          </Page>
        </Document>,
      ),
    ).rejects.toThrow('<Absolute> is not supported inside bottom <Static>');
  });

  it('allows Absolute inside Header and Footer margin frames', async () => {
    const result = await renderToTemplate(
      <Document size={{ width: 100, height: 100 }} margin={10}>
        <Header>
          <Absolute x={70} y={2} width={10}>
            <Text height={4}>H</Text>
          </Absolute>
        </Header>
        <Footer>
          <Absolute x={70} y={2} width={10}>
            <Text height={4}>F</Text>
          </Absolute>
        </Footer>
        <Page>
          <Text height={6}>Body</Text>
        </Page>
      </Document>,
    );

    expect(isBlankPdf(result.template.basePdf)).toBe(true);
    if (!isBlankPdf(result.template.basePdf)) throw new Error('Expected blank basePdf');

    const [header, footer] = result.template.basePdf.staticSchema ?? [];
    expect(header).toMatchObject({ content: 'H', position: { x: 80, y: 2 }, width: 10 });
    expect(footer).toMatchObject({ content: 'F', position: { x: 80, y: 92 }, width: 10 });
  });

  it('rejects input-backed Static children inside Absolute', async () => {
    await expect(
      renderToTemplate(
        <Document size={{ width: 100, height: 100 }} margin={10}>
          <Static>
            <Absolute x={10} y={10}>
              <Text name="editable">Stamp</Text>
            </Absolute>
          </Static>
          <Page>
            <Text height={6}>Body</Text>
          </Page>
        </Document>,
      ),
    ).rejects.toThrow('<Static> children must be read-only');
  });

  it('supports layout containers inside Header blocks', async () => {
    const result = await renderToTemplate(
      <Document size={{ width: 100, height: 100 }} margin={10}>
        <Header>
          <Row gap={4}>
            <Text width={40} height={6}>
              Left
            </Text>
            <Text width={20} height={6}>
              Right
            </Text>
          </Row>
        </Header>
        <Page>
          <Text height={6}>Body</Text>
        </Page>
      </Document>,
    );

    expect(isBlankPdf(result.template.basePdf)).toBe(true);
    if (!isBlankPdf(result.template.basePdf)) throw new Error('Expected blank basePdf');

    const [left, right] = result.template.basePdf.staticSchema ?? [];
    expect(left).toMatchObject({ content: 'Left', position: { x: 10, y: 0 }, width: 40 });
    expect(right).toMatchObject({ content: 'Right', position: { x: 54, y: 0 }, width: 20 });
  });

  it('concatenates multiple Static blocks in declaration order', async () => {
    const result = await renderToTemplate(
      <Document size={{ width: 100, height: 100 }} margin={0}>
        <Static>
          <Text height={6}>First static</Text>
        </Static>
        <Static>
          <Text height={4}>Second static</Text>
        </Static>
        <Page>
          <Text height={6}>Body</Text>
        </Page>
      </Document>,
    );

    expect(isBlankPdf(result.template.basePdf)).toBe(true);
    if (!isBlankPdf(result.template.basePdf)) throw new Error('Expected blank basePdf');

    expect(result.template.basePdf.staticSchema?.map((schema) => schema.content)).toEqual([
      'First static',
      'Second static',
    ]);
    expect(result.template.basePdf.staticSchema?.[0]?.position.y).toBe(0);
    expect(result.template.basePdf.staticSchema?.[1]?.position.y).toBe(6);
  });

  it('concatenates bottom Static blocks before anchoring them to the page bottom', async () => {
    const result = await renderToTemplate(
      <Document size={{ width: 100, height: 100 }} margin={0}>
        <Static placement="bottom">
          <Text height={6}>First footer</Text>
        </Static>
        <Static placement="bottom">
          <Text height={4}>Second footer</Text>
        </Static>
        <Page>
          <Text height={6}>Body</Text>
        </Page>
      </Document>,
    );

    expect(isBlankPdf(result.template.basePdf)).toBe(true);
    if (!isBlankPdf(result.template.basePdf)) throw new Error('Expected blank basePdf');

    expect(result.template.basePdf.staticSchema?.map((schema) => schema.content)).toEqual([
      'First footer',
      'Second footer',
    ]);
    expect(result.template.basePdf.staticSchema?.[0]?.position.y).toBe(90);
    expect(result.template.basePdf.staticSchema?.[1]?.position.y).toBe(96);
  });

  it('allows named read-only Static children and keeps names unique', async () => {
    const result = await renderToTemplate(
      <Document size={{ width: 100, height: 100 }} margin={0}>
        <Static>
          <Text name="staticTitle" readOnly height={6}>
            Header
          </Text>
        </Static>
        <Page>
          <Text name="body">Body</Text>
        </Page>
      </Document>,
    );

    expect(isBlankPdf(result.template.basePdf)).toBe(true);
    if (!isBlankPdf(result.template.basePdf)) throw new Error('Expected blank basePdf');

    expect(result.template.basePdf.staticSchema?.[0]?.name).toBe('staticTitle');
    expect(result.inputs).toEqual([{ body: 'Body' }]);
  });

  it('rejects duplicate names between Static and body schemas', async () => {
    await expect(
      renderToTemplate(
        <Document>
          <Static>
            <Text name="title" readOnly>
              Header
            </Text>
          </Static>
          <Page>
            <Text name="title">Body</Text>
          </Page>
        </Document>,
      ),
    ).rejects.toThrow('duplicate schema name "title"');
  });

  it('rejects input-backed Static children', async () => {
    await expect(
      renderToTemplate(
        <Document>
          <Static>
            <Text name="editable">Header</Text>
          </Static>
          <Page>
            <Text>Body</Text>
          </Page>
        </Document>,
      ),
    ).rejects.toThrow('<Static> children must be read-only');
  });

  it('rejects invalid Static placement values at runtime', async () => {
    await expect(
      renderToTemplate(
        <Document>
          <RuntimeStatic placement="middle">
            <Text>Header</Text>
          </RuntimeStatic>
          <Page>
            <Text>Body</Text>
          </Page>
        </Document>,
      ),
    ).rejects.toThrow('<Static> placement must be "top" or "bottom"');
  });

  it('rejects Header, Footer, and Static outside Document direct children', async () => {
    await expect(
      renderToTemplate(
        <>
          <Static>
            <Text>Header</Text>
          </Static>
          <Page>
            <Text>Body</Text>
          </Page>
        </>,
      ),
    ).rejects.toThrow('can only be used as direct children of <Document>');

    await expect(
      renderToTemplate(
        <Page>
          <Header>
            <Text>Header</Text>
          </Header>
          <Text>Body</Text>
        </Page>,
      ),
    ).rejects.toThrow('can only be used as direct children of <Document>');

    await expect(
      renderToTemplate(
        <Document>
          <Page>
            <Stack>
              <Footer>
                <Text>Footer</Text>
              </Footer>
            </Stack>
          </Page>
        </Document>,
      ),
    ).rejects.toThrow('can only be used as direct children of <Document>');
  });

  it('rejects invalid Document roots and children', async () => {
    await expect(
      renderToTemplate(
        <>
          <Document>
            <Page>
              <Text>First</Text>
            </Page>
          </Document>
          <Document>
            <Page>
              <Text>Second</Text>
            </Page>
          </Document>
        </>,
      ),
    ).rejects.toThrow('only one <Document> root is supported');

    await expect(
      renderToTemplate(
        <>
          <Document>
            <Page>
              <Text>First</Text>
            </Page>
          </Document>
          <Page>
            <Text>Second</Text>
          </Page>
        </>,
      ),
    ).rejects.toThrow('<Document> must be the only root element');

    await expect(
      renderToTemplate(
        <Document>
          <Text>Loose text</Text>
          <Page>
            <Text>Body</Text>
          </Page>
        </Document>,
      ),
    ).rejects.toThrow('<Document> children must be <Header>, <Footer>, <Static>, or <Page>');

    await expect(
      renderToTemplate(
        <Document>
          {'Loose text'}
          <Page>
            <Text>Body</Text>
          </Page>
        </Document>,
      ),
    ).rejects.toThrow('<Document> children must be <Header>, <Footer>, <Static>, or <Page>');
  });

  it('rejects unsupported Static child schema types', async () => {
    await expect(
      renderToTemplate(
        <Document>
          <Static>
            <MultiVariableText text="Hello {name}" values={{ name: 'Alice' }} />
          </Static>
          <Page>
            <Text>Body</Text>
          </Page>
        </Document>,
      ),
    ).rejects.toThrow('<Static> does not support <multiVariableText>');
  });

  it('rejects Static with a custom basePdf', async () => {
    await expect(
      renderToTemplate(
        <Document>
          <Static>
            <Text>Header</Text>
          </Static>
          <Page>
            <Text>Body</Text>
          </Page>
        </Document>,
        { basePdf: 'data:application/pdf;base64,JVBERi0xLjQK' },
      ),
    ).rejects.toThrow('supported only with a blank basePdf');
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
