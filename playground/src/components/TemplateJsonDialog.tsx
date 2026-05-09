import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Check, X } from 'lucide-react';
import { Template, checkTemplate } from '@pdfme/common';
import PlaygroundButton from './PlaygroundButton';

const CodeEditor = lazy(() => import('./CodeEditor'));

const ASSET_PLACEHOLDER_PREFIX = '__PDFME_ASSET__:';
const EMBEDDED_ASSET_MIN_LENGTH = 1000;

type JsonPathSegment = string | number;

type EmbeddedAssetInfo = {
  mimeType: string;
  path: string;
  placeholder: string;
  size: string;
  value: string;
};

type EmbeddedAssetMap = Record<string, EmbeddedAssetInfo>;

type TemplateJsonDialogProps = {
  isOpen: boolean;
  template: Template | null;
  onClose: () => void;
  onCommit: (template: Template) => void;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === '[object Object]';

const formatJsonPath = (path: JsonPathSegment[]): string =>
  path.reduce<string>(
    (result, segment) =>
      typeof segment === 'number' ? `${result}[${segment}]` : `${result}.${segment}`,
    '$',
  );

const isEmbeddedAsset = (value: string) => {
  if (value.length < EMBEDDED_ASSET_MIN_LENGTH) return false;
  if (/^data:[^,]+;base64,/i.test(value)) return true;

  const normalized = value.replace(/\s/g, '');
  const looksLikeBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(normalized);
  const hasKnownBinaryPrefix =
    normalized.startsWith('JVBER') ||
    normalized.startsWith('iVBOR') ||
    normalized.startsWith('/9j/') ||
    normalized.startsWith('R0lGOD');

  return looksLikeBase64 && hasKnownBinaryPrefix;
};

const getEmbeddedAssetMimeType = (value: string) => {
  const dataUrlMatch = value.match(/^data:([^;,]+)[^,]*;base64,/i);
  if (dataUrlMatch?.[1]) return dataUrlMatch[1];

  const normalized = value.replace(/\s/g, '');
  if (normalized.startsWith('JVBER')) return 'application/pdf';
  if (normalized.startsWith('iVBOR')) return 'image/png';
  if (normalized.startsWith('/9j/')) return 'image/jpeg';
  if (normalized.startsWith('R0lGOD')) return 'image/gif';

  return 'base64';
};

const getEmbeddedAssetSize = (value: string) => {
  const base64 = /^data:[^,]+;base64,/i.test(value) ? value.slice(value.indexOf(',') + 1) : value;
  const normalized = base64.replace(/\s/g, '');
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  const bytes = Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const replaceEmbeddedAssetsWithPlaceholders = (template: Template) => {
  const assets: EmbeddedAssetMap = {};
  let assetIndex = 0;

  const replace = (value: unknown, path: JsonPathSegment[]): unknown => {
    if (typeof value === 'string' && isEmbeddedAsset(value)) {
      const placeholder = `${ASSET_PLACEHOLDER_PREFIX}asset_${assetIndex + 1}`;
      assetIndex += 1;
      assets[placeholder] = {
        mimeType: getEmbeddedAssetMimeType(value),
        path: formatJsonPath(path),
        placeholder,
        size: getEmbeddedAssetSize(value),
        value,
      };
      return placeholder;
    }

    if (Array.isArray(value)) return value.map((item, index) => replace(item, [...path, index]));

    if (isRecord(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, replace(item, [...path, key])]),
      );
    }

    return value;
  };

  return { assets, template: replace(template, []) as Template };
};

const restoreEmbeddedAssetsFromPlaceholders = (template: unknown, assets: EmbeddedAssetMap) => {
  const restore = (value: unknown, path: JsonPathSegment[]): unknown => {
    if (typeof value === 'string') {
      if (!value.startsWith(ASSET_PLACEHOLDER_PREFIX)) return value;

      const assetInfo = assets[value];
      if (!assetInfo) {
        throw new Error(`Unknown embedded asset placeholder: ${value}`);
      }

      const currentPath = formatJsonPath(path);
      if (currentPath !== assetInfo.path) {
        throw new Error(
          `Embedded asset placeholder ${value} is read-only and can only be used at ${assetInfo.path} (${assetInfo.mimeType}).`,
        );
      }

      return assetInfo.value;
    }

    if (Array.isArray(value)) return value.map((item, index) => restore(item, [...path, index]));

    if (isRecord(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, restore(item, [...path, key])]),
      );
    }

    return value;
  };

  return restore(template, []) as Template;
};

export default function TemplateJsonDialog({
  isOpen,
  template,
  onClose,
  onCommit,
}: TemplateJsonDialogProps) {
  const assetsRef = useRef<EmbeddedAssetMap>({});
  const [assetInfos, setAssetInfos] = useState<EmbeddedAssetInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!isOpen || !template) {
      assetsRef.current = {};
      setAssetInfos([]);
      setError(null);
      setValue('');
      return;
    }

    const { assets, template: editableTemplate } = replaceEmbeddedAssetsWithPlaceholders(template);
    assetsRef.current = assets;
    setAssetInfos(Object.values(assets));
    setError(null);
    setValue(JSON.stringify(editableTemplate, null, 2));
  }, [isOpen, template]);

  const handleCommit = () => {
    try {
      const restoredTemplate = restoreEmbeddedAssetsFromPlaceholders(
        JSON.parse(value),
        assetsRef.current,
      );
      checkTemplate(restoredTemplate);
      onCommit(restoredTemplate);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogPanel className="fixed inset-0 flex flex-col bg-white">
        <div className="flex min-h-16 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-6">
          <DialogTitle className="text-base font-semibold text-gray-900">
            Edit Template JSON
          </DialogTitle>
          <div className="flex items-center gap-2">
            <PlaygroundButton onClick={handleCommit} variant="primary">
              <Check className="size-4" />
              Commit
            </PlaygroundButton>
            <PlaygroundButton
              title="Close"
              aria-label="Close"
              onClick={onClose}
              className="px-2 sm:px-2"
            >
              <X className="size-4" />
            </PlaygroundButton>
          </div>
        </div>
        {error && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 sm:px-6">
            {error}
          </div>
        )}
        {assetInfos.length > 0 && (
          <div className="border-b border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-900 sm:px-6">
            <p>
              Embedded assets are read-only placeholders. Keep each token at its original path;
              moving or copying it can mismatch PDF/image data and will fail on Commit.
            </p>
            <div className="mt-2 max-h-24 space-y-1 overflow-auto font-mono text-xs">
              {assetInfos.map(({ mimeType, path, placeholder, size }) => (
                <div key={placeholder} className="flex flex-wrap gap-x-2 gap-y-1">
                  <span>{placeholder}</span>
                  <span>{mimeType}</span>
                  <span>{size}</span>
                  <span>{path}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <Suspense
          fallback={
            <div className="min-h-0 flex-1 bg-white px-4 py-3 text-sm text-gray-500">
              Loading editor...
            </div>
          }
        >
          <CodeEditor
            ariaLabel="Template JSON"
            autoFocus
            language="json"
            onChange={(e) => {
              setValue(e);
              setError(null);
            }}
            path="template.json"
            value={value}
          />
        </Suspense>
      </DialogPanel>
    </Dialog>
  );
}
