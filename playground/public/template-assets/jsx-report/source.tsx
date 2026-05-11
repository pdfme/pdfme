return (
  <Document size="A4" margin={{ x: 16, y: 18 }} font="NotoSansJP">
    <Footer>
      <Row justifyContent="space-between" alignItems="center">
        <Text width={80} size={7} color="#64748b">
          Quarterly product report
        </Text>
        <Text width={50} size={7} align="right" color="#64748b">
          {'Page {currentPage} of {totalPages}'}
        </Text>
      </Row>
    </Footer>

    <Page>
      <Stack gap={7}>
        <Row justifyContent="space-between" alignItems="end">
          <Stack width={110} gap={2}>
            <Text size={20} color="#0f172a">
              Product Health Report
            </Text>
            <Text size={9} color="#64748b">
              A layout-focused preset for reports and internal briefs.
            </Text>
          </Stack>
          <Text width={42} size={8} align="right" color="#16a34a">
            Healthy
          </Text>
        </Row>

        <Row gap={5}>
          {[
            ['Activation', '74%', '#dcfce7'],
            ['Retention', '61%', '#e0f2fe'],
            ['Expansion', '28%', '#fef3c7'],
          ].map(([label, value, background]) => (
            <Box
              key={label}
              flex={1}
              padding={4}
              background={background}
              borderColor="#d1d5db"
              borderWidth={0.3}
            >
              <Stack gap={2}>
                <Text size={7} color="#64748b">{label}</Text>
                <Text size={18} color="#0f172a">{value}</Text>
              </Stack>
            </Box>
          ))}
        </Row>

        <Box padding={5} borderColor="#cbd5e1" borderWidth={0.4}>
          <Stack gap={4}>
            <Text size={12} color="#0f172a">
              Notes
            </Text>
            <Text size={9} lineHeight={1.35} overflow="expand">
              The JSX authoring layer is useful when a document has repeated visual patterns but still needs to become a normal pdfme template. This example uses boxes, rows, static footer content, and simple visual bars.
            </Text>
            <List
              size={8}
              items={[
                'Use Row and Stack for predictable layout.',
                'Use Box for padding, borders, and backgrounds.',
                'Use Footer for repeated page content.',
              ]}
            />
          </Stack>
        </Box>
      </Stack>
    </Page>
  </Document>
);
