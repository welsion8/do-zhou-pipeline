/**
 * E2E + Unit 覆盖率合并器
 *
 * 第一梯队做法: V8 格式统一合并
 *   vitest --coverage → coverage/ (v8 格式)
 *   Playwright E2E    → coverage/tmp/e2e/ (NODE_V8_COVERAGE)
 *   手动合并 → coverage/coverage-final.json
 *
 * 用法:
 *   node collect-coverage.js              # 跑 E2E + 合并
 *   node collect-coverage.js --merge-only  # 合并已有数据（不跑测试）
 *   node collect-coverage.js --check       # 检查是否 ≥ 60%
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const E2E_V8_DIR = path.join(PROJECT_ROOT, 'coverage', 'tmp', 'e2e');
const UNIT_COV = path.join(PROJECT_ROOT, 'coverage', 'coverage-final.json');
const MERGED_OUT = path.join(PROJECT_ROOT, 'coverage', 'coverage-final.json');

function runE2E() {
  if (!fs.existsSync(E2E_V8_DIR)) fs.mkdirSync(E2E_V8_DIR, { recursive: true });
  // 清空旧 E2E 数据
  fs.readdirSync(E2E_V8_DIR).filter(f => f.endsWith('.json')).forEach(f => fs.unlinkSync(path.join(E2E_V8_DIR, f)));

  console.log('🎯 运行 E2E 测试...');
  try {
    execSync(`npx playwright test --grep-invert "regression" --reporter=line`, {
      cwd: __dirname,
      stdio: 'inherit',
      timeout: 300000,
      env: { ...process.env, NODE_V8_COVERAGE: E2E_V8_DIR },
    });
  } catch (e) {}
  const count = fs.readdirSync(E2E_V8_DIR).filter(f => f.endsWith('.json')).length;
  console.log(`✅ E2E: ${count} 个 V8 文件`);
  return count;
}

function mergeAll() {
  // ── 加载单元测试覆盖率 ──
  let merged = {};
  if (fs.existsSync(UNIT_COV)) {
    try {
      merged = JSON.parse(fs.readFileSync(UNIT_COV, 'utf-8'));
      console.log(`📊 单元测试: ${Object.keys(merged).length} 文件`);
    } catch (e) { console.log('⚠ 单元覆盖率读取失败'); }
  }

  // ── 合并 E2E V8 数据 ──
  const e2eFiles = fs.existsSync(E2E_V8_DIR) ? fs.readdirSync(E2E_V8_DIR).filter(f => f.endsWith('.json')) : [];
  let e2eFunctions = 0;

  for (const v8f of e2eFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(E2E_V8_DIR, v8f), 'utf-8'));
      if (!data.result) continue;
      for (const entry of data.result) {
        if (!entry.url) continue;
        const url = entry.url.replace(/^file:\/\//, '').replace(/\\/g, '/');
        const srcIdx = url.indexOf('/do-zhou/src/');
        if (srcIdx < 0) continue;
        const relPath = url.substring(srcIdx + 1); // "do-zhou/src/..."

        if (!merged[relPath]) merged[relPath] = { path: relPath, s: {} };
        if (entry.functions) {
          for (const fn of entry.functions) {
            for (const range of (fn.ranges || [])) {
              // 每个被调用的字节范围作为一个 statement
              const key = `${range.startOffset}-${range.endOffset}`;
              if (!merged[relPath].s[key]) merged[relPath].s[key] = 0;
              if (range.count > 0) {
                merged[relPath].s[key] = Math.max(merged[relPath].s[key], range.count);
                e2eFunctions++;
              }
            }
          }
        }
      }
    } catch (e) {}
  }

  fs.writeFileSync(MERGED_OUT, JSON.stringify(merged));
  console.log(`✅ E2E 合并: ${e2eFunctions} 个 V8 函数`);

  // ── 统计 ──
  let total = 0, covered = 0;
  for (const entry of Object.values(merged)) {
    if (!entry.s) continue;
    for (const k of Object.keys(entry.s)) {
      total++;
      if (entry.s[k] > 0) covered++;
    }
  }
  const pct = total > 0 ? Math.round(covered / total * 100) : 0;
  console.log(`\n📈 合并后覆盖率: ${pct}% (${covered}/${total} · ${Object.keys(merged).length} 文件)`);
  return pct;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--merge-only')) {
    mergeAll();
  } else if (args.includes('--check')) {
    const pct = mergeAll();
    process.exit(pct >= 60 ? 0 : 1);
  } else {
    runE2E();
    mergeAll();
  }
}

module.exports = { runE2E, mergeAll };

if (require.main === module) {
  main();
}
