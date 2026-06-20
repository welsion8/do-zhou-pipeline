import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'electron/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'out', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      reportsDirectory: '../coverage/tmp/unit',
      include: ['src/**/*.{ts,tsx}', 'electron/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
