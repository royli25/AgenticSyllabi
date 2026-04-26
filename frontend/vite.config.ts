import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    port: 5173,
    // Fail loudly if 5173 is already taken (another `vite` / IDE task) instead of
    // silently using 5174 — avoids “wrong port” and mystery hangs.
    strictPort: true,
    // Prefer IPv4; on some systems `localhost` → ::1 while the dev server is IPv4-only.
    host: "127.0.0.1",
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
