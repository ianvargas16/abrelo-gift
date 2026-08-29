import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isRuntimeBuild = mode === 'runtime';

  return {
    plugins: [react()],
    publicDir: 'src-tauri/icons',
    clearScreen: false,
    server: {
      host: "0.0.0.0",
      port: isRuntimeBuild ? 1421 : 1420,
      strictPort: true,
      proxy: {
        "/api": {
          target: "http://localhost:8787",
          changeOrigin: true,
        },
      },
    },
    build: isRuntimeBuild
      ? {
          outDir: 'dist-runtime',
          rollupOptions: {
            input: 'runtime.html',
          },
        }
      : {
          outDir: 'dist',
        },
  };
});
