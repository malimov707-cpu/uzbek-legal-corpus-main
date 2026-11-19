import React from "react";
import { createRoot } from "react-dom/client";
import { ConferencePage } from "./app/Page";
import "./conference.css";

const root = document.getElementById("conference-root");
if (!root) throw new Error("Conference page root element is missing.");

createRoot(root).render(
  <React.StrictMode>
    <ConferencePage />
  </React.StrictMode>,
);
