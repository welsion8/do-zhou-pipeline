/**
 * E2E 冒烟检查 — 调用 Playwright 测试并解析结果
 *
 * 前置条件: do-zhou 已构建（pnpm build），Playwright 已安装
 * 未满足时自动降级跳过。
 */

const path = require('path');
const { execSync } = require('child_process');

function check(ctx) {
  const results = [];
  const projectRoot = ctx.PROJECT_ROOT || '.';
  const codeDir = ctx.codeDir || path.join(projectRoot, 'do-zhou');
  const e2eDir = path.join(codeDir, 'e2e');

  const utils = ctx.utils || require('./_utils.js');

  // 检查前置条件
  if (!utils.dirExists(e2eDir)) {
    results.push({ check: 'E2E 环境', status: '🟡', detail: 'e2e/ 目录不存在，跳过' });
    return results;
  }

  const playwrightPkg = path.join(codeDir, 'node_modules', '@playwright', 'test');
  if (!utils.dirExists(playwrightPkg)) {
    results.push({ check: 'E2E 环境', status: '🟡', detail: 'Playwright 未安装，跳过' });
    return results;
  }

  // 检查应用是否已构建
  const outDir = path.join(codeDir, 'out', 'main', 'index.js');
  if (!utils.fileExists(outDir)) {
    results.push({ check: 'E2E 冒烟', status: '🟡', detail: '应用未构建。运行 pnpm build 后重试。' });
    return results;
  }

  // 跑 Playwright 测试
  try {
    const output = execSync('npx playwright test --reporter=json', {
      cwd: e2eDir,
      stdio: 'pipe',
      timeout: 120000,
      env: { ...process.env, CI: 'true' },
    }).toString();

    // 提取 JSON（可能混有 stderr 输出）
    const jsonStart = output.indexOf('{');
    if (jsonStart < 0) throw new Error('无 JSON 输出');
    const report = JSON.parse(output.substring(jsonStart));
    let passed = 0, total = 0;
    if (report.suites) {
      for (const suite of report.suites) {
        for (const spec of (suite.specs || [])) {
          total++;
          if (spec.tests && spec.tests.every(t => t.results && t.results.every(r => r.status === 'passed'))) {
            passed++;
          }
        }
      }
    }

    results.push({
      check: `E2E 冒烟: ${passed}/${total} 通过`,
      status: passed === total ? '✅' : (passed > 0 ? '🟡' : '🔴'),
      found: passed === total,
      detail: `${passed}/${total} 测试通过`,
    });
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)) || '';
    if (msg.includes('Executable doesn\'t exist') || msg.includes('browser')) {
      results.push({ check: 'E2E 冒烟', status: '🟡', detail: 'Playwright 浏览器未安装。运行 npx playwright install chromium' });
    } else if (msg.includes('ENOENT') || msg.includes('not found')) {
      results.push({ check: 'E2E 冒烟', status: '🟡', detail: 'Playwright 未就绪。安装后重试。' });
    } else {
      // Playwright 可能在无 GUI 环境运行失败 → 降级为 🟡
      results.push({ check: 'E2E 冒烟', status: '🟡', detail: 'E2E 需在 GUI 环境运行。本地: npx playwright test' });
    }
  }

  return results;
}

module.exports = { check };
