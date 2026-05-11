return (
  <Document size="A4" margin={{ x: 18, y: 18 }} font="NotoSansJP">
    <Header>
      <Text size={8} color="#64748b">
        Editable fields example
      </Text>
    </Header>

    <Footer>
      <Text size={7} align="right" color="#64748b">
        {'Page {currentPage} of {totalPages}'}
      </Text>
    </Footer>

    <Page>
      <Stack gap={7}>
        <Text size={22} color="#111827">
          Customer Intake Form
        </Text>
        <Text size={9} color="#6b7280">
          Open this generated template in Form/Viewer to edit the fields.
        </Text>

        <Row gap={6}>
          <Box flex={1} padding={4} borderColor="#d1d5db" borderWidth={0.4}>
            <Stack gap={2}>
              <Text size={7} color="#6b7280">
                Customer name
              </Text>
              <Text name="customerName" height={9} size={11} padding={1.5} borderColor="#cbd5e1" borderWidth={0.3}>
                Mina Carter
              </Text>
            </Stack>
          </Box>
          <Box flex={1} padding={4} borderColor="#d1d5db" borderWidth={0.4}>
            <Stack gap={2}>
              <Text size={7} color="#6b7280">
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
            <Text size={7} color="#64748b">
              Message
            </Text>
            <MultiVariableText
              name="message"
              size={10}
              lineHeight={1.3}
              padding={2}
              borderColor="#cbd5e1"
              borderWidth={0.3}
              text={'Hello {firstName},\nYour plan is {plan}.\nStatus: {status}'}
              overflow="expand"
              values={{ firstName: 'Mina', plan: 'Growth', status: 'Ready for review' }}
            />
          </Stack>
        </Box>

        <Row gap={6}>
          <Box width={56} padding={4} borderColor="#d1d5db" borderWidth={0.4}>
            <Stack gap={2}>
              <Text size={7} color="#6b7280">
                Logo upload
              </Text>
              <Image name="logo" width={48} height={28} />
            </Stack>
          </Box>
          <Box flex={1} padding={4} background="#ecfeff" borderColor="#06b6d4" borderWidth={0.4}>
            <Text size={9} lineHeight={1.35}>
              Editable fields usually keep explicit heights for predictable input boxes. Read-only text can usually omit height and let JSX measure it.
            </Text>
          </Box>
        </Row>
      </Stack>
    </Page>
  </Document>
);
