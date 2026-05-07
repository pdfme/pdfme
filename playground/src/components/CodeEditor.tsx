import Editor, { loader, type BeforeMount, type OnMount } from '@monaco-editor/react';
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution.js';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import 'monaco-editor/esm/vs/language/json/monaco.contribution.js';
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution.js';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

type CodeEditorProps = {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  language: 'json' | 'markdown' | 'typescript';
  path?: string;
  inferLanguageFromPath?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  className?: string;
  beforeMount?: BeforeMount;
};

let isMonacoConfigured = false;

const configureMonaco = () => {
  if (isMonacoConfigured || typeof globalThis === 'undefined') return;

  const globalScope = globalThis as typeof globalThis & {
    MonacoEnvironment?: {
      getWorker: (_workerId: string, label: string) => Worker;
    };
  };

  globalScope.MonacoEnvironment = {
    getWorker: (_workerId, label) => {
      if (label === 'json') return new jsonWorker();
      if (label === 'typescript' || label === 'javascript') return new tsWorker();
      return new editorWorker();
    },
  };

  loader.config({ monaco });
  isMonacoConfigured = true;
};

configureMonaco();

export default function CodeEditor({
  ariaLabel,
  value,
  onChange,
  language,
  path,
  inferLanguageFromPath = false,
  readOnly = false,
  autoFocus = false,
  className = 'min-h-0 flex-1',
  beforeMount,
}: CodeEditorProps) {
  const handleMount: OnMount = (editor) => {
    if (autoFocus) editor.focus();
  };

  return (
    <div className={className}>
      <Editor
        beforeMount={beforeMount}
        defaultLanguage={inferLanguageFromPath ? undefined : language}
        defaultPath={path}
        language={inferLanguageFromPath ? undefined : language}
        onChange={(nextValue) => onChange(nextValue ?? '')}
        onMount={handleMount}
        options={{
          ariaLabel,
          automaticLayout: true,
          fontSize: 13,
          insertSpaces: true,
          lineHeight: 20,
          minimap: { enabled: false },
          padding: { top: 12, bottom: 12 },
          readOnly,
          scrollBeyondLastLine: false,
          tabSize: 2,
          wordWrap: 'on',
        }}
        path={path}
        value={value}
        wrapperProps={{ 'aria-label': ariaLabel }}
      />
    </div>
  );
}
