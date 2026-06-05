import React from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import App from "./App";
import { BlogSsrData } from "./contexts/BlogSsrContext";

export async function render(url: string, blogSsrData: BlogSsrData) {
  const helmetContext: { helmet?: any } = {};
  const appHtml = renderToString(
    <App
      router={StaticRouter}
      routerProps={{ location: url }}
      helmetContext={helmetContext}
      blogSsrData={blogSsrData ?? null}
    />,
  );

  const helmet = helmetContext.helmet;
  const headTags = [
    helmet?.title?.toString(),
    helmet?.meta?.toString(),
    helmet?.link?.toString(),
    helmet?.script?.toString(),
  ]
    .filter(Boolean)
    .join("");

  return { appHtml, headTags };
}
