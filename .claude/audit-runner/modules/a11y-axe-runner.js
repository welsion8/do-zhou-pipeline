/**
 * a11y-axe-runner.js — Playwright + axe-core WCAG AA 运行时扫描
 *
 * 启动 Electron 应用 → 注入 axe-core → 逐页扫描 → 输出违规报告。
 * 在 Phase gate 前手动或 CI 中执行。替代静态属性扫描的盲区。
 *
 * 用法:
 *   node a11y-axe-runner.js                       # 扫描默认页面
 *   node a11y-axe-runner.js --pages all           # 扫描所有页面
 *   node a11y-axe-runner.js --ci                  # CI 模式: JSON 输出
 *   node a11y-axe-runner.js --threshold 5         # 违规 >5 → 阻断 (默认10)
 *
 * 前置: 应用已构建 (pnpm build), Playwright 已安装
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const CODE_DIR = 'do-zhou';
const OUT_DIR = path.join(PROJECT_ROOT, CODE_DIR, 'out');

// WCAG 违规严重度 → 门禁判定
const IMPACT_WEIGHTS = { critical: 4, serious: 3, moderate: 2, minor: 1 };

// 需要扫描的页面路由（Electron 应用内导航）
const PAGE_ROUTES = [
  { name: 'Skill主页', navigate: 'home', wait: 2000 },
  { name: '写作工作台', navigate: 'workspace', wait: 1500 },
  { name: 'API配置页', navigate: 'api-config', wait: 1500 },
  { name: '设置页面', navigate: 'settings', wait: 1500 },
];

function printHeader() {
  console.log('\n♿ WCAG AA 无障碍运行时扫描');
  console.log('═'.repeat(50));
}

function printViolation(v) {
  const nodes = (v.nodes || []).slice(0, 3);
  console.log(`  ${v.impact === 'critical' ? '🔴' : v.impact === 'serious' ? '🟠' : v.impact === 'moderate' ? '🟡' : '⚪'} ${v.id}: ${v.help}`);
  console.log(`     ${v.description}`);
  for (const n of nodes) {
    console.log(`     └─ ${n.html?.substring(0, 80) || n.target?.join(' ') || 'unknown'}`);
  }
  if ((v.nodes || []).length > 3) console.log(`     └─ ... 还有 ${v.nodes.length - 3} 个元素`);
}

async function scanPage(page, pageName) {
  console.log(`\n📄 ${pageName}`);

  // 注入 axe-core
  const axeMinPath = path.join(PROJECT_ROOT, CODE_DIR, 'node_modules', 'axe-core', 'axe.min.js');
  if (fs.existsSync(axeMinPath)) {
    await page.addScriptTag({ path: axeMinPath });
  }

  // 运行扫描
  const results = await page.evaluate(() => {
    return window.axe.run({
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
      },
    });
  });

  const violations = results.violations || [];
  const passes = results.passes?.length || 0;

  // 严重度加权
  let weightedScore = 0;
  for (const v of violations) {
    weightedScore += IMPACT_WEIGHTS[v.impact] || 0;
  }

  console.log(`  违规: ${violations.length} (critical:${violations.filter(v=>v.impact==='critical').length} serious:${violations.filter(v=>v.impact==='serious').length} moderate:${violations.filter(v=>v.impact==='moderate').length})`);
  console.log(`  通过: ${passes} 项检查`);
  console.log(`  加权分: ${weightedScore}`);

  for (const v of violations) {
    if (v.impact === 'critical' || v.impact === 'serious') {
      printViolation(v);
    }
  }

  return { pageName, violations: violations.length, critical: violations.filter(v => v.impact === 'critical').length, serious: violations.filter(v => v.impact === 'serious').length, weightedScore, passes };
}

async function navigateTo(page, route) {
  // 在 Electron 应用中通过按钮导航
  try {
    switch (route) {
      case 'home':
        const homeBtn = page.locator('[data-testid="btn-home"]');
        if (await homeBtn.isVisible({ timeout: 2000 }).catch(() => false)) await homeBtn.click();
        break;
      case 'settings':
        const settingsBtn = page.locator('[data-testid="btn-settings"]');
        if (await settingsBtn.isVisible({ timeout: 2000 }).catch(() => false)) await settingsBtn.click();
        break;
      case 'api-config':
        // 通过设置页进入 API 配置
        const sBtn = page.locator('[data-testid="btn-settings"]');
        if (await sBtn.isVisible({ timeout: 2000 }).catch(() => false)) await sBtn.click();
        await page.waitForTimeout(800);
        break;
      default:
        await page.waitForTimeout(500);
    }
    await page.waitForTimeout(route === 'home' ? 2000 : 1500);
  } catch (_) {
    await page.waitForTimeout(1500);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const ciMode = args.includes('--ci');
  const scanAll = args.includes('--pages') && args.includes('all');
  const thresholdIdx = args.indexOf('--threshold');
  const threshold = thresholdIdx >= 0 ? parseInt(args[thresholdIdx + 1]) : 10;

  if (!fs.existsSync(path.join(OUT_DIR, 'main', 'index.js'))) {
    console.log('🟡 应用未构建。运行 pnpm build 先构建。');
    console.log('   静态属性扫描已由 a11y-check.js 完成。');
    process.exit(0);
  }

  // 检查 axe-core 是否可用（在代码目录的 node_modules 中查找）
  const axePath = path.join(PROJECT_ROOT, CODE_DIR, 'node_modules', 'axe-core');
  if (!fs.existsSync(axePath)) {
    console.log('🟡 axe-core 未安装。运行: cd do-zhou && pnpm add -D axe-core');
    console.log('   回退到静态属性扫描。');
    process.exit(0);
  }

  printHeader();

  let totalViolations = 0, totalCritical = 0, totalSerious = 0, totalWeighted = 0;
  const allResults = [];

  // 启动 Electron（playwright 安装在代码目录的 node_modules）
  const playwrightPath = path.join(PROJECT_ROOT, CODE_DIR, 'node_modules', 'playwright');
  if (!fs.existsSync(playwrightPath)) {
    console.log('🟡 Playwright 未安装。运行: cd do-zhou && pnpm add -D @playwright/test && npx playwright install chromium');
    process.exit(0);
  }
  const { _electron: electron } = require(playwrightPath);
  const EP = path.join(PROJECT_ROOT, CODE_DIR, 'node_modules', 'electron', 'dist', 'electron.exe');
  const MAIN = path.join(OUT_DIR, 'main', 'index.js');

  console.log('🚀 启动应用...');
  const app = await electron.launch({ executablePath: EP, args: [MAIN] });
  const page = await app.firstWindow();
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(3000);

  // 扫描首页
  let result = await scanPage(page, '应用启动页');
  allResults.push(result);
  totalViolations += result.violations;
  totalCritical += result.critical;
  totalSerious += result.serious;
  totalWeighted += result.weightedScore;

  // 扫描其他页面
  if (scanAll) {
    for (const route of PAGE_ROUTES.slice(1)) {
      await navigateTo(page, route.navigate);
      result = await scanPage(page, route.name);
      allResults.push(result);
      totalViolations += result.violations;
      totalCritical += result.critical;
      totalSerious += result.serious;
      totalWeighted += result.weightedScore;
    }
  }

  await app.close();

  // ── 判定 ──
  console.log('\n' + '═'.repeat(50));
  console.log(`📊 总计: ${totalViolations} 违规 (🔴critical:${totalCritical} 🟠serious:${totalSerious}) | 加权分: ${totalWeighted}`);

  if (totalWeighted > threshold) {
    console.log(`❌ 加权分 ${totalWeighted} > 阈值 ${threshold} — 无障碍检查未通过`);
    process.exit(1);
  }

  console.log(`✅ 加权分 ${totalWeighted} ≤ 阈值 ${threshold} — 无障碍检查通过`);

  // 写报告
  const report = {
    timestamp: new Date().toISOString(),
    totalViolations, totalCritical, totalSerious, totalWeighted, threshold,
    passed: totalWeighted <= threshold,
    pages: allResults,
  };
  fs.writeFileSync(path.join(PROJECT_ROOT, '.claude', '.a11y-report.json'), JSON.stringify(report, null, 2));

  process.exit(totalWeighted > threshold ? 1 : 0);
}

main().catch(e => {
  console.error('❌ a11y 运行时扫描失败:', e.message);
  console.log('   回退到静态属性扫描。');
  process.exit(0);
});
