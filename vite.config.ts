import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
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
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          const normalizedId = id.replace(/\\/g, "/");

          // React Core & Router Vendor Chunk
          if (
            normalizedId.includes("/node_modules/react/") ||
            normalizedId.includes("/node_modules/react-dom/") ||
            normalizedId.includes("/node_modules/react-router/") ||
            normalizedId.includes("/node_modules/react-router-dom/") ||
            normalizedId.includes("/node_modules/scheduler/")
          ) {
            return "react-vendor";
          }

          // Radix UI and UI Primitives
          if (
            normalizedId.includes("/node_modules/@radix-ui/") ||
            normalizedId.includes("/node_modules/cmdk/") ||
            normalizedId.includes("/node_modules/vaul/")
          ) {
            return "radix-vendor";
          }

          // Icons and Barcode/QR Code Modules
          if (
            normalizedId.includes("/node_modules/lucide-react/") ||
            normalizedId.includes("/node_modules/qrcode.react/") ||
            normalizedId.includes("/node_modules/react-barcode/") ||
            normalizedId.includes("/node_modules/html5-qrcode/")
          ) {
            return "icons";
          }

          // Charts & Analytics Engine
          if (
            normalizedId.includes("/node_modules/recharts/") ||
            normalizedId.includes("/node_modules/d3-") ||
            normalizedId.includes("/node_modules/victory")
          ) {
            return "charts";
          }

          // Supabase SDK
          if (normalizedId.includes("/node_modules/@supabase/")) {
            return "supabase";
          }

          // Common Utilities, Forms & Validation, Query Cache
          if (
            normalizedId.includes("/node_modules/date-fns/") ||
            normalizedId.includes("/node_modules/clsx/") ||
            normalizedId.includes("/node_modules/tailwind-merge/") ||
            normalizedId.includes("/node_modules/class-variance-authority/") ||
            normalizedId.includes("/node_modules/zod/") ||
            normalizedId.includes("/node_modules/@tanstack/react-query/") ||
            normalizedId.includes("/node_modules/react-hook-form/") ||
            normalizedId.includes("/node_modules/@hookform/")
          ) {
            return "utils";
          }
        },
      },
    },
  },
}));
