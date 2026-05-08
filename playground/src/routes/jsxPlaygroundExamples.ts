export type JsxPlaygroundPreset = {
  id: string;
  label: string;
  description: string;
  source: string;
};

export const jsxPlaygroundPresets: JsxPlaygroundPreset[] = [
  {
    id: 'invoice',
    label: 'Invoice layout',
    description: 'A two-page invoice with Header, Footer, Absolute, Table, and visual schemas.',
    source: `return (
  <>
    <Page size="A4" margin={{ x: 16, y: 18 }} font="NotoSansJP">
      <Header>
        <Row height={12} alignItems="center" justifyContent="space-between">
          <Text width={80} height={6} size={8} color="#64748b">
            @pdfme/jsx beta
          </Text>
          <Text width={80} height={6} size={8} align="right" color="#64748b">
            Header / Footer / Absolute
          </Text>
        </Row>
      </Header>

      <Footer>
        <Line height={0.3} color="#cbd5e1" />
        <Row height={10} alignItems="center" justifyContent="space-between">
          <Text width={80} height={5} size={7} color="#64748b">
            Generated from JSX
          </Text>
          <Text width={54} height={5} size={7} align="right" color="#64748b">
            {'Page {currentPage} of {totalPages}'}
          </Text>
        </Row>
      </Footer>

      <Absolute x={138} y={20} width={42} height={18}>
        <Rectangle width={42} height={18} fill="#dcfce7" borderColor="#16a34a" borderWidth={0.4} />
        <Text width={42} height={18} size={8} align="center" valign="middle" color="#166534">
          APPROVED
        </Text>
      </Absolute>

      <Stack gap={7}>
        <Row alignItems="center" justifyContent="space-between">
          <Stack width={92} gap={2}>
            <Text height={12} size={24} color="#0f172a">
              Invoice
            </Text>
            <Text height={6} size={9} color="#475569">
              A compact authoring example using Stack, Row, Table and visual schemas.
            </Text>
          </Stack>
          <Svg width={34} height={22}>
            {'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#0f172a"/><circle cx="42" cy="40" r="22" fill="#22c55e"/><rect x="62" y="22" width="34" height="36" rx="7" fill="#e0f2fe"/></svg>'}
          </Svg>
        </Row>

        <Row gap={6}>
          <Box width={82} padding={4} borderColor="#e2e8f0" borderWidth={0.4} background="#f8fafc">
            <Stack gap={2}>
              <Text height={5} size={7} color="#64748b">
                Bill to
              </Text>
              <MultiVariableText
                height={15}
                size={10}
                lineHeight={1.25}
                text={'{company}\\n{name}\\n{email}'}
                values={{
                  company: 'Kumo Coffee',
                  name: 'Aki Tanaka',
                  email: 'aki@example.com',
                }}
              />
            </Stack>
          </Box>
          <Box flex={1} padding={4} borderColor="#e2e8f0" borderWidth={0.4}>
            <Stack gap={2}>
              <Text height={5} size={7} color="#64748b">
                Summary
              </Text>
              <List
                height={24}
                size={8}
                items={[
                  'Layout primitives create regular pdfme schemas.',
                  { text: 'Nested rows and boxes stay readable.', level: 1 },
                  'Download the generated template JSON.',
                ]}
              />
            </Stack>
          </Box>
        </Row>

        <Table
          head={['Item', 'Qty', 'Price']}
          rows={[
            ['Design system setup', 1, '$800'],
            ['PDF template automation', 2, '$1,200'],
            ['QA and playground review', 1, '$350'],
          ]}
          columnWeights={[55, 15, 30]}
          rowHeight={9}
          headerHeight={9}
          font="NotoSansJP"
          fontSize={8}
          headStyles={{ backgroundColor: '#0f766e', borderColor: '#0f766e', padding: 2 }}
          bodyStyles={{ borderColor: '#cbd5e1', borderWidth: 0.25, padding: 2 }}
        />

        <Row gap={6}>
          <Box flex={1} padding={4} background="#fefce8" borderColor="#facc15" borderWidth={0.4}>
            <Text height={20} size={8} lineHeight={1.35} textFormat="inline-markdown">
              **Note:** read-only Text can use inline-markdown. Editable Text intentionally cannot.
            </Text>
          </Box>
          <Box width={42} height={22}>
            <Row gap={2}>
              <Ellipse width={22} height={22} fill="#dbeafe" borderColor="#2563eb" borderWidth={0.4} />
              <Rectangle width={18} height={22} fill="#fee2e2" borderColor="#ef4444" borderWidth={0.4} />
            </Row>
          </Box>
        </Row>
      </Stack>
    </Page>

    <Page size="A4" margin={{ x: 16, y: 18 }} font="NotoSansJP">
      <Stack gap={6}>
        <Text height={10} size={18} color="#0f172a">
          Second page
        </Text>
        <Text height={22} size={9} lineHeight={1.35} overflow="expand">
          PageBreak creates another schemas array in the generated template. This page shows that JSX is only an authoring layer: the output remains a normal pdfme Template.
        </Text>
        <Box padding={5} borderColor="#cbd5e1" borderWidth={0.4} background="#f8fafc">
          <Text height={24} size={9} lineHeight={1.35}>
            Try changing numbers, colors, Stack gaps, Row widths, or Table rows. The Viewer updates after a short debounce.
          </Text>
        </Box>
      </Stack>
    </Page>
  </>
);`,
  },
  {
    id: 'form-fields',
    label: 'Form fields',
    description: 'Input-backed Text, MultiVariableText, and Image fields for testing Form preview.',
    source: `return (
  <Page size="A4" margin={{ x: 18, y: 18 }} font="NotoSansJP">
    <Header>
      <Text height={7} size={8} color="#64748b">
        Editable fields example
      </Text>
    </Header>

    <Footer>
      <Text height={6} size={7} align="right" color="#64748b">
        {'Page {currentPage} of {totalPages}'}
      </Text>
    </Footer>

    <Stack gap={7}>
      <Text height={12} size={22} color="#111827">
        Customer Intake Form
      </Text>
      <Text height={8} size={9} color="#6b7280">
        Switch the preview to Form and edit the fields directly.
      </Text>

      <Row gap={6}>
        <Box flex={1} padding={4} borderColor="#d1d5db" borderWidth={0.4}>
          <Stack gap={2}>
            <Text height={5} size={7} color="#6b7280">
              Customer name
            </Text>
            <Text name="customerName" height={9} size={11} padding={1.5} borderColor="#cbd5e1" borderWidth={0.3}>
              Mina Carter
            </Text>
          </Stack>
        </Box>
        <Box flex={1} padding={4} borderColor="#d1d5db" borderWidth={0.4}>
          <Stack gap={2}>
            <Text height={5} size={7} color="#6b7280">
              Email
            </Text>
            <Text name="email" height={9} size={11} padding={1.5} borderColor="#cbd5e1" borderWidth={0.3}>
              mina@example.com
            </Text>
          </Stack>
        </Box>
      </Row>

      <Box padding={4} background="#f8fafc" borderColor="#cbd5e1" borderWidth={0.4}>
        <Stack gap={2}>
          <Text height={5} size={7} color="#64748b">
            Message
          </Text>
          <MultiVariableText
            name="message"
            height={28}
            size={10}
            lineHeight={1.3}
            padding={2}
            borderColor="#cbd5e1"
            borderWidth={0.3}
            text={'Hello {firstName},\\nYour plan is {plan}.\\nStatus: {status}'}
            values={{ firstName: 'Mina', plan: 'Growth', status: 'Ready for review' }}
          />
        </Stack>
      </Box>

      <Row gap={6}>
        <Box width={56} padding={4} borderColor="#d1d5db" borderWidth={0.4}>
          <Stack gap={2}>
            <Text height={5} size={7} color="#6b7280">
              Logo upload
            </Text>
            <Image name="logo" width={48} height={28} />
          </Stack>
        </Box>
        <Box flex={1} padding={4} background="#ecfeff" borderColor="#06b6d4" borderWidth={0.4}>
          <Text height={30} size={9} lineHeight={1.35}>
            This preset keeps the generated template editable. The Form preview writes changed input values back into the playground state, so Generate PDF uses the latest edits.
          </Text>
        </Box>
      </Row>
    </Stack>
  </Page>
);`,
  },
  {
    id: 'report',
    label: 'Report page',
    description:
      'A dashboard-style report with cards, progress bars, list content, and page footer.',
    source: `return (
  <Page size="A4" margin={{ x: 16, y: 18 }} font="NotoSansJP">
    <Footer>
      <Row height={8} justifyContent="space-between" alignItems="center">
        <Text width={80} height={5} size={7} color="#64748b">
          Quarterly product report
        </Text>
        <Text width={50} height={5} size={7} align="right" color="#64748b">
          {'Page {currentPage} of {totalPages}'}
        </Text>
      </Row>
    </Footer>

    <Stack gap={7}>
      <Row justifyContent="space-between" alignItems="end">
        <Stack width={110} gap={2}>
          <Text height={10} size={20} color="#0f172a">
            Product Health Report
          </Text>
          <Text height={7} size={9} color="#64748b">
            A layout-focused preset for reports and internal briefs.
          </Text>
        </Stack>
        <Text width={42} height={8} size={8} align="right" color="#16a34a">
          Healthy
        </Text>
      </Row>

      <Row gap={5}>
        {[
          ['Activation', '74%', '#dcfce7'],
          ['Retention', '61%', '#e0f2fe'],
          ['Expansion', '28%', '#fef3c7'],
        ].map(([label, value, background]) => (
          <Box flex={1} padding={4} background={background} borderColor="#d1d5db" borderWidth={0.3}>
            <Stack gap={2}>
              <Text height={5} size={7} color="#64748b">{label}</Text>
              <Text height={9} size={18} color="#0f172a">{value}</Text>
            </Stack>
          </Box>
        ))}
      </Row>

      <Box padding={5} borderColor="#cbd5e1" borderWidth={0.4}>
        <Stack gap={4}>
          <Text height={7} size={12} color="#0f172a">
            Notes
          </Text>
          <Text height={28} size={9} lineHeight={1.35} overflow="expand">
            The JSX authoring layer is useful when a document has repeated visual patterns but still needs to become a normal pdfme template. This example uses boxes, rows, static footer content, and simple visual bars.
          </Text>
          <List
            height={24}
            size={8}
            items={[
              'Use Row and Stack for predictable layout.',
              'Use Box for padding, borders, and backgrounds.',
              'Use Static or Footer for repeated page content.',
            ]}
          />
        </Stack>
      </Box>
    </Stack>
  </Page>
);`,
  },
  {
    id: 'japanese-notice',
    label: 'Japanese notice',
    description: 'A Japanese preset that uses NotoSansJP and static footer page numbers.',
    source: `return (
  <Page size="A4" margin={{ x: 18, y: 20 }} font="NotoSansJP">
    <Footer>
      <Text height={6} size={7} align="right" color="#64748b">
        {'{currentPage} / {totalPages} ページ'}
      </Text>
    </Footer>

    <Stack gap={7}>
      <Text height={12} size={22} color="#0f172a">
        お知らせ
      </Text>
      <Text height={8} size={9} color="#64748b">
        JSX から日本語を含むテンプレートを作成する例です。
      </Text>

      <Box padding={5} background="#f8fafc" borderColor="#cbd5e1" borderWidth={0.4}>
        <Text height={36} size={10} lineHeight={1.45} overflow="expand">
          pdfme の JSX authoring は、通常の pdfme Template と inputs を生成するための薄いレイヤーです。日本語を扱う場合は、Viewer や generator の options.font に NotoSansJP などのフォントを登録してください。
        </Text>
      </Box>

      <Table
        head={['項目', '内容']}
        rows={[
          ['フォント', 'NotoSansJP'],
          ['出力', 'Template + inputs'],
          ['プレビュー', 'Viewer / Form'],
        ]}
        columnWeights={[38, 92]}
        rowHeight={9}
        headerHeight={9}
        font="NotoSansJP"
        fontSize={8}
        headStyles={{ backgroundColor: '#0f766e', borderColor: '#0f766e', padding: 2 }}
        bodyStyles={{ borderColor: '#cbd5e1', borderWidth: 0.25, padding: 2 }}
      />
    </Stack>
  </Page>
);`,
  },
];

export const initialJsx = jsxPlaygroundPresets[0]?.source ?? '';
