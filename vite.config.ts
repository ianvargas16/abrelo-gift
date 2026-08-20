import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isRuntimeBuild = mode === 'runtime';

  return {
    plugins: [react()],
    clearScreen: false,
    server: {
      port: isRuntimeBuild ? 1421 : 1420,
      strictPort: true,
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
