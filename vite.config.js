import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import fs from 'fs';
import path from 'path';

export default defineConfig(() => {

  const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://cloud.absmultipla.com.br';
  const WS_BASE_URL = process.env.VITE_WS_BASE_URL || 'wss://cloud.absmultipla.com.br';

  // const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://gps.codeartisan.cloud';
  // const WS_BASE_URL = process.env.VITE_WS_BASE_URL || 'wss://gps.codeartisan.cloud';

  return {
    server: {
      allowedHosts: ['cloud.absmultipla.com.br', "75768c9e2b08.ngrok-free.app"],
      port: 3000,
      https: {
        key: fs.readFileSync(path.resolve(__dirname, 'src/resources/certs/dev-key.pem')),
        cert: fs.readFileSync(path.resolve(__dirname, 'src/resources/certs/dev-cert.pem')),
      },
      proxy: {
        '/api/socket': WS_BASE_URL,
        '/api': API_BASE_URL,
      },
    },
    build: {
      outDir: 'build',
      assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg'],
    },
    plugins: [
      svgr(),
      react(),
      VitePWA({
        includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
        workbox: {
          navigateFallbackDenylist: [/^\/api/],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,woff,woff2,mp3}'],
        },
        manifest: {
          short_name: '${title}',
          name: '${description}',
          theme_color: '${colorPrimary}',
          icons: [
            {
              src: 'pwa-64x64.png',
              sizes: '64x64',
              type: 'image/png',
            },
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
      }),
      viteStaticCopy({
        targets: [
          { src: 'node_modules/@mapbox/mapbox-gl-rtl-text/dist/mapbox-gl-rtl-text.js', dest: '' },
        ],
      }),
    ],
  };
});
