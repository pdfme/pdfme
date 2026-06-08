import { Link } from 'react-router-dom';

type ProjectSavedToastProps = {
  formPath?: string;
  title: string;
};

export default function ProjectSavedToast({ formPath, title }: ProjectSavedToastProps) {
  return (
    <div>
      <p>Saved "{title}"</p>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
        <Link
          to="/workspace"
          className="inline-flex text-sm font-medium text-green-700 underline hover:text-green-600"
        >
          View in My Workspace
        </Link>
        {formPath && (
          <Link
            to={formPath}
            className="inline-flex text-sm font-medium text-green-700 underline hover:text-green-600"
          >
            Open Form/Viewer
          </Link>
        )}
      </div>
    </div>
  );
}
