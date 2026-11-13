import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "web",
  build: { outDir: "../dist", emptyOutDir: true },
  server: {
    host: process.env.WEB_HOST ?? "127.0.0.1",
    proxy: { "/api": process.env.API_PROXY_TARGET ?? "http://127.0.0.1:3000" }
  }
});
