import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Root } from "@/app/Root";

import "@/styles/fonts.css";
import "@/styles/tokens.css";
import "@/styles/reset.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing #root element.");

createRoot(rootEl).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
