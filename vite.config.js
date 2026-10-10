import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative paths so the built app works from any folder,
  // including https://<user>.github.io/<repo-name>/ on GitHub Pages.
  base: './',
  test: {
    environment: 'node',
  },
});
