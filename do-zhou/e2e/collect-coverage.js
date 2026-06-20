/**
 * E2E + Unit 覆盖率统一收集器 — c8 merge
 *
 * 第一梯队做法:
 *   vitest --coverage → coverage/tmp/unit/  (v8 格式)
 *   Playwright E2E    → coverage/tmp/e2e/   (NODE_V8_COVERAGE)
 *   npx c8 merge      → 统一合并 → coverage-final.json
 *
 * 用法:
 *   node collect-coverage.js              # 完整流程: E2E + 合并
 *   node collect-coverage.js --merge-only  # 仅合并已有数据
 *   node collect-coverage.js --check       # 检查覆盖率
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TMP_DIR = path.join(PROJECT_ROOT, 'coverage', 'tmp');
const V8_E2E_DIR = path.join(TMP_DIR, 'e2e');
const V8_UNIT_DIR = path.join(TMP_DIR, 'unit');
const MERGED_DIR = path.join(PROJECT_ROOT, 'coverage');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // 清空旧数据
  fs.readdirSync(dir).forEach(f => {
    const fp = path.join(dir, f);
    if (f.endsWith('.json')) fs.unlinkSync(fp);
    else if (fs.statSync(fp).isDirectory()) fs.rmSync(fp, { recursive: true, force: true });
  });
}

function runUnitTests() {
  ensureDir(V8_UNIT_DIR);
  console.log('🧪 运行 vitest + V8 覆盖率...');
  try {
    execSync(`npx vitest run --coverage --coverage.reportsDirectory=${V8_UNIT_DIR}`, {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      timeout: 120000,
    });
  } catch (e) {}
  const files = fs.readdirSync(V8_UNIT_DIR).filter(f => f.endsWith('.json'));
  console.log(`✅ 单元测试: ${files.length} 个 V8 文件`);
  return files.length;
}

function runE2ETests() {
  ensureDir(V8_E2E_DIR);
  console.log('🎯 运行 E2E + V8 覆盖率...');
  try {
    execSync(`npx playwright test --grep-invert "regression" --reporter=line`, {
      cwd: __dirname,
      stdio: 'inherit',
      timeout: 300000,
      env: { ...process.env, NODE_V8_COVERAGE: V8_E2E_DIR },
    });
  } catch (e) {}
  const files = fs.readdirSync(V8_E2E_DIR).filter(f => f.endsWith('.json'));
  console.log(`✅ E2E 测试: ${files.length} 个 V8 文件`);
  return files.length;
}

function mergeWithC8() {
  ensureDir(MERGED_DIR);
  // 清理旧合并文件
  const oldFinal = path.join(MERGED_DIR, 'coverage-final.json');
  if (fs.existsSync(oldFinal)) fs.unlinkSync(oldFinal);

  const unitFiles = fs.readdirSync(V8_UNIT_DIR).filter(f => f.endsWith('.json'));
  const e2eFiles = fs.readdirSync(V8_E2E_DIR).filter(f => f.endsWith('.json'));

  if (unitFiles.length === 0 && e2eFiles.length === 0) {
    console.log('⚠ 无覆盖率数据。先跑: node collect-coverage.js');
    return 0;
  }

  // c8 merge: 将两个 V8 目录合并到 MERGED_DIR
  const dirsToMerge = [];
  if (unitFiles.length > 0) dirsToMerge.push(V8_UNIT_DIR);
  if (e2eFiles.length > 0) dirsToMerge.push(V8_E2E_DIR);

  console.log(`\n🔀 c8 合并 ${dirsToMerge.length} 个 V8 目录...`);
  try {
    // c8 报告生成: 从多个 V8 目录读取 → 生成 lcov + text
    for (const dir of dirsToMerge) {
      execSync(`npx c8 report --reporter=text --reporter=json --reportsDirectory=${dir} --src=${path.join(PROJECT_ROOT, 'src')} --output=${MERGED_DIR}`, {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
        timeout: 60000,
      });
    }
  } catch (e) {
    console.log('⚠ c8 merge 部分失败:', e.message?.substring(0, 100));
  }

  // 读取合并后的覆盖率
  let total = 0, covered = 0, fileCount = 0;
  for (const dir of dirsToMerge) {
    try {
      const covFinal = path.join(dir, 'coverage-final.json');
      if (!fs.existsSync(covFinal)) continue;
      const data = JSON.parse(fs.readFileSync(covFinal, 'utf-8'));
      for (const [file, entry] of Object.entries(data)) {
        fileCount++;
        if (entry.s) {
          for (const k of Object.keys(entry.s)) {
            total++;
            if (entry.s[k] > 0) covered++;
          }
        }
      }
    } catch (e) {}
  }

  // 手动合并所有 V8 JSON（补充 c8 的合并）
  let mergedAll = {};
  for (const dir of dirsToMerge) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'coverage-final.json');
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
        if (data.result) {
          for (const entry of data.result) {
            if (!entry.url) continue;
            const srcIdx = entry.url.indexOf('/do-zhou/src/');
            if (srcIdx < 0) continue;
            let relPath = entry.url.substring(srcIdx + '/do-zhou/'.length);
            relPath = relPath.replace(/^\/+/, '');

            if (!mergedAll[relPath]) mergedAll[relPath] = { path: relPath, s: {} };
            if (entry.functions) {
              for (const fn of entry.functions) {
                for (const range of (fn.ranges || [])) {
                  const start = range.startOffset, end = range.endOffset;
                  const key = `${start}-${end}`;
                  if (!mergedAll[relPath].s[key]) mergedAll[relPath].s[key] = 0;
                  if (range.count > 0) mergedAll[relPath].s[key] = Math.max(mergedAll[relPath].s[key], range.count);
                }
              }
            }
          }
        }
      } catch (e) {}
    }
  }

  // 写合并文件
  const mergedPath = path.join(MERGED_DIR, 'coverage-final.json');
  fs.writeFileSync(mergedPath, JSON.stringify(mergedAll));

  // 统计
  total = 0; covered = 0;
  for (const entry of Object.values(mergedAll)) {
    if (!entry.s) continue;
    for (const k of Object.keys(entry.s)) {
      total++;
      if (entry.s[k] > 0) covered++;
    }
  }
  const pct = total > 0 ? Math.round(covered / total * 100) : 0;
  console.log(`\n📈 合并后覆盖率: ${pct}% (${covered}/${total} statements · ${Object.keys(mergedAll).length} 文件)`);
  return pct;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--merge-only')) {
    mergeWithC8();
  } else if (args.includes('--check')) {
    const pct = mergeWithC8();
    process.exit(pct >= 60 ? 0 : 1);
  } else {
    runUnitTests();
    runE2ETests();
    mergeWithC8();
  }
}

module.exports = { runUnitTests, runE2ETests, mergeWithC8 };

if (require.main === module) {
  main();
}
