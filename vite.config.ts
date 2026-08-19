import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const defineEnvs: Record<string, string> = {
    'process.env.VITE_API_KEY': JSON.stringify(env.VITE_API_KEY),
    'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY),
  };

  for (let i = 1; i <= 10; i++) {
    defineEnvs[`process.env.VITE_API_KEY_${i}`] = JSON.stringify(env[`VITE_API_KEY_${i}`]);
  }

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: ['docente-ai-pro.onrender.com'],
    },
    plugins: [react(), tailwindcss()],
    define: defineEnvs,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
