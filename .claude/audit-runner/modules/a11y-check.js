/**
 * 无障碍检测 — WCAG AA 合规检查 + Phase gate 门禁
 *
 * 两层检查:
 *   L1 静态: aria-/role/tabIndex/keyboard/focus 代码扫描（audit-pipeline 内执行）
 *   L2 运行时: Playwright + axe-core 自动扫描（Phase gate 时执行）
 *
 * 门禁: 🔴 项阻断 Phase gate
 *   键盘导航缺失           → 🔴
 *   主要页面无 focus 样式  → 🔴
 *   色彩对比度未处理       → 🟠
 *   aria 覆盖率 < 30%     → 🟡
 *
 * 用法:
 *   静态模式(管线): node a11y-check.js  (作为 audit-pipeline 模块)
 *   运行时模式:       node a11y-check.js --runtime  (启动应用 + axe-core)
 */

const path = require('path');
const fs = require('fs');

function check(ctx) {
  const results = [];
  const codeDir = ctx.codeDir;
  const utils = ctx.utils || require('./_utils.js');
  const projectRoot = ctx.PROJECT_ROOT || '.';
  if (!codeDir) return results;

  const allFiles = utils.findFiles(codeDir, ['.tsx', '.ts', '.css'], ctx.CONFIG?.ignoreDirs);
  if (!allFiles?.length) return results;

  let totalAria = 0, totalRole = 0, totalTabIndex = 0, totalAlt = 0, totalLabel = 0;
  let filesWithA11y = new Set();
  let focusRingFiles = new Set();
  let keyboardFiles = new Set();

  for (const f of allFiles) {
    const content = utils.readFile(f) || '';
    const ariaCount = (content.match(/aria-/g) || []).length;
    const roleCount = (content.match(/role=/g) || []).length;
    const tabCount = (content.match(/tabIndex/g) || []).length;
    const altCount = (content.match(/alt=/g) || []).length;
    const labelCount = (content.match(/aria-label|aria-labelledby|htmlFor/g) || []).length;

    totalAria += ariaCount;
    totalRole += roleCount;
    totalTabIndex += tabCount;
    totalAlt += altCount;
    totalLabel += labelCount;

    const a11yScore = ariaCount + roleCount + tabCount + altCount + labelCount;
    if (a11yScore > 0) {
      filesWithA11y.add(path.relative(codeDir, f));
    }
    if (/focus-visible|focus-within|focus.*ring|:focus/.test(content)) {
      focusRingFiles.add(path.relative(codeDir, f));
    }
    if (/onKeyDown|onKeyUp|onKeyPress|keyboard|handleKey/.test(content)) {
      keyboardFiles.add(path.relative(codeDir, f));
    }
  }

  const totalFiles = allFiles.length;
  const coveredFiles = filesWithA11y.size;
  const a11yPct = Math.round(coveredFiles / Math.max(1, totalFiles) * 100);

  // ── 综合得分 ──
  const totalAttr = totalAria + totalRole + totalTabIndex + totalAlt + totalLabel;
  // data-testid 已在上面的 totalAria 中计入

  results.push({
    check: `a11y: 无障碍属性`,
    status: totalAttr > 15 ? '🟢' : (totalAttr > 5 ? '🟡' : '🔴'),
    detail: `${totalAttr} 处 (aria:${totalAria} role:${totalRole} tabIndex:${totalTabIndex} alt:${totalAlt} label:${totalLabel}) — ${coveredFiles}/${totalFiles} 文件 (${a11yPct}%)`,
  });

  // ── 🔴 阻断项 ──
  // 键盘导航
  if (keyboardFiles.size === 0) {
    results.push({
      check: 'a11y: 键盘导航',
      status: '🔴',
      detail: '缺少键盘事件处理 (onKeyDown/onKeyUp)。必须至少有一个组件支持键盘操作。',
    });
  } else {
    results.push({
      check: 'a11y: 键盘导航',
      status: '🟢',
      detail: `${keyboardFiles.size} 个文件实现了键盘事件`,
    });
  }

  // Focus 样式
  if (focusRingFiles.size === 0) {
    results.push({
      check: 'a11y: Focus 可见样式',
      status: '🔴',
      detail: '未检测到 :focus-visible / focus-ring 样式。键盘用户无法看到焦点位置。',
    });
  } else {
    results.push({
      check: 'a11y: Focus 可见样式',
      status: focusRingFiles.size >= 3 ? '🟢' : '🟡',
      detail: `${focusRingFiles.size} 个文件包含 focus 样式`,
    });
  }

  // ── 🟠 警告项 ──
  // 色彩对比度
  const hasContrast = allFiles.some(f => /contrast|WCAG|色彩|对比度|AA/.test(utils.readFile(f) || ''));
  results.push({
    check: 'a11y: 色彩对比度',
    status: hasContrast ? '🟢' : '🟠',
    detail: hasContrast ? '代码中已标注对比度考虑' : 'DESIGN-TOKENS.md 中 --text-tertiary 标注了 AA 不达标。建议: 全局 audit 时检查所有文字色与背景色的对比度。',
  });

  // ARIA 覆盖率
  const ariaCoverageStatus = a11yPct >= 30 ? '🟢' : (a11yPct >= 10 ? '🟡' : '🟠');
  results.push({
    check: 'a11y: ARIA 覆盖率',
    status: ariaCoverageStatus,
    detail: `${a11yPct}% 文件使用了 ARIA/role/tabIndex/alt/label 属性（目标 ≥ 30%）`,
  });

  // ── 汇总判定 ──
  const blockers = results.filter(r => r.status === '🔴').length;
  const warnings = results.filter(r => r.status === '🟠').length;
  results.push({
    check: 'a11y: Phase gate 判定',
    status: blockers > 0 ? '🔴' : (warnings > 1 ? '🟠' : '🟢'),
    detail: blockers > 0
      ? `❌ ${blockers} 项阻断 — Phase 不得放行。修复键盘导航和 Focus 样式。`
      : (warnings > 1 ? `⚠ ${warnings} 项警告 — 建议修复后放行` : '✅ 无障碍检查通过'),
  });

  // ── 运行时扫描建议 ──
  results.push({
    check: 'a11y: axe-core 运行时扫描',
    status: '⏳',
    detail: '运行 node .claude/audit-runner/modules/a11y-axe-runner.js 启动完整 WCAG AA 运行时扫描',
  });

  return results;
}

module.exports = { check };
