import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// host:true lets the dev server be reachable from outside the Docker container.
// usePolling makes file-watching reliable on macOS Docker bind mounts.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: { usePolling: true },
  },
});