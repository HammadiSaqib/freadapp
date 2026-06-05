import React, { createContext, useContext } from "react";

export type BlogSsrData = {
  post?: any;
  url?: string;
  notFound?: boolean;
} | null;

const BlogSsrContext = createContext<BlogSsrData>(null);

export const BlogSsrProvider = BlogSsrContext.Provider;

export const useBlogSsrData = () => useContext(BlogSsrContext);
