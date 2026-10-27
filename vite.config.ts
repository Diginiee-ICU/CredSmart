import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
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
    cssMinify: true,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("xlsx")) return "vendor-xlsx";
            if (id.includes("jspdf") || id.includes("html2canvas")) return "vendor-pdf";
            if (id.includes("recharts") || id.includes("d3-") || id.includes("victory")) return "vendor-charts";
            if (id.includes("html5-qrcode") || id.includes("react-barcode") || id.includes("qrcode.react")) return "vendor-scanner";
            if (id.includes("@dnd-kit")) return "vendor-dnd";
            if (id.includes("@neondatabase") || id.includes("@libsql")) return "vendor-db";
            if (id.includes("date-fns")) return "vendor-date";
            if (id.includes("lucide-react")) return "vendor-lucide";
            if (id.includes("@tanstack/react-query")) return "vendor-query";
            if (id.includes("@supabase/")) return "vendor-supabase";
            if (id.includes("@radix-ui")) return "vendor-ui";
            if (id.includes("react-router-dom") || id.includes("react-dom") || id.includes("react/") || id.includes("scheduler")) return "vendor-react";
          }
        },
      },
    },
  },
}));
