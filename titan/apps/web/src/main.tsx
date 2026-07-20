import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App.js";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found — check index.html");
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
