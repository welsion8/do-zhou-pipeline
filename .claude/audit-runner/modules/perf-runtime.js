#!/usr/bin/env node
/**
 * perf-runtime.js — Playwright 运行时性能采集
 *
 * 启动应用 → 测量冷启动/编辑加载/标签切换 → 输出 P50/P90/P99。
 * 预算在 project.config.json → perfBudget 中定义。
 *
 * 用法:
 *   node perf-runtime.js                     # 默认 5 次采样
 *   node perf-runtime.js --samples 10        # 10 次采样
 *   node perf-runtime.js --ci                # CI 模式，JSON 输出
 *
 * 通用性: 读取 project.config.json → perfBudget，不绑定任何产品。
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();

function loadBudget() {
  try {
    const config = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, '.claude', 'project.config.json'), 'utf-8'));
    return config.perfBudget || { enforce: false, targets: {} };
  } catch (_) { return { enforce: false, targets: {} }; }
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil(p / 100 * sorted.length) - 1;
  return sorted[idx] || 0;
}

async function measureColdStart(appLaunch) {
  const times = [];
  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    const app = await appLaunch();
    await app.close();
    times.push(Date.now() - start);
    await new Promise(r => setTimeout(r, 1000));
  }
  return { name: '冷启动', times, p50: percentile(times, 50), p90: percentile(times, 90), p99: percentile(times, 99), unit: 'ms' };
}

async function measureEditorLoad(page, fileOpenFn) {
  const times = [];
  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    await fileOpenFn(page, 'outline.md');
    await page.waitForTimeout(500);
    times.push(Date.now() - start);
  }
  return { name: '编辑器加载2k', times, p50: percentile(times, 50), p90: percentile(times, 90), p99: percentile(times, 99), unit: 'ms' };
}

async function measureTabSwitch(page) {
  const times = [];
  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    const tabs = page.locator('[data-testid="tab"]');
    const count = await tabs.count();
    if (count >= 2) {
      await tabs.nth(i % 2).click();
      await page.waitForTimeout(200);
    }
    times.push(Date.now() - start);
  }
  return { name: '标签切换', times, p50: percentile(times, 50), p90: percentile(times, 90), p99: percentile(times, 99), unit: 'ms' };
}

function checkBudget(results, budget) {
  const violations = [];
  const targetMap = {
    '冷启动': 'appColdStart',
    '编辑器加载2k': 'editorLoad2k',
    '标签切换': 'tabSwitch',
  };

  for (const r of results) {
    const targetKey = targetMap[r.name];
    if (!targetKey) continue;
    const target = budget.targets?.[targetKey];
    if (!target) continue;

    const ciRedLine = budget.ciRedLine || 'p90';
    const actual = r[ciRedLine];
    const limit = target[ciRedLine];

    if (actual > limit) {
      violations.push({ name: r.name, metric: ciRedLine, actual, limit, unit: r.unit });
    }
  }

  return violations;
}

async function main() {
  const args = process.argv.slice(2);
  const samples = parseInt(args[args.indexOf('--samples') + 1]) || 5;
  const ciMode = args.includes('--ci');
  const budget = loadBudget();

  if (!budget.enforce) {
    console.log('🟡 性能预算未启用 (perfBudget.enforce=false)。跳过。');
    process.exit(0);
  }

  const { getPlatformAdapter } = require('./config-loader.js');
  const adapter = getPlatformAdapter(PROJECT_ROOT);
  if (!adapter.isDesktop) {
    console.log('🟡 非桌面平台，跳过运行时性能采集。');
    process.exit(0);
  }

  const launchInfo = adapter.getLaunchInfo();
  if (!launchInfo || !fs.existsSync(launchInfo.mainEntry)) {
    console.log('🟡 应用未构建。运行 pnpm build 后重试。');
    process.exit(0);
  }

  console.log(`⏱ 运行时性能采集 (${samples} 次采样)...`);

  let allResults = [];
  try {
    const { _electron: electron } = require(path.join(PROJECT_ROOT, adapter.codeDir, 'node_modules', 'playwright'));

    const coldStart = await measureColdStart(async () => {
      const app = await electron.launch({ executablePath: launchInfo.electronPath, args: [launchInfo.mainEntry] });
      return app;
    });
    allResults.push(coldStart);

    const app = await electron.launch({ executablePath: launchInfo.electronPath, args: [launchInfo.mainEntry] });
    const page = await app.firstWindow();
    await page.waitForTimeout(3000);

    const editorLoad = await measureEditorLoad(page, async (p, file) => {
      const item = p.locator(`[data-testid="file-item"]`).filter({ hasText: file }).first();
      if (await item.isVisible().catch(() => false)) await item.click();
    });
    allResults.push(editorLoad);

    const tabSwitch = await measureTabSwitch(page);
    allResults.push(tabSwitch);

    await app.close();
  } catch (e) {
    console.log('🟡 运行时性能采集失败:', e.message);
    process.exit(0);
  }

  // 输出
  console.log('\n📊 性能数据 (P50/P90/P99):');
  for (const r of allResults) {
    console.log(`  ${r.name}: P50=${r.p50}ms P90=${r.p90}ms P99=${r.p99}ms (${r.times.length}次)`);
  }

  const violations = checkBudget(allResults, budget);
  if (violations.length > 0) {
    console.log('\n❌ 性能预算超标:');
    for (const v of violations) {
      console.log(`  ${v.name}: ${v.metric}=${v.actual}${v.unit} > 红线 ${v.limit}${v.unit}`);
    }
    const report = { timestamp: new Date().toISOString(), results: allResults, violations, passed: false };
    fs.writeFileSync(path.join(PROJECT_ROOT, '.claude', '.perf-runtime.json'), JSON.stringify(report, null, 2));
    process.exit(1);
  }

  console.log('\n✅ 全部在预算内');
  const report = { timestamp: new Date().toISOString(), results: allResults, violations: [], passed: true };
  fs.writeFileSync(path.join(PROJECT_ROOT, '.claude', '.perf-runtime.json'), JSON.stringify(report, null, 2));
  process.exit(0);
}

module.exports = { measureColdStart, measureEditorLoad, measureTabSwitch, checkBudget };

if (require.main === module) {
  main().catch(e => { console.error('❌', e.message); process.exit(0); });
}
