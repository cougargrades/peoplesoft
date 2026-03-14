import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      ...configDefaults.exclude,
      '**/dist/**', // Add this line to exclude the dist directory
    ],
  },
});
