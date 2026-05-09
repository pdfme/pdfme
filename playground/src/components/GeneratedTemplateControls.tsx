import { Download, PencilRuler } from 'lucide-react';

type GeneratedTemplateControlsProps = {
  disabled?: boolean;
  onDownloadTemplate: () => void;
  onOpenDesigner: () => void;
};

const buttonClassName =
  'inline-flex min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded border border-gray-300 px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3';

export default function GeneratedTemplateControls({
  disabled = false,
  onDownloadTemplate,
  onOpenDesigner,
}: GeneratedTemplateControlsProps) {
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={onDownloadTemplate}
        className={buttonClassName}
      >
        <Download className="size-4" />
        Template JSON
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onOpenDesigner}
        className={buttonClassName}
      >
        <PencilRuler className="size-4" />
        Open Designer
      </button>
    </>
  );
}
