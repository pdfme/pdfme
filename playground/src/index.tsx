import React from "react";
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from "react-router-dom";
import * as Sentry from "@sentry/react";
import "./index.css";
import App from "./App";

// Initialize Sentry
Sentry.init({
  dsn: "https://f1c36f7b16ef87c459c35c8e5df07633@o138687.ingest.us.sentry.io/4508969425043456"
});

const container = document.getElementById('root')!;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
