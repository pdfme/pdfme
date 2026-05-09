import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Template, checkTemplate, getInputFromTemplate, Lang } from '@pdfme/common';
import { Form, Viewer } from '@pdfme/ui';
import {
  fromKebabCase,
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
import ProjectSavedToast from '../components/ProjectSavedToast';
import { NavItem, NavBar } from '../components/NavBar';
import {
  getActivePlaygroundProject,
  getPlaygroundProject,
  savePlaygroundProject,
  type PlaygroundProject,
} from '../lib/playgroundProjects';
import { createTemplateThumbnailDataUrl } from '../lib/templateThumbnails';

type Mode = 'form' | 'viewer';

function FormAndViewerApp() {
  const [searchParams] = useSearchParams();
  const uiRef = useRef<HTMLDivElement | null>(null);
  const ui = useRef<Form | Viewer | null>(null);
  const projectRef = useRef<PlaygroundProject | null>(null);
  const buildIdRef = useRef(0);
  const currentSourceKeyRef = useRef<string | null>(null);
  const currentTemplateRef = useRef<Template | null>(null);
  const currentInputsRef = useRef<Record<string, string>[] | null>(null);

  const [mode, setMode] = useState<Mode>((localStorage.getItem('mode') as Mode) ?? 'form');
  const [projectTitle, setProjectTitle] = useState('Untitled Template');

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
        let project: PlaygroundProject | null = null;
        let inputs: Record<string, string>[] | null = null;
        const templateIdFromQuery = searchParams.get('template');
        const projectIdFromQuery = searchParams.get('project');
        const sourceKey = projectIdFromQuery
          ? `project:${projectIdFromQuery}`
          : templateIdFromQuery
            ? `template:${templateIdFromQuery}`
            : 'current-or-default';

        if (currentSourceKeyRef.current === sourceKey && currentTemplateRef.current) {
          template = currentTemplateRef.current;
          inputs = ui.current?.getInputs() ?? currentInputsRef.current;
          project = projectRef.current;
        } else if (projectIdFromQuery) {
          project = getPlaygroundProject(projectIdFromQuery);
          if (!project) throw new Error('Project not found');
          template = project.template;
          inputs = project.inputs;
        } else if (templateIdFromQuery) {
          const templateJson = await getTemplateById(templateIdFromQuery);
          checkTemplate(templateJson);
          template = templateJson;
          setProjectTitle(fromKebabCase(templateIdFromQuery));
        } else {
          project = getActivePlaygroundProject();
          if (project) {
            template = project.template;
            inputs = project.inputs;
          } else {
            template = await getDefaultPlaygroundTemplate();
            setProjectTitle(fromKebabCase('invoice'));
          }
        }

        const resolvedInputs = inputs ?? getInputFromTemplate(template);

        if (buildId !== buildIdRef.current || !uiRef.current) return;

        destroyCurrentUi();
        projectRef.current = project;
        currentSourceKeyRef.current = sourceKey;
        currentTemplateRef.current = template;
        currentInputsRef.current = resolvedInputs;
        if (project) setProjectTitle(project.title);

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
        projectRef.current = null;
        currentSourceKeyRef.current = null;
        currentTemplateRef.current = null;
        currentInputsRef.current = null;
        console.error(error);
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

  const onSaveInputs = async (saveAs = false) => {
    if (!ui.current) return;

    const currentProject = projectRef.current;
    const nextInputs = ui.current.getInputs();
    const nextTemplate = ui.current.getTemplate();
    const currentTitle = (currentProject?.title ?? projectTitle) || 'Untitled Template';
    const title = saveAs
      ? (window.prompt('Save as', `${currentTitle} Copy`) ?? '')
      : (currentProject?.title ?? window.prompt('Project name', currentTitle) ?? '');
    if (!title.trim()) return;

    const thumbnail = await createTemplateThumbnailDataUrl(nextTemplate, nextInputs).catch(
      () => currentProject?.thumbnail,
    );
    const savedProject = savePlaygroundProject({
      id: saveAs ? undefined : currentProject?.id,
      inputs: nextInputs,
      kind: currentProject?.kind ?? 'template',
      source: currentProject?.source,
      template: nextTemplate,
      thumbnail,
      title,
    });
    projectRef.current = savedProject;
    currentTemplateRef.current = nextTemplate;
    currentInputsRef.current = nextInputs;
    setProjectTitle(savedProject.title);
    toast.success(<ProjectSavedToast title={savedProject.title} />);
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

  const navItems: NavItem[] = [
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
          <PlaygroundButton onClick={() => void onSaveInputs()}>Save</PlaygroundButton>
          <PlaygroundButton onClick={() => void onSaveInputs(true)}>Save As</PlaygroundButton>
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
            await generatePDF(ui.current, output);
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
      <div ref={uiRef} className="flex-1 w-full" />
    </>
  );
}

export default FormAndViewerApp;
