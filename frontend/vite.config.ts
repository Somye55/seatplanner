import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), tailwindcss()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'import.meta.env.PROD': JSON.stringify(mode === 'production')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          'use-composed-ref': path.resolve(__dirname, 'node_modules/use-composed-ref/dist/use-composed-ref.cjs.mjs'),
        }
      },
      build: {
        commonjsOptions: {
          include: [/use-composed-ref/, /node_modules/]
        }
      }
    };
});
