import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useSearchParams } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import Designer from './routes/Designer';
import FormAndViewer from './routes/FormAndViewer';
import Templates from './routes/Templates';
import Header from './components/Header';
import { consumePdfmeAgentSearchParam } from './lib/pdfmeAgentFeature';

const JsxPlayground = lazy(() => import('./routes/JsxPlayground'));
const Md2Pdf = lazy(() => import('./routes/Md2Pdf'));

export default function App() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const nextSearchParams = consumePdfmeAgentSearchParam(searchParams);
    if (nextSearchParams) setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Suspense fallback={<main className="min-h-0 flex-1 bg-gray-100" />}>
        <Routes>
          <Route path={'/'} element={<Templates />} />
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
