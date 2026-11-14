import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Register Service Worker for PWA Desktop & Mobile Home Screen Installation
if ("serviceWorker" in navigator && process.env.NODE_ENV !== "development") {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.log("PWA SW registered:", reg.scope))
      .catch((err) => console.warn("PWA SW failed:", err));
  });
} else if ("serviceWorker" in navigator) {
  // Also register on localhost so beforeinstallprompt fires on desktop Chrome/Edge
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.log("Local SW registered for install:", reg.scope))
      .catch((err) => console.warn("Local SW registration err:", err));
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

