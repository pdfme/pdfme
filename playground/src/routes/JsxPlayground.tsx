import { useEffect, useMemo, useRef, useState } from 'react';
import type { Template } from '@pdfme/common';
import {
  Absolute,
  Box,
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
  renderToTemplate,
  type PdfJsxChild,
} from '@pdfme/jsx';
import { Fragment, jsx } from '@pdfme/jsx/jsx-runtime';
import { Viewer } from '@pdfme/ui';
import { Download, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import * as ts from 'typescript';
import CodeEditor from '../components/CodeEditor';
import { downloadJsonFile, generatePDF, getFontsData } from '../helper';
import { getPlugins } from '../plugins';

const JSX_DOCS_URL = 'https://pdfme.com/docs/jsx#jsx-playground-beta';

const initialJsx = `return (
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
);`;

const jsxScope = {
  Absolute,
  Box,
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
};

const createElement = (
  type: Parameters<typeof jsx>[0],
  props: Record<string, unknown> | null,
  ...children: unknown[]
): PdfJsxChild => {
  const nextProps = { ...props };
  if (children.length > 0) {
    nextProps.children = children.length === 1 ? children[0] : children;
  }
  return jsx(type, nextProps);
};

const formatDiagnostic = (diagnostic: ts.Diagnostic) => {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  if (!diagnostic.file || diagnostic.start == null) return message;
  const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  return `${line + 1}:${character + 1} ${message}`;
};

const compileJsxFunctionBody = (source: string) => {
  if (/^\s*(import|export)\b/m.test(source)) {
    throw new Error(
      'The JSX playground beta does not support import/export. Use a function body that returns <Page> nodes.',
    );
  }

  const output = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      jsxFactory: 'createElement',
      jsxFragmentFactory: 'Fragment',
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: 'playground.tsx',
    reportDiagnostics: true,
  });

  const errors =
    output.diagnostics?.filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    ) ?? [];
  if (errors.length > 0) {
    throw new Error(errors.map(formatDiagnostic).join('\n'));
  }

  return output.outputText;
};

const renderJsxSource = async (source: string) => {
  const compiled = compileJsxFunctionBody(source);
  const scope = { ...jsxScope, Fragment, createElement };
  const scopeNames = Object.keys(scope);
  const scopeValues = Object.values(scope);
  const evaluate = new Function(...scopeNames, `"use strict";\n${compiled}`);
  const node = evaluate(...scopeValues) as PdfJsxChild;
  return renderToTemplate(node, { font: getFontsData() });
};

const configureJsxEditor: Parameters<typeof CodeEditor>[0]['beforeMount'] = (monaco) => {
  const typeScriptLanguage = monaco.languages.typescript;
  if (!typeScriptLanguage) return;

  typeScriptLanguage.typescriptDefaults.setCompilerOptions({
    allowNonTsExtensions: true,
    jsx: typeScriptLanguage.JsxEmit.React,
    jsxFactory: 'createElement',
    jsxFragmentFactory: 'Fragment',
    moduleResolution: typeScriptLanguage.ModuleResolutionKind.NodeJs,
    target: typeScriptLanguage.ScriptTarget.ES2020,
  });
  typeScriptLanguage.typescriptDefaults.addExtraLib(
    `
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
`,
    'file:///pdfme-jsx-playground.d.ts',
  );
};

export default function JsxPlayground() {
  const viewerRootRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [source, setSource] = useState(initialJsx);
  const [template, setTemplate] = useState<Template | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>[]>([{}]);
  const [error, setError] = useState<string | null>(null);
  const [renderDuration, setRenderDuration] = useState<number | null>(null);
  const [pdfDuration, setPdfDuration] = useState<number | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const editorKey = useMemo(() => 'jsx-playground.tsx', []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const startTimer = performance.now();
      try {
        const result = await renderJsxSource(source);
        if (cancelled) return;
        setTemplate(result.template);
        setInputs(result.inputs);
        setRenderDuration(Math.round(performance.now() - startTimer));
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setRenderDuration(null);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [source]);

  useEffect(() => {
    if (!viewerRootRef.current || !template) return;

    if (viewerRef.current) {
      viewerRef.current.updateTemplate(template);
      viewerRef.current.setInputs(inputs);
    } else {
      viewerRef.current = new Viewer({
        domContainer: viewerRootRef.current,
        template,
        inputs,
        options: {
          font: getFontsData(),
          lang: 'en',
          theme: {
            token: {
              colorPrimary: '#25c2a0',
            },
          },
        },
        plugins: getPlugins(),
      });
    }
  }, [template, inputs]);

  useEffect(() => {
    return () => {
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, []);

  const onGeneratePdf = async () => {
    if (isGeneratingPdf) return;

    const startTimer = performance.now();
    setIsGeneratingPdf(true);
    try {
      await generatePDF(viewerRef.current);
      const duration = Math.round(performance.now() - startTimer);
      setPdfDuration(duration);
      toast.info(`Generated PDF in ${duration}ms`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const onDownloadTemplate = () => {
    if (!template) return;
    downloadJsonFile(template, 'jsx-template');
  };

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-gray-100">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-gray-900">@pdfme/jsx (beta)</h1>
            <a
              href={JSX_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-600"
            >
              Docs
              <ExternalLink className="size-3" />
            </a>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Write a JSX function body that returns pdfme pages. Imports are intentionally disabled
            in this beta playground.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pl-4">
          <button
            type="button"
            disabled={!template || Boolean(error)}
            onClick={onDownloadTemplate}
            className="inline-flex items-center gap-1 rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="size-4" />
            Template JSON
          </button>
          <button
            type="button"
            disabled={!template || Boolean(error) || isGeneratingPdf}
            onClick={onGeneratePdf}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGeneratingPdf ? 'Generating...' : 'Generate PDF'}
          </button>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-2">
        <section className="flex min-h-[45vh] flex-col border-b border-gray-200 bg-white lg:min-h-0 lg:border-b-0 lg:border-r">
          <div className="border-b border-gray-200 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            JSX
          </div>
          <CodeEditor
            ariaLabel="JSX"
            beforeMount={configureJsxEditor}
            language="typescript"
            onChange={setSource}
            path={editorKey}
            value={source}
          />
        </section>
        <section className="flex min-h-[55vh] flex-col bg-gray-100 lg:min-h-0">
          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            <span>Viewer</span>
            <div className="flex items-center gap-3 normal-case tracking-normal">
              {renderDuration !== null && <span>render {renderDuration}ms</span>}
              {pdfDuration !== null && <span>pdf {pdfDuration}ms</span>}
              {error && <span className="max-w-[32rem] truncate text-red-600">{error}</span>}
            </div>
          </div>
          <div ref={viewerRootRef} className="min-h-0 flex-1" />
        </section>
      </div>
    </main>
  );
}
