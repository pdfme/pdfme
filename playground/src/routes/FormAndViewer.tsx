import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Pencil } from 'lucide-react';
import { Template, getInputFromTemplate, Lang } from '@pdfme/common';
import { Form, Viewer } from '@pdfme/ui';
import {
  getFontsData,
  getTemplateById,
  getBlankTemplate,
  getDefaultPlaygroundTemplate,
  generatePDF,
  isJsonString,
  translations,
} from '../helper';
import { getPlugins } from '../plugins';
import PlaygroundButton from '../components/PlaygroundButton';
import { NavItem, NavBar } from '../components/NavBar';
import { getErrorMessage } from '../lib/errors';
import { getActivePlaygroundProject, getPlaygroundProject } from '../lib/playgroundProjects';
import {
  FileWorkspaceTemplateDeletedError,
  FileWorkspaceTemplateInvalidError,
  findTemplateEntry,
  restorePersistedTemplateCollection,
  setSelectedFileWorkspaceTemplateName,
  subscribeTemplateEntryChanges,
  type FileWorkspaceTemplateEntry,
} from '../lib/fileWorkspace';
import { createPlaygroundTemplateRouteFromSearchParams } from '../lib/playgroundRoutes';
import { reconcileInputsWithTemplate } from '../lib/templateInputs';

type Mode = 'form' | 'viewer';

