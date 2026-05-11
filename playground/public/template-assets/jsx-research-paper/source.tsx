const sections = [
  {
    title: '1. Introduction',
    body: 'Since structured templates are easier to review than absolute-position JSON, JSX can act as a readable authoring surface for humans and AI. The generated output is still an ordinary pdfme Template, so it can be opened in Designer after generation.',
  },
  {
    title: '2. Layout model',
    body: 'Text and MultiVariableText can omit height. During JSX rendering, pdfme measures their content and advances the surrounding Stack or Box. Use explicit height only when you want a fixed field or a fixed visual area.',
  },
];

return (
  <Document size="A4" margin={{ x: 20, y: 18 }} font="NotoSansJP">
    <Footer>
      <Text size={7} align="right" color="#64748b">
        {'Research brief — {currentPage} / {totalPages}'}
      </Text>
    </Footer>

    <Page>
      <Stack gap={5}>
        <Text size={17} align="center" lineHeight={1.3} color="#111827">
          Practical Notes on JSX Authoring for PDF Templates
        </Text>

        <Box background="#f3f4f6" borderColor="#9ca3af" borderWidth={0.2} padding={4}>
          <Text size={9} lineHeight={1.5} color="#374151">
            Abstract — This preset mirrors a paper-style document and intentionally omits height on
            most Text nodes. JSX measures each block while rendering, and the parent Box grows around
            the abstract without manual geometry.
          </Text>
        </Box>

        {sections.map((section) => (
          <Stack key={section.title} gap={1.5}>
            <Text size={11} lineHeight={1.3} color="#111827">
              {section.title}
            </Text>
            <Text size={9} lineHeight={1.5} color="#374151">
              {section.body}
            </Text>
          </Stack>
        ))}

        <PageBreak />

        <Text size={13} color="#111827">
          Appendix
        </Text>
        <Text size={9} lineHeight={1.5} color="#374151">
          Designer edits are applied to the generated Template. The JSX source remains a seed for
          regeneration, not a lossless representation of later Designer changes.
        </Text>
      </Stack>
    </Page>
  </Document>
);
