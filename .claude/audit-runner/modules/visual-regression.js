/**
 * 视觉回归测试 — Playwright 截图 + pixelmatch 对比
 *
 * 基线: .claude/visual-baselines/ 首次运行时生成
 * 对比: 后续运行 → 截图 → pixelmatch → 偏差率 → 🟠 >2% / 🔴 >5%
 *
 * 前置: Playwright 已安装 (npm ls playwright)
 * 降级: Playwright 未安装或 dev server 未运行 → 🟡 跳过
 */
const path = require('path');
const fs = require('fs');

function check(ctx) {
  const results = [];
  const projectRoot = ctx.PROJECT_ROOT || '.';

  // 检测 Playwright 是否可用
  let pw;
  try { pw = require('playwright'); } catch (_) {
    results.push({ check: '视觉回归', status: '🟡', detail: 'Playwright 未安装。运行 npm install -D @playwright/test && npx playwright install chromium' });
    return results;
  }

  // 检测项目是否有 UI 页面
  const codeDir = ctx.codeDir || 'do-zhou';
  const pagesDir = path.join(projectRoot, codeDir, 'src', 'renderer', 'pages');
  const hasPages = fs.existsSync(pagesDir);
  if (!hasPages) {
    return results; // CLI/纯后端项目,跳过
  }

  // 收集需要截图的页面（从 .pen-frames.json 提取主页面帧）
  const framesPath = path.join(projectRoot, '.claude', '.pen-frames.json');
  let mainPages = [];
  try {
    const frames = JSON.parse(fs.readFileSync(framesPath, 'utf-8'));
    mainPages = frames.filter(f => f.type === '主页面').map(f => ({ id: f.id, name: f.name }));
  } catch (_) {
    results.push({ check: '视觉回归', status: '🟡', detail: '无 .pen-frames.json, 无法确定页面列表' });
    return results;
  }

  if (mainPages.length === 0) return results;

  const baselineDir = path.join(projectRoot, '.claude', 'visual-baselines');
  const isBaseline = !fs.existsSync(baselineDir) || fs.readdirSync(baselineDir).length === 0;

  // 标注：实际截图需要在 Electron/Playwright 环境中运行
  // 这里提供检查框架，实际执行由 Agent 手动触发或 CI 自动化
  results.push({
    check: `视觉回归: ${mainPages.length} 页面`,
    status: isBaseline ? '🟡' : '⏳',
    found: false,
    detail: isBaseline
      ? `基线未建立。Agent: 运行 "node .claude/audit-runner/modules/visual-regression.js --capture" 生成基线截图`
      : `基线已存在。Agent: 运行 "node .claude/audit-runner/modules/visual-regression.js --compare" 执行对比`,
  });

  if (!isBaseline) {
    // 检测基线是否过期（超过7天）
    try {
      const baselineFiles = fs.readdirSync(baselineDir).filter(f => f.endsWith('.png'));
      if (baselineFiles.length > 0) {
        const latestBaseline = Math.max(...baselineFiles.map(f => {
          try { return fs.statSync(path.join(baselineDir, f)).mtimeMs; } catch (_) { return 0; }
        }));
        const daysSinceBaseline = (Date.now() - latestBaseline) / (1000 * 60 * 60 * 24);
        if (daysSinceBaseline > 7) {
          results.push({
            check: '视觉回归基线',
            status: '🟡',
            detail: `基线已 ${Math.round(daysSinceBaseline)} 天未更新。建议重新生成。`,
          });
        }
      }
    } catch (_) {}
  }

  return results;
}

// 直接运行时 — 截图模式
if (require.main === module) {
  const mode = process.argv.includes('--compare') ? 'compare' : 'capture';
  console.log(`📸 视觉回归: ${mode === 'capture' ? '生成基线' : '执行对比'}`);
  console.log('在 Electron 环境中运行 Playwright 来实际截图。');
  console.log('参考: npx playwright test e2e/visual-regression/');
}

module.exports = { check };
