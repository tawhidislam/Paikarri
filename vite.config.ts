import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { deploymentConfig } from './server/deployment.mjs';
export default defineConfig(({ mode }) => {
  const { site } = deploymentConfig({ ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env });
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    envPrefix: 'VITE_',
    define: { 'import.meta.env.VITE_SITE_URL': JSON.stringify(site) },
    build: { chunkSizeWarningLimit: 700 },
  };
});
