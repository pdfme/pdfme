(function(){try{var e=typeof window<`u`?window:typeof global<`u`?global:typeof globalThis<`u`?globalThis:typeof self<`u`?self:{};e.SENTRY_RELEASE={id:`e8143a6a0feb72374beb1c00d6b4763a43460fe1`};var t=new e.Error().stack;t&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[t]=`f0b062c2-db71-44af-bab4-a4e6cc86470e`,e._sentryDebugIdIdentifier=`sentry-dbid-f0b062c2-db71-44af-bab4-a4e6cc86470e`)}catch{}})();import{r as e}from"./chunk-D940-dag.js";import{n as t,t as n}from"./jsx-runtime-DDPiBJ1R.js";import{n as r,t as i}from"./previewSizing-Cz0cxe2G.js";import{a,d as o,i as s,n as c,o as l,r as u,t as d,u as f}from"./index-BXsXjnlF.js";import p from"./CodeEditor-CD6lYXxo.js";var m=f(`Download`,[[`path`,{d:`M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4`,key:`ih7n3h`}],[`polyline`,{points:`7 10 12 15 17 10`,key:`2ggqvy`}],[`line`,{x1:`12`,x2:`12`,y1:`15`,y2:`3`,key:`1vk2je`}]]),h=e(t()),g=[{id:`invoice`,label:`Invoice layout`,description:`A two-page invoice with Header, Footer, Absolute, Table, and visual schemas.`,source:`return (
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
);`},{id:`form-fields`,label:`Form fields`,description:`Input-backed Text, MultiVariableText, and Image fields for testing Form preview.`,source:`return (
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
            size={10}
            lineHeight={1.3}
            padding={2}
            borderColor="#cbd5e1"
            borderWidth={0.3}
            text={'Hello {firstName},\\nYour plan is {plan}.\\nStatus: {status}'}
            overflow="expand"
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
);`},{id:`report`,label:`Report page`,description:`A dashboard-style report with cards, progress bars, list content, and page footer.`,source:`return (
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
);`},{id:`japanese-notice`,label:`Japanese notice`,description:`A Japanese preset that uses NotoSansJP and static footer page numbers.`,source:`return (
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
);`}],_=g[0]?.source??``;function v(e){return new Worker(`/assets/jsxPlaygroundWorker-CyIZged4.js`,{name:e?.name})}var y=n(),b=`https://pdfme.com/docs/jsx#jsx-playground-beta`,x=`file:///jsx-playground.tsx`,S=15e3,C=e=>e instanceof Error?e.message:String(e),w=e=>{let t=e.languages.typescript;t&&(t.typescriptDefaults.setCompilerOptions({allowNonTsExtensions:!0,jsx:t.JsxEmit.React,jsxFactory:`createElement`,jsxFragmentFactory:`Fragment`,moduleResolution:t.ModuleResolutionKind.NodeJs,target:t.ScriptTarget.ES2020}),t.typescriptDefaults.addExtraLib(`
declare const Fragment: unique symbol;
declare function Page(props: Record<string, unknown>): unknown;
declare function Header(props: Record<string, unknown>): unknown;
declare function Footer(props: Record<string, unknown>): unknown;
declare function Static(props: Record<string, unknown>): unknown;
declare function Absolute(props: Record<string, unknown>): unknown;
declare function Stack(props: Record<string, unknown>): unknown;
declare function Row(props: Record<string, unknown>): unknown;
declare function Box(props: Record<string, unknown>): unknown;
declare function Spacer(props: Record<string, unknown>): unknown;
declare function Text(props: Record<string, unknown>): unknown;
declare function MultiVariableText(props: Record<string, unknown>): unknown;
declare function Image(props: Record<string, unknown>): unknown;
declare function Svg(props: Record<string, unknown>): unknown;
declare function Rectangle(props: Record<string, unknown>): unknown;
declare function Ellipse(props: Record<string, unknown>): unknown;
declare function Line(props: Record<string, unknown>): unknown;
declare function List(props: Record<string, unknown>): unknown;
declare function Table(props: Record<string, unknown>): unknown;
declare function PageBreak(props?: Record<string, unknown>): unknown;
`,`file:///pdfme-jsx-playground.d.ts`))};function T(){let e=(0,h.useRef)(null),t=(0,h.useRef)(null),n=(0,h.useRef)([{}]),f=(0,h.useRef)(null),T=(0,h.useRef)(null),E=(0,h.useRef)(0),[D,O]=(0,h.useState)(g[0]?.id??``),[k,A]=(0,h.useState)(`viewer`),[j,M]=(0,h.useState)(_),[N,P]=(0,h.useState)(null),[F,I]=(0,h.useState)([{}]),[L,R]=(0,h.useState)(null),[z,B]=(0,h.useState)(null),[V,H]=(0,h.useState)(null),[U,W]=(0,h.useState)(!1),[G,K]=(0,h.useState)(0),q=g.find(e=>e.id===D)??g[0],J=(0,h.useCallback)(()=>{f.current?.terminate(),f.current=null},[]),Y=(0,h.useCallback)(e=>{let t=T.current;t&&(window.clearTimeout(t.timeoutId),T.current=null,e&&t.reject(e))},[]),X=(0,h.useCallback)(()=>{if(f.current)return f.current;let e=new v;return e.onmessage=e=>{let t=T.current;!t||e.data.id!==t.id||(Y(),e.data.ok?t.resolve(e.data.result):t.reject(Error(e.data.error)))},e.onerror=e=>{let t=T.current;Y(),J(),t?.reject(Error(e.message||`JSX render worker failed.`))},f.current=e,e},[Y,J]),Z=(0,h.useCallback)(e=>new Promise((t,n)=>{T.current&&(Y(Error(`JSX render cancelled.`)),J());let r=X(),i=E.current+=1;T.current={id:i,reject:n,resolve:t,timeoutId:window.setTimeout(()=>{let e=T.current;!e||e.id!==i||(Y(Error(`JSX render timed out.`)),J())},S)},r.postMessage({font:u(),id:i,source:e})}),[Y,X,J]);return(0,h.useEffect)(()=>{n.current=F},[F]),(0,h.useEffect)(()=>{let e=!1,t=window.setTimeout(async()=>{let t=performance.now();try{let r=await Z(j);if(e)return;P(r.template),I(r.inputs),n.current=r.inputs,B(Math.round(performance.now()-t)),R(null)}catch(t){if(e)return;R(C(t)),B(null)}},250);return()=>{e=!0,window.clearTimeout(t)}},[Z,j]),(0,h.useEffect)(()=>{if(!e.current||!N)return;let r=n.current;try{if(t.current&&t.current.mode!==k&&(t.current.ui.destroy(),t.current=null),t.current)t.current.ui.updateTemplate(N),t.current.ui.setInputs(r);else{let i=new(k===`form`?a:l)({domContainer:e.current,template:N,inputs:r,options:{font:u(),lang:`en`,theme:{token:{colorPrimary:`#25c2a0`}}},plugins:s()});k===`form`&&i.onChangeInput(({index:e,name:t,value:r})=>{let i=r;I(r=>{let a=r[e]??{};if(i===void 0&&!(t in a)||a[t]===i)return r;let o=[...r],s={...a};return i===void 0?delete s[t]:s[t]=i,o[e]=s,n.current=o,o})}),t.current={mode:k,ui:i}}}catch(e){R(C(e))}},[N,k,G]),(0,h.useEffect)(()=>{if(!(k!==`viewer`||!t.current||t.current.mode!==`viewer`))try{t.current.ui.setInputs(F)}catch(e){R(C(e))}},[F,k]),(0,h.useEffect)(()=>{if(!N)return;let n=null,r=()=>{n===null&&(n=window.requestAnimationFrame(()=>{n=null;let r=e.current,a=t.current;!r||!a||!i(r)||(a.ui.destroy(),t.current=null,K(e=>e+1))}))};window.addEventListener(`scroll`,r,{passive:!0}),window.addEventListener(`resize`,r);let a=window.setTimeout(r,150);return()=>{window.removeEventListener(`scroll`,r),window.removeEventListener(`resize`,r),window.clearTimeout(a),n!==null&&window.cancelAnimationFrame(n)}},[N,k]),(0,h.useEffect)(()=>()=>{Y(Error(`JSX render cancelled.`)),J(),t.current?.ui.destroy(),t.current=null},[Y,J]),(0,y.jsxs)(`main`,{className:`flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-gray-100 lg:overflow-hidden`,children:[(0,y.jsxs)(`div`,{className:`flex flex-col gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-start sm:justify-between`,children:[(0,y.jsxs)(`div`,{className:`min-w-0`,children:[(0,y.jsxs)(`div`,{className:`flex items-center gap-3`,children:[(0,y.jsx)(`h1`,{className:`text-sm font-semibold text-gray-900`,children:`@pdfme/jsx (beta)`}),(0,y.jsxs)(`a`,{href:b,target:`_blank`,rel:`noopener noreferrer`,className:`inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-600`,children:[`Docs`,(0,y.jsx)(r,{className:`size-3`})]})]}),(0,y.jsx)(`p`,{className:`mt-1 break-words text-xs text-gray-500`,children:q?.description}),(0,y.jsx)(`p`,{className:`mt-1 break-words text-xs text-gray-500`,children:`Write a JSX function body that returns pdfme pages. Imports are intentionally disabled in this beta playground.`})]}),(0,y.jsxs)(`div`,{className:`grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:items-center sm:pl-4`,children:[(0,y.jsx)(`select`,{"aria-label":`JSX preset`,value:D,onChange:e=>{let t=g.find(t=>t.id===e.target.value);t&&(O(t.id),M(t.source),R(null),H(null))},className:`col-span-2 max-w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 sm:col-span-1 sm:min-w-40`,children:g.map(e=>(0,y.jsx)(`option`,{value:e.id,children:e.label},e.id))}),(0,y.jsxs)(`button`,{type:`button`,disabled:!N||!!L,onClick:()=>{N&&d(N,`jsx-template`)},className:`inline-flex min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded border border-gray-300 px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3`,children:[(0,y.jsx)(m,{className:`size-4`}),`Template JSON`]}),(0,y.jsx)(`button`,{type:`button`,disabled:!N||!!L||U,onClick:async()=>{if(U)return;let e=performance.now();W(!0);try{await c(t.current?.ui??null);let n=Math.round(performance.now()-e);H(n),o.info(`Generated PDF in ${n}ms`)}catch(e){o.error(C(e))}finally{W(!1)}},className:`min-w-0 whitespace-nowrap rounded border border-gray-300 px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3`,children:U?`Generating...`:`Generate PDF`})]})]}),(0,y.jsx)(`div`,{className:`border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900`,children:`This beta runs JSX in an isolated worker and blocks common browser globals, but it is still for trusted examples. Do not paste code you do not trust.`}),(0,y.jsxs)(`div`,{className:`grid min-w-0 flex-none grid-cols-1 gap-0 lg:min-h-0 lg:flex-1 lg:grid-cols-2`,children:[(0,y.jsxs)(`section`,{className:`flex min-h-[28rem] min-w-0 flex-col border-b border-gray-200 bg-white lg:min-h-0 lg:border-b-0 lg:border-r`,children:[(0,y.jsx)(`div`,{className:`border-b border-gray-200 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500`,children:`JSX`}),(0,y.jsx)(p,{ariaLabel:`JSX`,beforeMount:w,inferLanguageFromPath:!0,language:`typescript`,onChange:M,path:x,value:j})]}),(0,y.jsxs)(`section`,{className:`flex min-h-[44rem] min-w-0 flex-col bg-gray-100 lg:min-h-0`,children:[(0,y.jsxs)(`div`,{className:`flex flex-col gap-2 border-b border-gray-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500 sm:flex-row sm:items-center sm:justify-between`,children:[(0,y.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,y.jsx)(`span`,{children:k===`form`?`Form`:`Viewer`}),(0,y.jsx)(`div`,{className:`inline-flex overflow-hidden rounded border border-gray-300 normal-case tracking-normal`,children:[`viewer`,`form`].map(e=>(0,y.jsx)(`button`,{type:`button`,onClick:()=>A(e),className:`px-2 py-1 text-xs ${k===e?`bg-green-50 text-green-700`:`bg-white text-gray-600 hover:bg-gray-50`}`,children:e===`form`?`Form`:`Viewer`},e))})]}),(0,y.jsxs)(`div`,{className:`flex items-center gap-3 normal-case tracking-normal`,children:[z!==null&&(0,y.jsxs)(`span`,{children:[`render `,z,`ms`]}),V!==null&&(0,y.jsxs)(`span`,{children:[`pdf `,V,`ms`]}),L&&(0,y.jsx)(`span`,{className:`max-w-[32rem] truncate text-red-600`,children:L})]})]}),(0,y.jsx)(`div`,{ref:e,className:`h-[38rem] flex-none lg:h-auto lg:min-h-0 lg:flex-1`})]})]})]})}export{T as default};
//# sourceMappingURL=JsxPlayground-yZSzAR0u.js.map