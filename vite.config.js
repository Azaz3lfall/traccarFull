import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import fs from 'fs';
import path from 'path';

export default defineConfig(() => {

  // const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://cloud.absmultipla.com.br';
  // const WS_BASE_URL = process.env.VITE_WS_BASE_URL || 'wss://cloud.absmultipla.com.br';

  const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://rast.rastreadorautoram.com.br';
  const WS_BASE_URL = process.env.VITE_WS_BASE_URL || 'wss://rast.rastreadorautoram.com.br';
  /** Let session cookies apply to the dev host (IP/domain) instead of the upstream Traccar domain. */
  const traccarProxySessionCookies = {
    changeOrigin: true,
    secure: true,
    cookieDomainRewrite: '',
  };
  const traccarWsHttpTarget = WS_BASE_URL.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');

  return {
    
    server: {
      allowedHosts: ['cloud.absmultipla.com.br', '75768c9e2b08.ngrok-free.app', '104.251.211.91', 'localhost'],
      port: 3000,
      https: process.env.VITE_DEV_HTTPS !== 'false'
        ? {
            key: fs.readFileSync(path.resolve(__dirname, 'src/resources/certs/dev-key.pem')),
            cert: fs.readFileSync(path.resolve(__dirname, 'src/resources/certs/dev-cert.pem')),
          }
        : false,
      proxy: {
        '/api/socket': {
          target: traccarWsHttpTarget,
          ws: true,
          ...traccarProxySessionCookies,
        },
        '/api/domain-lookup': 'http://localhost:3333',
        '/api/resellers': 'http://localhost:3333',
        '/api/upload': 'http://localhost:3333',
        '/api/reseller-logo': 'http://localhost:3333',
        '/api/reseller-check': 'http://localhost:3333',
        '/api/check-domain': 'http://localhost:3333',
        '/api/fleet': 'http://localhost:4000', // Core Fleet Service
        '/api/clients': 'http://localhost:4000', // Core Fleet Service
        '/api/vehicles': 'http://localhost:4000', // Core Fleet Service
        '/os-api': 'http://localhost:3666',
        '/traccar-api': 'http://localhost:3666',
        '/os-uploads': 'http://localhost:3666',
        '/gestao': 'http://localhost:3666',
        '/nominatim-proxy': {
          target: 'http://50.30.32.171:8080',
          changeOrigin: true,
          rewrite: (path) => {
            // Remove /nominatim-proxy prefix and ensure .php extension
            const newPath = path.replace(/^\/nominatim-proxy/, '');
            // If path doesn't end with .php and is reverse, add .php
            if (newPath.startsWith('/reverse') && !newPath.endsWith('.php')) {
              return newPath + '.php';
            }
            return newPath;
          },
        },
        '/api': {
          target: API_BASE_URL,
          ...traccarProxySessionCookies,
        },
      },
    },
    build: {
      outDir: 'build',
      assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg'],
      sourcemap: false,
      minify: 'esbuild',
    },
    plugins: [
      svgr(),
      react(),
      VitePWA({
        // Only list files that exist under public/ — missing entries break Workbox precaching (404).
        includeAssets: ['logo.svg'],
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
          { src: 'src/addons/reseller', dest: 'addons' },
          { src: 'src/addons/jtt-server', dest: 'addons' },
        ],
      }),
    ],
  };
});
