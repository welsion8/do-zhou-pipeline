/**
 * Playwright CT 覆盖率收集——CDP (Chrome DevTools Protocol)
 *
 * 每个 CT 测试在 Chromium 中运行时，通过 CDP 收集 V8 覆盖率。
 * 输出到 coverage/tmp/ct/ → 与 vitest v8 同格式 → c8 可直接合并。
 */
import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const CT_COV_DIR = path.resolve(__dirname, '..', 'coverage', 'tmp', 'ct');

async function globalSetup(_config: FullConfig) {
  // 确保目录存在并清空旧数据
  if (!fs.existsSync(CT_COV_DIR)) fs.mkdirSync(CT_COV_DIR, { recursive: true });
  fs.readdirSync(CT_COV_DIR).filter(f => f.endsWith('.json')).forEach(f => {
    try { fs.unlinkSync(path.join(CT_COV_DIR, f)) } catch (_) {}
  });

  console.log('📊 CT 覆盖率收集就绪: ' + CT_COV_DIR);
}

export default globalSetup;
