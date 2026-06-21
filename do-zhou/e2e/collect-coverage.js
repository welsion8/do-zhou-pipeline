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

/**
 * Vite bundle 名 → 源文件路径 映射
 * e.g. "chat-message-ai-C1owyl7k.js" → "src/renderer/components/chat/chat-message-ai.tsx"
 */
function viteBundleToSource(bundleName) {
  // 去掉 hash 后缀
  const clean = bundleName.replace(/-[A-Za-z0-9]{6,10}\.js$/, '.tsx');
  // 在 src/ 中搜索匹配的源文件
  const srcDir = path.join(PROJECT_ROOT, 'src');
  if (!fs.existsSync(srcDir)) return null;

  // 搜索匹配文件
  function search(dir, name) {
    try {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name.startsWith('.') || e.name === 'node_modules') continue;
        const fp = path.join(dir, e.name);
        if (e.isDirectory()) {
          const r = search(fp, name);
          if (r) return r;
        } else if (e.name === name || e.name === name.replace('.tsx', '.ts')) {
          return path.relative(path.join(PROJECT_ROOT, 'do-zhou'), fp).replace(/\\/g, '/');
        }
      }
    } catch (_) {}
    return null;
  }

  // 先精确搜
  const exact = search(srcDir, clean);
  if (exact) return exact;

  // 再模糊搜（只搜组件名，不带目录前缀）
  const baseName = clean.split('-')[0];
  if (baseName.length > 3) {
    return search(srcDir, baseName + '.tsx') || search(srcDir, baseName + '.ts');
  }
  return null;
}

function mergeCTCoverage() {
  const ctDir = path.join(PROJECT_ROOT, 'coverage', 'tmp', 'ct');
  const ctFiles = fs.existsSync(ctDir) ? fs.readdirSync(ctDir).filter(f => f.endsWith('.json')) : [];
  if (ctFiles.length === 0) {
    console.log('⚠ 无 CT 覆盖率数据。');
    return 0;
  }

  // 加载 vitest v8 数据
  let merged = {};
  const vitestCov = path.join(PROJECT_ROOT, 'coverage', 'tmp', 'unit', 'coverage-final.json');
  if (fs.existsSync(vitestCov)) {
    try { merged = JSON.parse(fs.readFileSync(vitestCov, 'utf-8')); } catch (_) {}
  }

  let ctFuncs = 0, mappedFiles = 0;
  const unmapped = new Set();

  for (const f of ctFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(ctDir, f), 'utf-8'));
      if (!data.result) continue;
      for (const entry of data.result) {
        if (!entry.url || entry.url.includes('node_modules') || !entry.functions) continue;

        // 从 Vite bundle URL 提取组件名
        const url = entry.url.replace(/^http:\/\/[^/]+\//, '').replace(/^file:\/\//, '');
        const bundleName = url.split('/').pop() || '';
        const sourcePath = viteBundleToSource(bundleName);

        if (!sourcePath) {
          unmapped.add(bundleName.substring(0, 30));
          continue;
        }

        if (!merged[sourcePath]) merged[sourcePath] = { path: sourcePath, s: {} };
        for (const fn of entry.functions) {
          for (const range of (fn.ranges || [])) {
            const key = `${range.startOffset}-${range.endOffset}`;
            if (!merged[sourcePath].s[key]) merged[sourcePath].s[key] = 0;
            if (range.count > 0) {
              merged[sourcePath].s[key] = Math.max(merged[sourcePath].s[key], range.count);
              ctFuncs++;
            }
          }
        }
        mappedFiles++;
      }
    } catch (e) {}
  }

  fs.writeFileSync(MERGED_OUT, JSON.stringify(merged));
  console.log(`✅ CT 合并: ${ctFuncs} 函数 → ${mappedFiles} bundle (${ctFiles.length} 文件)`);
  if (unmapped.size > 0) console.log(`   未映射: ${unmapped.size} 个 bundle (${[...unmapped].slice(0,5).join(', ')}...)`);

  let total = 0, covered = 0;
  for (const entry of Object.values(merged)) {
    if (!entry.s) continue;
    for (const k of Object.keys(entry.s)) { total++; if (entry.s[k] > 0) covered++; }
  }
  const pct = total > 0 ? Math.round(covered / total * 100) : 0;
  console.log(`📈 Vitest + CT 统一覆盖率: ${pct}% (${covered}/${total} statements · ${Object.keys(merged).length} 文件)`);
  return pct;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--merge-only')) {
    mergeAll();
    mergeCTCoverage();
  } else if (args.includes('--merge-ct')) {
    const pct = mergeCTCoverage();
    console.log(`\n📈 Vitest + CT 合并覆盖率: ${pct}%`);
  } else if (args.includes('--check')) {
    const pct = mergeAll();
    if (pct < 60) process.exit(1);
  } else {
    runE2E();
    mergeAll();
    mergeCTCoverage();
  }
}

module.exports = { runE2E, mergeAll, mergeCTCoverage };

if (require.main === module) {
  main();
}
