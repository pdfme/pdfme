import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkTemplate, type Template } from '@pdfme/common';
import { toast } from 'react-toastify';
import { downloadJsonFile } from '../helper';

type UseGeneratedTemplateActionsOptions = {
  template: Template | null;
  templateFileName: string;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const useGeneratedTemplateActions = ({
  template,
  templateFileName,
}: UseGeneratedTemplateActionsOptions) => {
  const navigate = useNavigate();

  const downloadTemplate = useCallback(() => {
    if (!template) return;
    downloadJsonFile(template, templateFileName);
  }, [template, templateFileName]);

  const openDesigner = useCallback(() => {
    if (!template) return;

    try {
      checkTemplate(template);
      const serializedTemplate = JSON.stringify(template);
      const savedTemplate = localStorage.getItem('template');
      if (
        savedTemplate &&
        savedTemplate !== serializedTemplate &&
        !window.confirm(
          'Opening Designer will replace the template saved in local storage. Continue?',
        )
      ) {
        return;
      }

      localStorage.setItem('template', serializedTemplate);
      localStorage.removeItem('inputs');
      toast.success('Saved generated template — opening Designer');
      navigate('/designer');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [navigate, template]);

  return { downloadTemplate, openDesigner };
};
