return (
  <Document size="A4" margin={{ x: 18, y: 20 }} font="NotoSansJP">
    <Footer>
      <Text size={7} align="right" color="#64748b">
        {'{currentPage} / {totalPages} ページ'}
      </Text>
    </Footer>

    <Page>
      <Stack gap={7}>
        <Text size={22} color="#0f172a">
          お知らせ
        </Text>
        <Text size={9} color="#64748b">
          JSX から日本語を含むテンプレートを作成する例です。
        </Text>

        <Box padding={5} background="#f8fafc" borderColor="#cbd5e1" borderWidth={0.4}>
          <Text size={10} lineHeight={1.45} overflow="expand">
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
          columnWeights={[30, 70]}
          rowHeight={9}
          headerHeight={9}
          font="NotoSansJP"
          fontSize={8}
          headStyles={{ backgroundColor: '#0f766e', borderColor: '#0f766e', padding: 2 }}
          bodyStyles={{ borderColor: '#cbd5e1', borderWidth: 0.25, padding: 2 }}
        />
      </Stack>
    </Page>
  </Document>
);
