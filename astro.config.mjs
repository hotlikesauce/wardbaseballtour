// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://wardballparktour.com',
  image: {
    // Photos are 3–33 MB phone originals; every <Image> declares its own widths.
    responsiveStyles: false,
  },
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      // maplibre-gl is ~1 MB minified on its own; it loads lazily, after first paint.
      chunkSizeWarningLimit: 1400,
    },
  },
});
