import React from "react";
import { hydrateRoot, createRoot } from "react-dom/client";
import App from "./App";
import { BlogSsrData } from "./contexts/BlogSsrContext";
import { installUsDateLocaleDefaults } from "./lib/installUsDateLocaleDefaults";

installUsDateLocaleDefaults();

declare global {
  interface Window {
    __BLOG_SSR__?: BlogSsrData;
  }
}

const blogSsrData = typeof window !== "undefined" ? window.__BLOG_SSR__ ?? null : null;

const rootElement = document.getElementById("root");

if (rootElement) {
  if (rootElement.hasChildNodes()) {
    hydrateRoot(
      rootElement,
      <React.StrictMode>
        <App blogSsrData={blogSsrData ?? null} />
      </React.StrictMode>,
    );
  } else {
    createRoot(rootElement).render(
      <React.StrictMode>
        <App blogSsrData={blogSsrData ?? null} />
      </React.StrictMode>,
    );
  }
}
