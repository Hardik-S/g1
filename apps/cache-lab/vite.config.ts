import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true
  },
  server: {
    port: 4173
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/unit/**/*.spec.ts',
      'tests/property/**/*.spec.ts',
    ],
    coverage: {
      enabled: false,
      include: ['src/lib/**/*'],
      exclude: ['src/**/*.tsx', 'src/state/**/*'],
      reporter: ['text', 'lcov'],
      lines: 0.9,
      branches: 0.9
    }
  }
});
