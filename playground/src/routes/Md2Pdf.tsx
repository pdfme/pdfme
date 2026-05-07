import { useEffect, useRef, useState } from 'react';
import type { Template } from '@pdfme/common';
import { md2pdf } from '@pdfme/converter/md2pdf';
import { Viewer } from '@pdfme/ui';
import { ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import { generatePDF, getFontsData } from '../helper';
import { getPlugins } from '../plugins';

const initialMarkdown = `# md2pdf playground

Markdownからpdfme Templateを作ります。日本語もフォントを指定すれば表示できます。

## Blocks

- Paragraph
- **Bold**, *italic*, ~~strike~~, \`inline code\`
- [pdfme](https://pdfme.com)

---

> Blockquote uses a left rule and padding.

\`\`\`ts
const template = await md2pdf(markdown);
\`\`\`

| Feature | Status |
| --- | --- |
| Table grid | Supported |
| Remote image | Link fallback |
`;

export default function Md2Pdf() {
  const viewerRootRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [template, setTemplate] = useState<Template | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>[]>([{}]);
  const [error, setError] = useState<string | null>(null);
  const [renderDuration, setRenderDuration] = useState<number | null>(null);
  const [pdfDuration, setPdfDuration] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const startTimer = performance.now();
      try {
        const result = await md2pdf(markdown, {
          style: {
            fontName: 'NotoSansJP',
            lineHeight: 1.3,
          },
        });
        if (cancelled) return;
        setTemplate(result.template);
        setInputs(result.inputs);
        setRenderDuration(Math.round(performance.now() - startTimer));
        setError(null);
      } catch (error) {
        if (cancelled) return;
        setError(error instanceof Error ? error.message : String(error));
        setRenderDuration(null);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [markdown]);

  useEffect(() => {
    if (!viewerRootRef.current || !template) return;

    viewerRef.current?.destroy();
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

    return () => {
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, [template, inputs]);

  const onGeneratePdf = async () => {
    const startTimer = performance.now();
    await generatePDF(viewerRef.current);
    const duration = Math.round(performance.now() - startTimer);
    setPdfDuration(duration);
    toast.info(`Generated PDF in ${duration}ms`);
  };

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-gray-100">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-gray-900">md2pdf</h1>
            <a
              href="https://pdfme.com/docs/converter#md2pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-600"
            >
              Docs
              <ExternalLink className="size-3" />
            </a>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            GFM support is intentionally partial: complex table/list content and remote images are
            simplified.
          </p>
        </div>
        <div className="shrink-0 pl-4">
          <button
            type="button"
            disabled={!template || Boolean(error)}
            onClick={onGeneratePdf}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Generate PDF
          </button>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-2">
        <section className="flex min-h-[45vh] flex-col border-b border-gray-200 bg-white lg:min-h-0 lg:border-b-0 lg:border-r">
          <div className="border-b border-gray-200 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Markdown
          </div>
          <textarea
            aria-label="Markdown"
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            spellCheck={false}
            className="min-h-0 flex-1 resize-none bg-white p-4 font-mono text-sm leading-6 text-gray-900 outline-none focus:ring-2 focus:ring-inset focus:ring-green-500"
          />
        </section>
        <section className="flex min-h-[55vh] flex-col bg-gray-100 lg:min-h-0">
          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            <span>Viewer</span>
            <div className="flex items-center gap-3 normal-case tracking-normal">
              {renderDuration !== null && <span>render {renderDuration}ms</span>}
              {pdfDuration !== null && <span>pdf {pdfDuration}ms</span>}
              {error && <span className="text-red-600">{error}</span>}
            </div>
          </div>
          <div ref={viewerRootRef} className="min-h-0 flex-1" />
        </section>
      </div>
    </main>
  );
}
