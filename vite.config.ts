import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// import electron from "vite-plugin-electron";
// import renderer from "vite-plugin-electron-renderer";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist-react",
  },
  server: {
    port: 5123,
    strictPort: true,
  },
});
