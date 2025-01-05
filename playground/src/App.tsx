import { Routes, Route, useSearchParams } from "react-router-dom";
import Designer from "./Designer";
import FormAndViewer from "./FormAndViewer";
import Templates from "./Templates";
import Header from "./Header";

function App() {
  const [searchParams] = useSearchParams();
  const hideHeader = searchParams.get("hideHeader") === "true";

  return (
    <div className="min-h-screen flex flex-col">
      {!hideHeader && <Header />}
      <Routes>
        <Route path="/" element={<Designer />} />
        <Route path="/form-viewer" element={<FormAndViewer />} />
        <Route path="/templates" element={<Templates />} />
      </Routes>
    </div>
  );
}

export default App;