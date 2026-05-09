(function(){try{var e=typeof window<`u`?window:typeof global<`u`?global:typeof globalThis<`u`?globalThis:typeof self<`u`?self:{};e.SENTRY_RELEASE={id:`97bf3021a45efe415f0c762e72ca286f102b4486`};var t=new e.Error().stack;t&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[t]=`9865b1f5-ac98-4025-9ea0-c4c07956a5a9`,e._sentryDebugIdIdentifier=`sentry-dbid-9865b1f5-ac98-4025-9ea0-c4c07956a5a9`)}catch{}})();import{r as e}from"./chunk-BIVapWw-.js";import{n as t,t as n}from"./jsx-runtime-BETMHFD4.js";import{n as r,t as i}from"./useRefreshCollapsedPreview-C6nSmn7j.js";import{a,d as o,f as s,i as c,n as l,o as ee,p as u,r as d,s as f,t as p}from"./index-DQ4CFDrv.js";import m from"./CodeEditor-Dn0hgI7K.js";var h=o(`Download`,[[`path`,{d:`M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4`,key:`ih7n3h`}],[`polyline`,{points:`7 10 12 15 17 10`,key:`2ggqvy`}],[`line`,{x1:`12`,x2:`12`,y1:`15`,y2:`3`,key:`1vk2je`}]]),g=o(`PencilRuler`,[[`path`,{d:`M13 7 8.7 2.7a2.41 2.41 0 0 0-3.4 0L2.7 5.3a2.41 2.41 0 0 0 0 3.4L7 13`,key:`orapub`}],[`path`,{d:`m8 6 2-2`,key:`115y1s`}],[`path`,{d:`m18 16 2-2`,key:`ee94s4`}],[`path`,{d:`m17 11 4.3 4.3c.94.94.94 2.46 0 3.4l-2.6 2.6c-.94.94-2.46.94-3.4 0L11 17`,key:`cfq27r`}],[`path`,{d:`M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z`,key:`1a8usu`}],[`path`,{d:`m15 5 4 4`,key:`1mk7zo`}]]),_=e(t()),v=[{id:`invoice`,label:`Invoice layout`,description:`A two-page invoice with Header, Footer, Absolute, Table, and visual schemas.`,source:`return (
  <Document size="A4" margin={{ x: 16, y: 18 }} font="NotoSansJP">
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

    <Page>
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

    <Page>
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
  </Document>
);`},{id:`form-fields`,label:`Form fields`,description:`Input-backed Text, MultiVariableText, and Image fields for testing Form preview.`,source:`return (
  <Document size="A4" margin={{ x: 18, y: 18 }} font="NotoSansJP">
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

    <Page>
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
  </Document>
);`},{id:`report`,label:`Report page`,description:`A dashboard-style report with cards, progress bars, list content, and page footer.`,source:`return (
  <Document size="A4" margin={{ x: 16, y: 18 }} font="NotoSansJP">
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

    <Page>
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
  </Document>
);`},{id:`japanese-notice`,label:`Japanese notice`,description:`A Japanese preset that uses NotoSansJP and static footer page numbers.`,source:`return (
  <Document size="A4" margin={{ x: 18, y: 20 }} font="NotoSansJP">
    <Footer>
      <Text height={6} size={7} align="right" color="#64748b">
        {'{currentPage} / {totalPages} ページ'}
      </Text>
    </Footer>

    <Page>
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
  </Document>
);`}],y=v[0]?.source??``;function te(e){return new Worker(`/assets/jsxPlaygroundWorker-XBeWctmz.js`,{name:e?.name})}var b=n(),x=`https://pdfme.com/docs/jsx#jsx-playground-beta`,S=`file:///jsx-playground.tsx`,C=15e3,w=e=>e instanceof Error?e.message:String(e),T=`inline-flex min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded border border-gray-300 px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3`,ne=e=>{let t=e.languages.typescript;t&&(t.typescriptDefaults.setCompilerOptions({allowNonTsExtensions:!0,jsx:t.JsxEmit.React,jsxFactory:`createElement`,jsxFragmentFactory:`Fragment`,lib:[`es2020`],moduleResolution:t.ModuleResolutionKind.NodeJs,target:t.ScriptTarget.ES2020}),t.typescriptDefaults.addExtraLib(`
declare const Fragment: unique symbol;
declare function Document(props: Record<string, unknown>): unknown;
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
`,`file:///pdfme-jsx-playground.d.ts`))};function E(){let e=u(),t=(0,_.useRef)(null),n=(0,_.useRef)(null),o=(0,_.useRef)(null),E=(0,_.useRef)([{}]),D=(0,_.useRef)(null),O=(0,_.useRef)(null),k=(0,_.useRef)(0),[A,j]=(0,_.useState)(v[0]?.id??``),[M,re]=(0,_.useState)(`viewer`),[N,P]=(0,_.useState)(y),[F,I]=(0,_.useState)(null),[L,R]=(0,_.useState)([{}]),[z,B]=(0,_.useState)(null),[V,H]=(0,_.useState)(null),[U,W]=(0,_.useState)(null),[G,K]=(0,_.useState)(!1),[q,J]=(0,_.useState)(0),Y=v.find(e=>e.id===A)??v[0],X=(0,_.useCallback)(()=>{D.current?.terminate(),D.current=null},[]),Z=(0,_.useCallback)(e=>{let t=O.current;t&&(window.clearTimeout(t.timeoutId),O.current=null,e&&t.reject(e))},[]),Q=(0,_.useCallback)(()=>{if(D.current)return D.current;let e=new te;return e.onmessage=e=>{let t=O.current;!t||e.data.id!==t.id||(Z(),e.data.ok?t.resolve(e.data.result):t.reject(Error(e.data.error)))},e.onerror=e=>{let t=O.current;Z(),X(),t?.reject(Error(e.message||`JSX render worker failed.`))},D.current=e,e},[Z,X]),$=(0,_.useCallback)(e=>new Promise((t,n)=>{O.current&&(Z(Error(`JSX render cancelled.`)),X());let r=Q(),i=k.current+=1;O.current={id:i,reject:n,resolve:t,timeoutId:window.setTimeout(()=>{let e=O.current;!e||e.id!==i||(Z(Error(`JSX render timed out.`)),X())},C)},r.postMessage({font:d(),id:i,source:e})}),[Z,Q,X]);(0,_.useEffect)(()=>{E.current=L},[L]),(0,_.useEffect)(()=>{let e=!1,t=window.setTimeout(async()=>{let t=performance.now();try{let n=await $(N);if(e)return;I(n.template),R(n.inputs),E.current=n.inputs,H(Math.round(performance.now()-t)),B(null)}catch(t){if(e)return;B(w(t)),H(null)}},250);return()=>{e=!0,window.clearTimeout(t)}},[$,N]),(0,_.useEffect)(()=>{if(!n.current||!F)return;let e=E.current;try{if(o.current&&o.current.mode!==M&&(o.current.ui.destroy(),o.current=null),o.current)o.current.ui.updateTemplate(F),o.current.ui.setInputs(e);else{let t=new(M===`form`?a:ee)({domContainer:n.current,template:F,inputs:e,options:{font:d(),lang:`en`,theme:{token:{colorPrimary:`#25c2a0`}}},plugins:c()});M===`form`&&t.onChangeInput(({index:e,name:t,value:n})=>{let r=n;R(n=>{let i=n[e]??{};if(r===void 0&&!(t in i)||i[t]===r)return n;let a=[...n],o={...i};return r===void 0?delete o[t]:o[t]=r,a[e]=o,E.current=a,a})}),o.current={mode:M,ui:t}}}catch(e){B(w(e))}},[F,M,q]),(0,_.useEffect)(()=>{if(!(M!==`viewer`||!o.current||o.current.mode!==`viewer`))try{o.current.ui.setInputs(L)}catch(e){B(w(e))}},[L,M]);let ie=(0,_.useCallback)(()=>{let e=o.current;e&&(e.ui.destroy(),o.current=null,J(e=>e+1))},[]);return i({containerRef:n,enabled:F!=null,onRefresh:ie,scrollRootRef:t}),(0,_.useEffect)(()=>()=>{Z(Error(`JSX render cancelled.`)),X(),o.current?.ui.destroy(),o.current=null},[Z,X]),(0,b.jsxs)(`main`,{ref:t,className:`flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-gray-100 lg:overflow-hidden`,children:[(0,b.jsxs)(`div`,{className:`flex flex-col gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-start sm:justify-between`,children:[(0,b.jsxs)(`div`,{className:`min-w-0`,children:[(0,b.jsxs)(`div`,{className:`flex items-center gap-3`,children:[(0,b.jsx)(`h1`,{className:`text-sm font-semibold text-gray-900`,children:`@pdfme/jsx (beta)`}),(0,b.jsxs)(`a`,{href:x,target:`_blank`,rel:`noopener noreferrer`,className:`inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-600`,children:[`Docs`,(0,b.jsx)(r,{className:`size-3`})]})]}),(0,b.jsx)(`p`,{className:`mt-1 break-words text-xs text-gray-500`,children:Y?.description}),(0,b.jsx)(`p`,{className:`mt-1 break-words text-xs text-gray-500`,children:`Write a JSX function body that returns a pdfme Document or Page nodes. Imports are intentionally disabled in this beta playground.`})]}),(0,b.jsxs)(`div`,{className:`grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:items-center sm:pl-4`,children:[(0,b.jsx)(`select`,{"aria-label":`JSX preset`,value:A,onChange:e=>{let t=v.find(t=>t.id===e.target.value);t&&(j(t.id),P(t.source),B(null),W(null))},className:`col-span-2 max-w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 sm:col-span-1 sm:min-w-40`,children:v.map(e=>(0,b.jsx)(`option`,{value:e.id,children:e.label},e.id))}),(0,b.jsxs)(`button`,{type:`button`,disabled:!F||!!z,onClick:()=>{F&&p(F,`jsx-template`)},className:T,children:[(0,b.jsx)(h,{className:`size-4`}),`Template JSON`]}),(0,b.jsxs)(`button`,{type:`button`,disabled:!F||!!z,onClick:()=>{if(F)try{f(F);let t=JSON.stringify(F),n=localStorage.getItem(`template`);if(n&&n!==t&&!window.confirm(`Opening Designer will replace the template saved in local storage. Continue?`))return;localStorage.setItem(`template`,t),localStorage.removeItem(`inputs`),s.success(`Saved generated template — opening Designer`),e(`/designer`)}catch(e){s.error(w(e))}},className:T,children:[(0,b.jsx)(g,{className:`size-4`}),`Open Designer`]}),(0,b.jsx)(`button`,{type:`button`,disabled:!F||!!z||G,onClick:async()=>{if(G)return;let e=performance.now();K(!0);try{await l(o.current?.ui??null);let t=Math.round(performance.now()-e);W(t),s.info(`Generated PDF in ${t}ms`)}catch(e){s.error(w(e))}finally{K(!1)}},className:`min-w-0 whitespace-nowrap rounded border border-gray-300 px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3`,children:G?`Generating...`:`Generate PDF`})]})]}),(0,b.jsx)(`div`,{className:`border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900`,children:`This beta runs JSX in an isolated worker and blocks common browser globals, but it is still for trusted examples. Do not paste code you do not trust.`}),(0,b.jsxs)(`div`,{className:`grid min-w-0 flex-none grid-cols-1 gap-0 lg:min-h-0 lg:flex-1 lg:grid-cols-2`,children:[(0,b.jsxs)(`section`,{className:`flex min-h-[28rem] min-w-0 flex-col border-b border-gray-200 bg-white lg:min-h-0 lg:border-b-0 lg:border-r`,children:[(0,b.jsx)(`div`,{className:`border-b border-gray-200 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500`,children:`JSX`}),(0,b.jsx)(m,{ariaLabel:`JSX`,beforeMount:ne,inferLanguageFromPath:!0,language:`typescript`,onChange:P,path:S,value:N})]}),(0,b.jsxs)(`section`,{className:`flex min-h-[44rem] min-w-0 flex-col bg-gray-100 lg:min-h-0`,children:[(0,b.jsxs)(`div`,{className:`flex flex-col gap-2 border-b border-gray-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500 sm:flex-row sm:items-center sm:justify-between`,children:[(0,b.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,b.jsx)(`span`,{children:M===`form`?`Form`:`Viewer`}),(0,b.jsx)(`div`,{className:`inline-flex overflow-hidden rounded border border-gray-300 normal-case tracking-normal`,children:[`viewer`,`form`].map(e=>(0,b.jsx)(`button`,{type:`button`,onClick:()=>re(e),className:`px-2 py-1 text-xs ${M===e?`bg-green-50 text-green-700`:`bg-white text-gray-600 hover:bg-gray-50`}`,children:e===`form`?`Form`:`Viewer`},e))})]}),(0,b.jsxs)(`div`,{className:`flex items-center gap-3 normal-case tracking-normal`,children:[V!==null&&(0,b.jsxs)(`span`,{children:[`render `,V,`ms`]}),U!==null&&(0,b.jsxs)(`span`,{children:[`pdf `,U,`ms`]}),z&&(0,b.jsx)(`span`,{className:`max-w-[32rem] truncate text-red-600`,children:z})]})]}),(0,b.jsx)(`div`,{ref:n,className:`h-[38rem] flex-none lg:h-auto lg:min-h-0 lg:flex-1`})]})]})]})}export{E as default};
//# sourceMappingURL=JsxPlayground-D0SFpGa1.js.map