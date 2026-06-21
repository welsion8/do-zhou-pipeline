import { defineConfig } from '@playwright/experimental-ct-react';
import path from 'path';
import fs from 'fs';

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
  // CDP 覆盖率收集——CT 在 Chromium 中运行，可通过 CDP 收集 V8 覆盖率
  // 输出到 coverage/tmp/ct/ → 与 vitest 同格式 → 可自然合并
  globalSetup: path.resolve(__dirname, 'playwright', 'ct-coverage-setup.ts'),
});
