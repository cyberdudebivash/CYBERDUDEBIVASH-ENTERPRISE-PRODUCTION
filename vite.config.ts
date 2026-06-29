import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: '_vite_entry.html',
        output: {
          entryFileNames: 'assets/index-[hash].js',
          chunkFileNames: 'assets/index-[hash].js',
          assetFileNames: (info) =>
            info.name?.endsWith('.css')
              ? 'assets/index-[hash][extname]'
              : 'assets/[name]-[hash][extname]',
        },
      },
    },
  };
});
