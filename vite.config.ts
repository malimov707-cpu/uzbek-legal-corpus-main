import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { env } from "node:process";
import { resolve } from "node:path";
import { createCorpusFallbackMiddleware } from "./scripts/dev-corpus-fallback.mjs";

export default defineConfig({
  root: "web",
  base: "/",
  plugins: [react(), {
    name: "dev-route-and-corpus-fallback",
    configureServer(server) {
      if (env.RAG_API_AVAILABLE !== "1") {
        server.middlewares.use(createCorpusFallbackMiddleware(resolve(import.meta.dirname, ".")));
      }
      server.middlewares.use((request, _response, next) => {
        if (request.url) {
          const queryIndex = request.url.indexOf("?");
          const pathname = queryIndex < 0 ? request.url : request.url.slice(0, queryIndex);
          if (pathname === "/admin" || pathname === "/admin/") {
            request.url = `/admin/index.html${queryIndex < 0 ? "" : request.url.slice(queryIndex)}`;
          } else if (pathname === "/conference" || pathname === "/conference/") {
            request.url = `/conference.html${queryIndex < 0 ? "" : request.url.slice(queryIndex)}`;
          }
        }
        next();
      });
    },
  }],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        citizenChat: resolve(import.meta.dirname, "web/index.html"),
        adminConsole: resolve(import.meta.dirname, "web/admin/index.html"),
        conferenceSpeaker: resolve(import.meta.dirname, "web/conference.html"),
      },
    },
  },
  server: {
    proxy: {
      "/api": env.RAG_PROXY_TARGET || `http://127.0.0.1:${env.RAG_PORT || "8000"}`,
    },
  },
});
