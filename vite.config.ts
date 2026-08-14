import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ["guts.n6t.online"],
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      external: ["@mediapipe/face_mesh"],
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-tf": [
            "@tensorflow/tfjs",
            "@tensorflow/tfjs-backend-webgl",
            "@tensorflow-models/face-detection",
            "@tensorflow-models/coco-ssd",
            "@mediapipe/face_detection",
          ],
          "vendor-leaflet": ["leaflet", "react-leaflet"],
          "vendor-d3": ["d3-selection", "d3-zoom"],
          "vendor-maps": ["react-simple-maps", "topojson-client"],
          "vendor-recharts": ["recharts"],
          "vendor-pdf": ["html2pdf.js"],
          "vendor-icons": [
            "lucide-react",
            "@fortawesome/fontawesome-svg-core",
            "@fortawesome/free-solid-svg-icons",
            "@fortawesome/react-fontawesome",
          ],
        },
      },
    },
  },
});
