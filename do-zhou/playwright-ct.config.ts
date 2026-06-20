import { defineConfig, devices } from '@playwright/experimental-ct-react';
import path from 'path';

export default defineConfig({
  testDir: './src/renderer',
  testMatch: '**/*.ct.spec.{ts,tsx}',
  snapshotDir: './test-results/ct-snapshots',
  use: {
    ctPort: 3100,
    ctViteConfig: {
      resolve: {
        alias: { '@': path.resolve(__dirname, 'src') },
      },
    },
  },
  reporter: [['line'], ['json', { outputFile: 'test-results/ct-report.json' }]],
});
