import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // '/' for local/custom-domain hosting, '/remember/' for a repository Pages site.
  const configuredPath = (env.VITE_BASE_PATH || '/').trim().replace(/^\/+|\/+$/g, '');
  const base = configuredPath ? `/${configuredPath}/` : '/';

  return {
    base,
    server: { host: true },
    preview: { host: true },
    build: {
      rollupOptions: {
        output: { manualChunks: { phaser: ['phaser'] } },
      },
    },
    plugins: [
      VitePWA({
        registerType: 'prompt',
        injectRegister: null,
        includeAssets: ['icons/*.png'],
        manifest: {
          id: base,
          name: 'remember — My Intern Life',
          short_name: 'remember',
          description: 'A small journey through my U.S. intern life. New York, 2026.',
          lang: 'en',
          start_url: base,
          scope: base,
          display: 'standalone',
          background_color: '#084c94',
          theme_color: '#084c94',
          categories: ['games', 'entertainment'],
          icons: [
            { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{html,js,css,png,jpg,jpeg,svg,webp,ico,woff2,webmanifest,ogg,mp3,wav}'],
          // The outside world is one detailed image; Workbox's 2 MiB default is too small.
          maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          navigateFallback: `${base}index.html`,
          // A new deployment waits for the player's explicit reload choice.
          skipWaiting: false,
          clientsClaim: false,
        },
        devOptions: { enabled: false },
      }),
    ],
  };
});
