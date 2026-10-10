import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Writes dist/sw.js with the list of built files, so the app works offline.
function serviceWorker() {
  return {
    name: 'lift-log-service-worker',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const built = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      const extra = ['index.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
      const assets = [...new Set(['./', ...[...built, ...extra].map((f) => `./${f}`)])];
      const version = createHash('sha256').update(built.sort().join('|')).digest('hex').slice(0, 10);
      const source = readFileSync(new URL('./src/service-worker.js', import.meta.url), 'utf8')
        .replace('__VERSION__', version)
        .replace('__ASSETS__', JSON.stringify(assets, null, 2));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  plugins: [react(), serviceWorker()],
  // Relative paths so the built app works from any folder,
  // including https://<user>.github.io/<repo-name>/ on GitHub Pages.
  base: './',
  test: {
    environment: 'node',
  },
});
