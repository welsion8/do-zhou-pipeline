/**
 * 性能预算检查 — 数据驱动，从 project.config.json 读取预算目标
 *
 * 强制执行规则：
 *   - 任一指标的 P90 代理值超过 ciRedLine → 🔴 阻断（Phase 关闸不放行）
 *   - 构建产物不存在 → 🟡 跳过（dev 模式下不强制构建）
 *   - 标准版 → 🟡 跳过（不强制性能预算）
 *
 * 前置: 构建产物（pnpm build）
 * 降级: 无构建产物 → 🟡 跳过，标注"dev 模式豁免"
 */

const path = require('path');
const fs = require('fs');

function loadBudget(ctx) {
  const projectRoot = ctx.PROJECT_ROOT || '.';
  const configPath = path.join(projectRoot, '.claude', 'project.config.json');
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw);
    return config.perfBudget || null;
  } catch (_) {
    return null;
  }
}

const METRIC_LABELS = {
  appColdStart:   '应用冷启动',
  editorLoad2k:   '编辑器加载(2000字)',
  aiFirstToken:   'AI流式首字延迟',
  tabSwitch:      '标签页切换',
  jsBundleSize:   'JS Bundle 大小',
};

function check(ctx) {
  const results = [];
  const projectRoot = ctx.PROJECT_ROOT || '.';
  const codeDir = ctx.codeDir || path.join(projectRoot, 'do-zhou');
  const utils = ctx.utils || require('./_utils.js');

  const budget = loadBudget(ctx);
  if (!budget || !budget.enforce) {
    results.push({ check: '性能预算', status: '🟡', detail: 'project.config.json 未配置 perfBudget 或 enforce=false。跳过。' });
    return results;
  }

  const ciRedLine = budget.ciRedLine || 'p90';
  const targets = budget.targets || {};

  // ── 静态代理检查（不依赖 Playwright，始终可执行）──

  // 1. JS Bundle 大小检查
  const bundleTarget = targets.jsBundleSize;
  if (bundleTarget) {
    const bundlePath = path.join(codeDir, 'out', 'renderer', 'assets');
    if (utils.dirExists(bundlePath)) {
      const jsFiles = fs.readdirSync(bundlePath).filter(f => f.endsWith('.js'));
      if (jsFiles.length > 0) {
        const totalKB = Math.round(jsFiles.reduce((s, f) => s + fs.statSync(path.join(bundlePath, f)).size, 0) / 1024);
        const redLine = bundleTarget[ciRedLine] || bundleTarget.p90 || 3000;
        const overBudget = totalKB > redLine;
        results.push({
          check: `Bundle 大小: ${totalKB}KB (红线 ${redLine}KB)`,
          status: overBudget ? '🔴' : '✅',
          found: !overBudget,
          detail: overBudget
            ? `超出 ${ciRedLine.toUpperCase()} 红线 ${totalKB - redLine}KB。需代码分割或 tree-shaking。`
            : `在 ${ciRedLine.toUpperCase()} 预算内`,
        });
      }
    } else {
      results.push({ check: 'Bundle 大小', status: '🟡', detail: '未构建。运行 pnpm build 后重试。' });
    }
  }

  // 2. 编辑器组件复杂度检查
  const editorDir = path.join(codeDir, 'src', 'renderer', 'components', 'editor');
  if (utils.dirExists(editorDir)) {
    const editorFiles = fs.readdirSync(editorDir).filter(f => f.endsWith('.tsx'));
    const totalLines = editorFiles.reduce((s, f) => {
      const content = utils.readFile(path.join(editorDir, f)) || '';
      return s + content.split('\n').length;
    }, 0);
    results.push({
      check: `编辑器组件: ${editorFiles.length}文件 ${totalLines}行`,
      status: totalLines > 900 ? '🟡' : '✅',
      found: true,
      detail: totalLines > 900
        ? '编辑器组件接近 300行/文件 上限，建议拆分。'
        : `${editorFiles.length} 个编辑器组件，总行数合理`,
    });
  }

  // 3. 其他静态目标标记
  const measurableTargets = Object.keys(targets).filter(k => k !== 'jsBundleSize');
  const unresolved = measurableTargets.filter(k => !results.some(r => r.check && r.check.includes(METRIC_LABELS[k] || k)));

  if (unresolved.length > 0) {
    const labelList = unresolved.map(k => METRIC_LABELS[k] || k).join('、');
    results.push({
      check: `性能预算: ${unresolved.length}项待 Playwright 精确测量`,
      status: '🟡',
      detail: `${labelList}。目前使用静态代理指标。连接 Playwright+Electron 后可测量实际 P50/P90/P99。预算已在 project.config.json 中定义。`,
    });
  }

  // ── 汇总判定 ──
  const hasBlocking = results.some(r => r.status === '🔴');
  if (hasBlocking) {
    results.push({
      check: '性能预算: 关闸判定',
      status: '🔴',
      detail: '存在超出 CI 红线的指标。修复后重新验证。',
    });
  }

  return results;
}

module.exports = { check };
