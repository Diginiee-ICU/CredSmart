import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "./",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api/tally-gst": {
        target: "https://tallysolutions.com",
        changeOrigin: true,
        rewrite: () => "/wp-content/themes/tally/api/gstin-serach-api.php",
        headers: {
          Referer: "https://tallysolutions.com/business-tools-templates/gstin-verification-search/",
          Origin: "https://tallysolutions.com",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "esnext",
    chunkSizeWarningLimit: 2000,
  },
}));
