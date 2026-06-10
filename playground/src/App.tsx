import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import Header from './components/Header';

const Designer = lazy(() => import('./routes/Designer'));
const FormAndViewer = lazy(() => import('./routes/FormAndViewer'));
const Templates = lazy(() => import('./routes/Templates'));
const WorkspaceApp = lazy(() =>
  import('./routes/Templates').then((module) => ({ default: module.WorkspaceApp })),
);
const JsxPlayground = lazy(() => import('./routes/JsxPlayground'));
const Md2Pdf = lazy(() => import('./routes/Md2Pdf'));

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Suspense fallback={<main className="min-h-0 flex-1 bg-gray-100" />}>
        <Routes>
          <Route path={'/'} element={<Templates />} />
          <Route path="/workspace" element={<WorkspaceApp />} />
          <Route path={'/designer'} element={<Designer />} />
          <Route path="/form-viewer" element={<FormAndViewer />} />
          <Route path="/jsx" element={<JsxPlayground />} />
          <Route path="/md2pdf" element={<Md2Pdf />} />
          <Route path="/templates" element={<Templates />} />
        </Routes>
      </Suspense>
      <ToastContainer />
    </div>
  );
}
