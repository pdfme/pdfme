import React from "react";
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import Designer from "./Designer";
import FormAndViewer from "./FormAndViewer";
import Navigation from "./Navigation";


const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path="/" element={<Designer />}></Route>
        <Route path="/form-viewer" element={<FormAndViewer />}></Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>);
