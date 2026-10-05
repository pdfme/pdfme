import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Resolve from this file so `npm --prefix playground run build` still finds
// playground/.env when the command is launched from the repo root.
const playgroundDir = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Vite does not load .env into process.env before evaluating the config.
  // An empty prefix includes SENTRY_AUTH_TOKEN from .env and mode-specific files.
  const env = loadEnv(mode, playgroundDir, '');
  const sentryAuthToken = env.SENTRY_AUTH_TOKEN || process.env.SENTRY_AUTH_TOKEN;

  return {
    build: {
      target: 'esnext',
      // Source maps are only needed for the Sentry upload; emitting them without a
      // token would just publish them with the deployed bundle.
      sourcemap: Boolean(sentryAuthToken),
    },
    plugins: [
      react(),
      ...(sentryAuthToken
        ? [
            sentryVitePlugin({
              org: 'hand-dot',
              project: 'playground-pdfme',
              authToken: sentryAuthToken,
              sourcemaps: {
                filesToDeleteAfterUpload: ['dist/**/*.js.map'],
              },
            }),
          ]
        : []),
    ],
  };
});
