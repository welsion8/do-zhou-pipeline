/**
 * CT Coverage Fixture — per-test CDP 覆盖率自动收集
 *
 * 每个 CT 测试自动启用 page.coverage.startJSCoverage()，
 * 测试结束后 stopJSCoverage() 并写入 coverage/tmp/ct/。
 * 输出 V8 格式 → 与 vitest v8 同格式 → c8 可直接合并。
 */
import { test as base, expect } from '@playwright/experimental-ct-react';
import fs from 'fs';
import path from 'path';

const CT_COV_DIR = path.resolve(__dirname, '..', 'coverage', 'tmp', 'ct');

// 确保目录存在
if (!fs.existsSync(CT_COV_DIR)) fs.mkdirSync(CT_COV_DIR, { recursive: true });

// 包装 test fixture——自动收集覆盖率
const test = base.extend({
  page: async ({ page }, use) => {
    // 每个测试前开始收集
    await page.coverage.startJSCoverage({ resetOnNavigation: false });

    await use(page);

    // 每个测试后停止并保存
    try {
      const coverage = await page.coverage.stopJSCoverage();
      const filename = `ct-cov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.json`;
      fs.writeFileSync(path.join(CT_COV_DIR, filename), JSON.stringify({ result: coverage }));
    } catch (_) {
      // coverage stop 可能因为页面已关闭而失败，忽略
    }
  },
});

export { test, expect };
