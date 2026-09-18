import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const usePublicHmr = process.env.VITE_PUBLIC_HMR === "true";

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [".trycloudflare.com", ".loca.lt", "guts.n6t.online"],
    hmr: usePublicHmr
      ? {
          clientPort: 443,
          protocol: "wss",
        }
      : undefined,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    host: true,
    allowedHosts: [".trycloudflare.com", ".loca.lt", "guts.n6t.online"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-icons": [
            "@fortawesome/fontawesome-svg-core",
            "@fortawesome/free-solid-svg-icons",
            "@fortawesome/react-fontawesome",
          ],
        },
      },
    },
  },
});
