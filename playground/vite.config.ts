import { sentryVitePlugin } from '@sentry/vite-plugin';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

// https://vitejs.dev/config/
export default defineConfig({
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
});
