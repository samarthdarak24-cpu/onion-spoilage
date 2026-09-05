import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies /api to the OnionSure Express backend (port 4000).
// In production the backend serves this build from the same origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:4000',
      // WebSocket live-sync endpoint — proxied so the relative ws://host/ws
      // URL used by lib/realtime.ts resolves to the backend in dev too.
      '/ws': { target: 'ws://localhost:4000', ws: true },
    },
  },
  build: {
    // Per-route code-splitting (React.lazy in App.tsx) plus explicit vendor
    // chunking keeps any single chunk well under the warning threshold.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id: string): string | undefined {
          if (!id.includes('node_modules')) return undefined;
          if (id.match(/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|use-sync-external-store)[\\/]/)) return 'vendor-react';
          if (id.match(/[\\/]node_modules[\\/](recharts|d3-|victory|internmap|decimal\.js|lodash|tinycolor2|robust-predicates|delaunator)[\\/]/)) return 'vendor-charts';
          if (id.match(/[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils|popmotion|framesync|style-value-types|@emotion)[\\/]/)) return 'vendor-motion';
          if (id.match(/[\\/]node_modules[\\/](lucide-react)[\\/]/)) return 'vendor-icons';
          if (id.match(/[\\/]node_modules[\\/](qrcode|qrcode\.react)[\\/]/)) return 'vendor-qr';
          return 'vendor';
        },
      },
    },
  },
});
