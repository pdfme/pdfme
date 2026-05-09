import { Link } from 'react-router-dom';

type ProjectSavedToastProps = {
  title: string;
};

export default function ProjectSavedToast({ title }: ProjectSavedToastProps) {
  return (
    <div>
      <p>Saved "{title}"</p>
      <Link
        to="/"
        className="mt-1 inline-flex text-sm font-medium text-green-700 underline hover:text-green-600"
      >
        View in Templates
      </Link>
    </div>
  );
}