function FormAndViewerApp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uiRef = useRef<HTMLDivElement | null>(null);
  const ui = useRef<Form | Viewer | null>(null);
  const fileWorkspaceEntryRef = useRef<FileWorkspaceTemplateEntry | null>(null);
  const diskVersionRef = useRef<string | null>(null);
  const fileWorkspaceStatusRef = useRef<'deleted' | 'invalid' | null>(null);
  const buildIdRef = useRef(0);
  const currentSourceKeyRef = useRef<string | null>(null);
  const currentTemplateRef = useRef<Template | null>(null);
  const currentInputsRef = useRef<Record<string, string>[] | null>(null);

  const [mode, setMode] = useState<Mode>(() =>
    localStorage.getItem('mode') === 'viewer' ? 'viewer' : 'form',
  );
  const [fileWorkspaceEntry, setFileWorkspaceEntry] = useState<FileWorkspaceTemplateEntry | null>(
    null,
  );
  const [fileWorkspaceStatus, setFileWorkspaceStatus] = useState<'deleted' | 'invalid' | null>(
    null,
  );
  const snapshotCurrentUi = useCallback(() => {
    if (!ui.current) return;

    currentTemplateRef.current = ui.current.getTemplate();
    currentInputsRef.current = ui.current.getInputs();
  }, []);

  const destroyCurrentUi = useCallback(() => {
    if (!ui.current) return;

    snapshotCurrentUi();
    ui.current.destroy();
    ui.current = null;
  }, [snapshotCurrentUi]);

  const buildUi = useCallback(
    async (mode: Mode) => {
      if (!uiRef.current) return;
      const buildId = ++buildIdRef.current;

      try {
        let template: Template = getBlankTemplate();
        let inputs: Record<string, string>[] | null = null;
        const templateIdFromQuery = searchParams.get('template');
        const projectIdFromQuery = searchParams.get('project');
        const workspaceTemplateName = searchParams.get('workspace');
        const sourceKey = workspaceTemplateName
          ? `workspace:${workspaceTemplateName}`
          : projectIdFromQuery
            ? `project:${projectIdFromQuery}`
            : templateIdFromQuery
              ? `template:${templateIdFromQuery}`
              : 'current-or-default';

        if (currentSourceKeyRef.current === sourceKey && currentTemplateRef.current) {
          template = currentTemplateRef.current;
          inputs = ui.current?.getInputs() ?? currentInputsRef.current;
        } else if (workspaceTemplateName) {
          const restored = await restorePersistedTemplateCollection();
          if (restored.status !== 'mounted') {
            throw new Error('Mounted folder is not available. Reopen it from Templates.');
          }

          const entry = findTemplateEntry(restored.collection, workspaceTemplateName);
          if (!entry) {
            throw new Error(
              `Template "${workspaceTemplateName}" was not found in the mounted folder.`,
            );
          }

          template = entry.template;
          inputs = getInputFromTemplate(template);
          fileWorkspaceEntryRef.current = entry;
          diskVersionRef.current = entry.diskVersion;
          setFileWorkspaceEntry(entry);
          setFileWorkspaceStatus(null);
          await setSelectedFileWorkspaceTemplateName(restored.collection.rootHandle, entry.name);
        } else if (projectIdFromQuery) {
          fileWorkspaceEntryRef.current = null;
          diskVersionRef.current = null;
          setFileWorkspaceEntry(null);
          setFileWorkspaceStatus(null);
          const project = await getPlaygroundProject(projectIdFromQuery);
          if (!project) throw new Error('Project not found');
          template = project.template;
          inputs = project.inputs;
        } else if (templateIdFromQuery) {
          fileWorkspaceEntryRef.current = null;
          diskVersionRef.current = null;
          setFileWorkspaceEntry(null);
          setFileWorkspaceStatus(null);
          template = await getTemplateById(templateIdFromQuery);
        } else {
          fileWorkspaceEntryRef.current = null;
          diskVersionRef.current = null;
          setFileWorkspaceEntry(null);
          setFileWorkspaceStatus(null);
          const project = await getActivePlaygroundProject();
          if (project) {
            template = project.template;
            inputs = project.inputs;
          } else {
            template = await getDefaultPlaygroundTemplate();
          }
        }

        const resolvedInputs = inputs ?? getInputFromTemplate(template);

        if (buildId !== buildIdRef.current || !uiRef.current) return;

        destroyCurrentUi();
        currentSourceKeyRef.current = sourceKey;
        currentTemplateRef.current = template;
        currentInputsRef.current = resolvedInputs;

        ui.current = new (mode === 'form' ? Form : Viewer)({
          domContainer: uiRef.current,
          template,
          inputs: resolvedInputs,
          options: {
            font: getFontsData(),
            lang: 'en',
            labels: { 'signature.clear': 'Clear' },
            theme: {
              token: {
                colorPrimary: '#25c2a0',
              },
            },
          },
          plugins: getPlugins(),
        });
      } catch (error) {
        fileWorkspaceEntryRef.current = null;
        diskVersionRef.current = null;
        setFileWorkspaceEntry(null);
        setFileWorkspaceStatus(null);
        currentSourceKeyRef.current = null;
        currentTemplateRef.current = null;
        currentInputsRef.current = null;
        console.error(error);
        toast.error(getErrorMessage(error));
      }
    },
    [destroyCurrentUi, searchParams],
  );

  const updateMode = (value: Mode) => {
    setMode(value);
    localStorage.setItem('mode', value);
  };

  const onGetInputs = () => {
    if (ui.current) {
      const inputs = ui.current.getInputs();
      toast.info('Dumped as console.log');
      console.log(inputs);
    }
  };

  const onSetInputs = () => {
    if (ui.current) {
      const prompt = window.prompt('Enter Inputs JSONString') || '';
      try {
        const json = isJsonString(prompt) ? JSON.parse(prompt) : [{}];
        ui.current.setInputs(json);
      } catch (e) {
        alert(e);
      }
    }
  };

  const onResetInputs = () => {
    if (ui.current) {
      const template = ui.current.getTemplate();
      const nextInputs = getInputFromTemplate(template);
      ui.current.setInputs(nextInputs);
      currentInputsRef.current = nextInputs;
    }
  };

  useEffect(() => {
    buildUi(mode);
    return () => {
      buildIdRef.current += 1;
      destroyCurrentUi();
    };
  }, [mode, uiRef, buildUi, destroyCurrentUi]);

  useEffect(() => {
    fileWorkspaceStatusRef.current = fileWorkspaceStatus;
  }, [fileWorkspaceStatus]);

  useEffect(() => {
    if (!fileWorkspaceEntry) return;

    return subscribeTemplateEntryChanges(
      fileWorkspaceEntry,
      (readResult) => {
        const currentEntry = fileWorkspaceEntryRef.current;
        if (!currentEntry || !ui.current) return;

        if (readResult.diskVersion === diskVersionRef.current) {
          if (fileWorkspaceStatusRef.current) setFileWorkspaceStatus(null);
          return;
        }

        const nextInputs = reconcileInputsWithTemplate(
          readResult.template,
          ui.current.getInputs() ?? currentInputsRef.current,
        );
        ui.current.updateTemplate(readResult.template);
        ui.current.setInputs(nextInputs);

        const nextEntry = {
          ...currentEntry,
          diskVersion: readResult.diskVersion,
          template: readResult.template,
          updatedAt: readResult.templateFile.lastModified,
        };
        fileWorkspaceEntryRef.current = nextEntry;
        diskVersionRef.current = readResult.diskVersion;
        currentTemplateRef.current = readResult.template;
        currentInputsRef.current = nextInputs;
        setFileWorkspaceEntry(nextEntry);
        setFileWorkspaceStatus(null);
        toast.info(`Reloaded ${currentEntry.path} from disk`, {
          toastId: `file-workspace-reload:${currentEntry.path}`,
        });
      },
      {
        onError: (error) => {
          if (error instanceof FileWorkspaceTemplateDeletedError) {
            setFileWorkspaceStatus('deleted');
            return;
          }

          if (error instanceof FileWorkspaceTemplateInvalidError) {
            setFileWorkspaceStatus('invalid');
            return;
          }

          console.error(error);
        },
      },
    );
  }, [fileWorkspaceEntry]);

  const designerPath = createPlaygroundTemplateRouteFromSearchParams('designer', searchParams);

  const navItems: NavItem[] = [
    {
      label: 'Design',
      content: (
        <PlaygroundButton id="open-designer" onClick={() => navigate(designerPath)}>
          <Pencil className="size-3.5" />
          Designer
        </PlaygroundButton>
      ),
    },
    {
      label: 'Lang',
      content: (
        <select
          className="w-full border rounded px-2 py-1 border-gray-300"
          onChange={(e) => {
            ui.current?.updateOptions({ lang: e.target.value as Lang });
          }}
        >
          {translations.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      label: 'Mode',
      content: (
        <div className="flex gap-1">
          {(['form', 'viewer'] as const).map((item) => (
            <PlaygroundButton
              key={item}
              variant={mode === item ? 'primary' : 'secondary'}
              onClick={() => updateMode(item)}
            >
              {item === 'form' ? 'Form' : 'Viewer'}
            </PlaygroundButton>
          ))}
        </div>
      ),
    },
    {
      label: 'Inputs',
      content: (
        <div className="flex gap-1">
          <PlaygroundButton onClick={onGetInputs}>Get</PlaygroundButton>
          <PlaygroundButton onClick={onSetInputs}>Set</PlaygroundButton>
          <PlaygroundButton onClick={onResetInputs}>Reset</PlaygroundButton>
        </div>
      ),
    },
    {
      label: 'Output',
      content: (
        <PlaygroundButton
          id="generate-pdf"
          onClick={async (e) => {
            const output = e.altKey ? 'form' : 'pdf';
            const startTimer = performance.now();
            const generated = await generatePDF(ui.current, output);
            if (!generated) return;
            const endTimer = performance.now();
            toast.info(
              `Generated ${output === 'form' ? 'Form' : 'PDF'} in ${Math.round(
                endTimer - startTimer,
              )}ms ⚡️`,
            );
          }}
        >
          Generate PDF
        </PlaygroundButton>
      ),
    },
  ];

  return (
    <>
      <NavBar items={navItems} />
      {fileWorkspaceEntry && fileWorkspaceStatus && (
        <div className="border-b border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
          {fileWorkspaceStatus === 'invalid' &&
            `${fileWorkspaceEntry.path} is currently invalid on disk. The viewer is keeping the last valid template.`}
          {fileWorkspaceStatus === 'deleted' &&
            `${fileWorkspaceEntry.path} was deleted on disk. The viewer is keeping the last loaded template.`}
        </div>
      )}
      <div ref={uiRef} className="flex-1 w-full" />
    </>
  );
}

export default FormAndViewerApp;
