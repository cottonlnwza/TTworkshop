import React from "react";
import { createRoot } from "react-dom/client";
import { AuthApp } from "./AuthApp.js";
import "./style.css";
const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");
createRoot(root).render(<React.StrictMode><AuthApp /></React.StrictMode>);
