import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // 代理媒体文件请求到 Django 后端，使本地开发时头像和图片能正常显示
      '/media': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return undefined;
          if (id.includes('/node_modules/echarts/')) return 'vendor-echarts';
          if (id.includes('/node_modules/@mui/') || id.includes('/node_modules/@emotion/')) return 'vendor-mui';
          if (id.includes('/node_modules/@radix-ui/')) return 'vendor-radix';
          if (id.includes('/node_modules/@iconify/') || id.includes('/node_modules/@mdi/')) return 'vendor-icons';
          if (id.includes('/node_modules/lucide-react/')) return 'vendor-lucide';
          if (id.includes('/node_modules/@hookform/') || id.includes('/node_modules/react-hook-form/') || id.includes('/node_modules/zod/')) {
            return 'vendor-forms';
          }
          if (id.includes('/node_modules/axios/') || id.includes('/node_modules/follow-redirects/') || id.includes('/node_modules/form-data/')) {
            return 'vendor-http';
          }
          if (id.includes('/node_modules/date-fns/')) return 'vendor-date';
          if (
            id.includes('/node_modules/react-markdown/') ||
            id.includes('/node_modules/unified/') ||
            id.includes('/node_modules/remark-') ||
            id.includes('/node_modules/rehype-') ||
            id.includes('/node_modules/micromark') ||
            id.includes('/node_modules/mdast-') ||
            id.includes('/node_modules/hast-') ||
            id.includes('/node_modules/unist-') ||
            id.includes('/node_modules/vfile') ||
            id.includes('/node_modules/bail/') ||
            id.includes('/node_modules/devlop/') ||
            id.includes('/node_modules/trough/')
          ) {
            return 'vendor-markdown';
          }
          if (id.includes('/node_modules/@floating-ui/') || id.includes('/node_modules/@popperjs/') || id.includes('/node_modules/react-popper/')) {
            return 'vendor-floating';
          }
          if (
            id.includes('/node_modules/cmdk/') ||
            id.includes('/node_modules/vaul/') ||
            id.includes('/node_modules/react-day-picker/') ||
            id.includes('/node_modules/input-otp/') ||
            id.includes('/node_modules/embla-carousel') ||
            id.includes('/node_modules/react-dnd') ||
            id.includes('/node_modules/@react-dnd/') ||
            id.includes('/node_modules/dnd-core/') ||
            id.includes('/node_modules/react-slick/') ||
            id.includes('/node_modules/react-resizable-panels/') ||
            id.includes('/node_modules/react-responsive-masonry/')
          ) {
            return 'vendor-widgets';
          }
          if (id.includes('/node_modules/motion/') || id.includes('/node_modules/framer-motion/') || id.includes('/node_modules/motion-')) {
            return 'vendor-motion';
          }
          if (id.includes('/node_modules/sonner/')) return 'vendor-sonner';
          if (id.includes('/node_modules/next-themes/')) return 'vendor-theme';
          if (id.includes('/node_modules/class-variance-authority/') || id.includes('/node_modules/clsx/') || id.includes('/node_modules/tailwind-merge/')) {
            return 'vendor-classnames';
          }
          if (id.includes('/node_modules/d3-') || id.includes('/node_modules/victory-vendor/') || id.includes('/node_modules/react-smooth/') || id.includes('/node_modules/recharts-scale/')) {
            return 'vendor-dataviz';
          }
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/scheduler/')) {
            return 'vendor-react';
          }
          if (id.includes('/node_modules/react-router/') || id.includes('/node_modules/react-router-dom/') || id.includes('/node_modules/@remix-run/router/')) {
            return 'vendor-router';
          }
          if (id.includes('/node_modules/i18next/') || id.includes('/node_modules/react-i18next/') || id.includes('/node_modules/i18next-browser-languagedetector/')) {
            return 'vendor-i18n';
          }
          if (id.includes('/node_modules/recharts/')) return 'vendor-recharts';
          return 'vendor';
        },
      },
    },
  },
})
