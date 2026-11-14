import { defineConfig } from "vite";
import { env } from "node:process";
import { resolve } from "node:path";

export default defineConfig({
  root: "web",
  base: "/",
  plugins: [{
    name: "admin-console-dev-route",
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        if (request.url) {
          const queryIndex = request.url.indexOf("?");
          const pathname = queryIndex < 0 ? request.url : request.url.slice(0, queryIndex);
          if (pathname === "/admin" || pathname === "/admin/") {
            request.url = `/admin/index.html${queryIndex < 0 ? "" : request.url.slice(queryIndex)}`;
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
      },
    },
  },
  server: {
    proxy: {
      "/api": env.RAG_PROXY_TARGET || `http://127.0.0.1:${env.RAG_PORT || "8000"}`,
    },
  },
});
