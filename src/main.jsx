import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

const root = createRoot(document.getElementById("root"));

// StrictMode in React 18 intentionally runs effects twice in dev.
// Remove it here to ensure single GET during development.
root.render(
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);
