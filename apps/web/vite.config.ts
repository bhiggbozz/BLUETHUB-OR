import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import svgr from "vite-plugin-svgr";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    svgr(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // 8MB
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
    }),
  ] as PluginOption[],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@bluethub/ui-kit": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },

  optimizeDeps: {
    exclude: ["@bluethub/ui-kit"],
    include: ["chrono-node"],
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-redux": ["@reduxjs/toolkit", "react-redux"],
          "vendor-form":  ["react-hook-form", "@hookform/resolvers", "yup"],
          "vendor-ui":    ["lucide-react", "class-variance-authority", "clsx", "tailwind-merge"],
          "vendor-misc":  ["axios", "date-fns", "chrono-node"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});