(function(){try{var e=typeof window<`u`?window:typeof global<`u`?global:typeof globalThis<`u`?globalThis:typeof self<`u`?self:{};e.SENTRY_RELEASE={id:`127113b93e94f5e27d806669c267c634907183f5`};var t=new e.Error().stack;t&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[t]=`8c27111c-f307-4791-8919-a3626c80678e`,e._sentryDebugIdIdentifier=`sentry-dbid-8c27111c-f307-4791-8919-a3626c80678e`)}catch{}})();import{r as e}from"./chunk-CM5b76Wv.js";import{n as t,t as n}from"./jsx-runtime-DWwCVFjE.js";import{t as r}from"./external-link-BZVvfN1l.js";import{a as i,i as a,l as o,n as s,r as c,t as l,u}from"./index-ByGKu00L.js";import d from"./CodeEditor-DrnRJxKK.js";var f=o(`Download`,[[`path`,{d:`M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4`,key:`ih7n3h`}],[`polyline`,{points:`7 10 12 15 17 10`,key:`2ggqvy`}],[`line`,{x1:`12`,x2:`12`,y1:`15`,y2:`3`,key:`1vk2je`}]]),p=e(t()),m=`return (
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
          <Text width={40} height={5} size={7} align="right" color="#64748b">
            Page 1
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
          widths={[55, 15, 30]}
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
);`;function h(e){return new Worker(`/assets/jsxPlaygroundWorker-38MoObKj.js`,{name:e?.name})}var g=n(),_=`https://pdfme.com/docs/jsx#jsx-playground-beta`,v=`file:///jsx-playground.tsx`,y=15e3,b=e=>{let t=e.languages.typescript;t&&(t.typescriptDefaults.setCompilerOptions({allowNonTsExtensions:!0,jsx:t.JsxEmit.React,jsxFactory:`createElement`,jsxFragmentFactory:`Fragment`,moduleResolution:t.ModuleResolutionKind.NodeJs,target:t.ScriptTarget.ES2020}),t.typescriptDefaults.addExtraLib(`
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
`,`file:///pdfme-jsx-playground.d.ts`))};function x(){let e=(0,p.useRef)(null),t=(0,p.useRef)(null),n=(0,p.useRef)(null),o=(0,p.useRef)(null),x=(0,p.useRef)(0),[S,C]=(0,p.useState)(m),[w,T]=(0,p.useState)(null),[E,D]=(0,p.useState)([{}]),[O,k]=(0,p.useState)(null),[A,j]=(0,p.useState)(null),[M,N]=(0,p.useState)(null),[P,F]=(0,p.useState)(!1),I=(0,p.useCallback)(()=>{n.current?.terminate(),n.current=null},[]),L=(0,p.useCallback)(e=>{let t=o.current;t&&(window.clearTimeout(t.timeoutId),o.current=null,e&&t.reject(e))},[]),R=(0,p.useCallback)(()=>{if(n.current)return n.current;let e=new h;return e.onmessage=e=>{let t=o.current;!t||e.data.id!==t.id||(L(),e.data.ok?t.resolve(e.data.result):t.reject(Error(e.data.error)))},e.onerror=e=>{let t=o.current;L(),I(),t?.reject(Error(e.message||`JSX render worker failed.`))},n.current=e,e},[L,I]),z=(0,p.useCallback)(e=>new Promise((t,n)=>{o.current&&(L(Error(`JSX render cancelled.`)),I());let r=R(),i=x.current+=1;o.current={id:i,reject:n,resolve:t,timeoutId:window.setTimeout(()=>{let e=o.current;!e||e.id!==i||(L(Error(`JSX render timed out.`)),I())},y)},r.postMessage({font:c(),id:i,source:e})}),[L,R,I]);return(0,p.useEffect)(()=>{let e=!1,t=window.setTimeout(async()=>{let t=performance.now();try{let n=await z(S);if(e)return;T(n.template),D(n.inputs),j(Math.round(performance.now()-t)),k(null)}catch(t){if(e)return;k(t instanceof Error?t.message:String(t)),j(null)}},250);return()=>{e=!0,window.clearTimeout(t)}},[z,S]),(0,p.useEffect)(()=>{!e.current||!w||(t.current?(t.current.updateTemplate(w),t.current.setInputs(E)):t.current=new i({domContainer:e.current,template:w,inputs:E,options:{font:c(),lang:`en`,theme:{token:{colorPrimary:`#25c2a0`}}},plugins:a()}))},[w,E]),(0,p.useEffect)(()=>()=>{L(Error(`JSX render cancelled.`)),I(),t.current?.destroy(),t.current=null},[L,I]),(0,g.jsxs)(`main`,{className:`flex min-h-0 flex-1 flex-col bg-gray-100`,children:[(0,g.jsxs)(`div`,{className:`flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3`,children:[(0,g.jsxs)(`div`,{className:`min-w-0`,children:[(0,g.jsxs)(`div`,{className:`flex items-center gap-3`,children:[(0,g.jsx)(`h1`,{className:`text-sm font-semibold text-gray-900`,children:`@pdfme/jsx (beta)`}),(0,g.jsxs)(`a`,{href:_,target:`_blank`,rel:`noopener noreferrer`,className:`inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-600`,children:[`Docs`,(0,g.jsx)(r,{className:`size-3`})]})]}),(0,g.jsx)(`p`,{className:`mt-1 text-xs text-gray-500`,children:`Write a JSX function body that returns pdfme pages. Imports are intentionally disabled in this beta playground.`})]}),(0,g.jsxs)(`div`,{className:`flex shrink-0 items-center gap-2 pl-4`,children:[(0,g.jsxs)(`button`,{type:`button`,disabled:!w||!!O,onClick:()=>{w&&l(w,`jsx-template`)},className:`inline-flex items-center gap-1 rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50`,children:[(0,g.jsx)(f,{className:`size-4`}),`Template JSON`]}),(0,g.jsx)(`button`,{type:`button`,disabled:!w||!!O||P,onClick:async()=>{if(P)return;let e=performance.now();F(!0);try{await s(t.current);let n=Math.round(performance.now()-e);N(n),u.info(`Generated PDF in ${n}ms`)}catch(e){u.error(e instanceof Error?e.message:String(e))}finally{F(!1)}},className:`rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50`,children:P?`Generating...`:`Generate PDF`})]})]}),(0,g.jsx)(`div`,{className:`border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900`,children:`This beta runs JSX in an isolated worker and blocks common browser globals, but it is still for trusted examples. Do not paste code you do not trust.`}),(0,g.jsxs)(`div`,{className:`grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-2`,children:[(0,g.jsxs)(`section`,{className:`flex min-h-[45vh] flex-col border-b border-gray-200 bg-white lg:min-h-0 lg:border-b-0 lg:border-r`,children:[(0,g.jsx)(`div`,{className:`border-b border-gray-200 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500`,children:`JSX`}),(0,g.jsx)(d,{ariaLabel:`JSX`,beforeMount:b,inferLanguageFromPath:!0,language:`typescript`,onChange:C,path:v,value:S})]}),(0,g.jsxs)(`section`,{className:`flex min-h-[55vh] flex-col bg-gray-100 lg:min-h-0`,children:[(0,g.jsxs)(`div`,{className:`flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500`,children:[(0,g.jsx)(`span`,{children:`Viewer`}),(0,g.jsxs)(`div`,{className:`flex items-center gap-3 normal-case tracking-normal`,children:[A!==null&&(0,g.jsxs)(`span`,{children:[`render `,A,`ms`]}),M!==null&&(0,g.jsxs)(`span`,{children:[`pdf `,M,`ms`]}),O&&(0,g.jsx)(`span`,{className:`max-w-[32rem] truncate text-red-600`,children:O})]})]}),(0,g.jsx)(`div`,{ref:e,className:`min-h-0 flex-1`})]})]})]})}export{x as default};
//# sourceMappingURL=JsxPlayground-BSvBmpef.js.map