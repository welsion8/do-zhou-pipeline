/**
 * coverage-velocity.js — 覆盖率增长速度检查
 *
 * 检测是否在走"小组件逐个 +0.1%"的低效路线。
 * 若检测到低效模式 → 🟡 建议切换到 IPC mock + 页面测试策略。
 *
 * 阈值:
 *   文件数 > 15 且 覆盖率 < 20% → 🟠 低效路线警告
 *   文件数 > 30 且 覆盖率 < 25% → 🔴 严重低效
 *
 * 通用性: 读 coverage-final.json，不绑定任何产品。
 */

const fs = require('fs');
const path = require('path');

function check(ctx) {
  const results = [];
  const projectRoot = ctx.PROJECT_ROOT || '.';
  const codeDir = ctx.codeDir || 'do-zhou';

  const coverageFile = path.join(projectRoot, codeDir, 'coverage', 'coverage-final.json');
  if (!fs.existsSync(coverageFile)) {
    results.push({ check: '覆盖速度', status: '🟡', detail: '无 coverage-final.json。运行 vitest --coverage 后检查。' });
    return results;
  }

  try {
    const cov = JSON.parse(fs.readFileSync(coverageFile, 'utf-8'));
    const allFiles = Object.keys(cov).filter(k => k.includes('/src/') && !k.includes('node_modules'));

    let totalStatements = 0, coveredStatements = 0;
    for (const [file, data] of Object.entries(cov)) {
      if (!file.includes('/src/') || file.includes('node_modules')) continue;
      const s = data.s || (data.statementMap ? data.s : null);
      if (!s) continue;
      const keys = Object.keys(s);
      totalStatements += keys.length;
      coveredStatements += keys.filter(k => s[k] > 0).length;
    }

    const pct = totalStatements > 0 ? Math.round(coveredStatements / totalStatements * 100) : 0;

    // 检测测试文件数量——文件多但覆盖低 = 低效路线
    const testDir = path.join(projectRoot, codeDir, 'src');
    let testFileCount = 0;
    function countTests(dir, depth) {
      if (depth > 5) return;
      try {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          if (e.name.startsWith('.') || e.name === 'node_modules') continue;
          const full = path.join(dir, e.name);
          if (e.isDirectory()) countTests(full, depth + 1);
          else if (e.name.includes('.test.') || e.name.includes('.spec.')) testFileCount++;
        }
      } catch (_) {}
    }
    countTests(testDir, 0);

    if (testFileCount > 30 && pct < 25) {
      results.push({
        check: '覆盖速度: 🔴 严重低效',
        status: '🔴',
        detail: `${testFileCount} 个测试文件仅覆盖 ${pct}%。建议: 删小组件测试 → 建 IPC mock 层 → 测主页面 (每个+5-7%)`,
      });
    } else if (testFileCount > 15 && pct < 20) {
      results.push({
        check: '覆盖速度: 🟠 低效路线',
        status: '🟠',
        detail: `${testFileCount} 个测试文件仅覆盖 ${pct}%。建议: 停止小组件，改用 IPC mock + 页面测试策略。`,
      });
    } else if (testFileCount > 5) {
      results.push({
        check: '覆盖速度',
        status: '🟢',
        detail: `${testFileCount} 个测试文件, 覆盖率 ${pct}% — 正常`,
      });
    }

  } catch (_) {
    results.push({ check: '覆盖速度', status: '🟡', detail: '无法解析覆盖率数据' });
  }

  return results;
}

module.exports = { check };
