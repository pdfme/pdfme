import { Routes, Route, useSearchParams } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import Designer from "./Designer";
import FormAndViewer from "./FormAndViewer";
import Templates from "./Templates";
import Header from "./Header";

function App() {
  const [searchParams] = useSearchParams();
  const isEmbedded = searchParams.get("embed") === "true";

  return (
    <div className="min-h-screen flex flex-col">
      {!isEmbedded && <Header />}
      <Routes>
        <Route path={"/"} element={<Designer />} />
        <Route path={"/designer"} element={<Designer />} />
        <Route path="/form-viewer" element={<FormAndViewer />} />
        <Route path="/templates" element={<Templates isEmbedded={isEmbedded} />} />
      </Routes>
      <ToastContainer />
    </div>
  );
}

export default App;