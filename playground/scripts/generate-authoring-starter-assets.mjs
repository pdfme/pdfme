import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import pLimit from 'p-limit';
import { checkTemplate } from '@pdfme/common';
import { md2pdf } from '@pdfme/converter/md2pdf';
import {
  Absolute,
  Box,
  Document,
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
} from '@pdfme/jsx';
import { Fragment, jsx } from '@pdfme/jsx/jsx-runtime';
import { transform } from 'sucrase';
import { font } from './template-thumbnail-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const playgroundPath = path.resolve(__dirname, '..');
const templateAssetsPath = path.join(playgroundPath, 'public', 'template-assets');
const hashMapPath = path.join(__dirname, 'authoring-starter-asset-hash-map.json');
const limit = pLimit(4);

const jsxScope = {
  Absolute,
  Box,
  Document,
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

function calcHash(content) {
  return crypto.createHash('md5').update(content, 'utf8').digest('hex');
}

function loadTsExports(filePath) {
  const source = fs.readFileSync(filePath, 'utf-8');
  const { code } = transform(source, {
    filePath,
    transforms: ['typescript', 'imports'],
  });
  const exports = {};
  const context = {
    exports,
    module: { exports },
  };
  vm.runInNewContext(code, context, { filename: filePath });
  return context.module.exports;
}

const createElement = (type, props, ...children) => {
  const nextProps = { ...props };
  if (children.length > 0) {
    nextProps.children = children.length === 1 ? children[0] : children;
  }
  return jsx(type, nextProps);
};

async function renderJsxTemplate(source) {
  const compiled = transform(source, {
    filePath: 'playground.tsx',
    jsxFragmentPragma: 'Fragment',
    jsxPragma: 'createElement',
    production: true,
    transforms: ['typescript', 'jsx'],
  }).code;
  const scope = { ...jsxScope, Fragment, createElement };
  const scopeNames = Object.keys(scope);
  const scopeValues = Object.values(scope);
  const evaluate = new Function(...scopeNames, `"use strict";\n${compiled}`);
  const element = evaluate(...scopeValues);
  const result = await renderToTemplate(element, { font });
  checkTemplate(result.template);
  return result.template;
}

async function renderMd2PdfTemplate(markdown) {
  const result = await md2pdf(markdown, {
    style: {
      fontName: 'NotoSansJP',
      lineHeight: 1.3,
    },
  });
  checkTemplate(result.template);
  return result.template;
}

async function main() {
  const { jsxPlaygroundPresets } = loadTsExports(
    path.join(playgroundPath, 'src', 'routes', 'jsxPlaygroundExamples.ts'),
  );
  const { md2PdfPresets } = loadTsExports(
    path.join(playgroundPath, 'src', 'routes', 'md2PdfPresets.ts'),
  );
  const starters = [
    ...jsxPlaygroundPresets.map((preset) => ({
      content: preset.source,
      id: preset.id,
      kind: 'jsx',
    })),
    ...md2PdfPresets.map((preset) => ({
      content: preset.markdown,
      id: preset.id,
      kind: 'md2pdf',
    })),
  ];

  let hashMap = {};
  if (fs.existsSync(hashMapPath)) {
    try {
      hashMap = JSON.parse(fs.readFileSync(hashMapPath, 'utf-8'));
    } catch {
      console.warn('Failed to parse authoring starter thumbnail hash map. Initializing empty map.');
    }
  }

  fs.mkdirSync(templateAssetsPath, { recursive: true });

  await Promise.all(
    starters.map((starter) =>
      limit(async () => {
        const assetId = `${starter.kind}-${starter.id}`;
        const currentHash = calcHash(`${starter.kind}:${starter.content}`);
        const assetPath = path.join(templateAssetsPath, assetId);
        const templateJsonPath = path.join(assetPath, 'template.json');
        if (hashMap[assetId] === currentHash && fs.existsSync(templateJsonPath)) {
          console.log(`No changes in ${assetId}. Skipping authoring starter generation.`);
          return;
        }

        const template =
          starter.kind === 'jsx'
            ? await renderJsxTemplate(starter.content)
            : await renderMd2PdfTemplate(starter.content);
        fs.mkdirSync(assetPath, { recursive: true });
        fs.writeFileSync(
          templateJsonPath,
          JSON.stringify({ ...template, author: 'pdfme' }, null, 2),
          'utf-8',
        );

        hashMap[assetId] = currentHash;
        console.log(`Generated authoring starter template for ${assetId}.`);
      }),
    ),
  );

  fs.writeFileSync(hashMapPath, JSON.stringify(hashMap, null, 2), 'utf-8');
  console.log('Authoring starter asset generation process completed!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
