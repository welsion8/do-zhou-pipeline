/**
 * design-diff.js — 设计变更自动检测与影响分析
 *
 * 检测 .pen 设计稿变更 → 分析影响的代码文件 → 输出影响报告
 * 用于 CI pipeline 和 PR comment。
 *
 * 用法:
 *   node design-diff.js                              # 检查当前状态
 *   node design-diff.js --base <commit-hash>         # 对比指定 commit
 *   node design-diff.js --ci                         # CI 模式(输出 JSON)
 *   node design-diff.js --watch                      # 持续监听模式
 *
 * 输出:
 *   - 影响报告 JSON  → .claude/.design-diff.json
 *   - 终端彩色报告
 *   - CI annotation   → GitHub Actions workflow 消费
 *
 * 通用性: 不绑定特定 .pen 文件。扫描项目根下的 *.pen 文件。
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const CLAUDE_DIR = path.join(PROJECT_ROOT, '.claude');

// ── 影响映射引擎 ──

/**
 * 从 pen-frames.json 加载 帧 → 代码文件 的映射
 */
function loadFrameCodeMap() {
  const framesFile = path.join(CLAUDE_DIR, '.pen-frames.json');
  if (!fs.existsSync(framesFile)) return {};

  const frames = JSON.parse(fs.readFileSync(framesFile, 'utf-8'));
  const map = {};
  for (const f of frames) {
    if (f.id && f.structure?.codeFile) {
      map[f.id] = {
        name: f.name,
        codeFiles: Array.isArray(f.structure.codeFile) ? f.structure.codeFile : [f.structure.codeFile],
        phase: f.structure.phase,
        type: f.type,
      };
    }
  }
  return map;
}

/**
 * 从 layout-values.json 中提取受影响的 token 类别
 */
function analyzeDesignChanges(oldLayout, newLayout) {
  const changes = [];
  const frameCodeMap = loadFrameCodeMap();

  for (const [frameId, newFrame] of Object.entries(newLayout.frames || {})) {
    const oldFrame = oldLayout?.frames?.[frameId];
    if (!oldFrame) continue;

    const frameInfo = frameCodeMap[frameId] || { name: newFrame.name || frameId, codeFiles: [], phase: '?' };

    for (const key of ['width', 'height', 'fill', 'cornerRadius', 'padding', 'gap']) {
      if (JSON.stringify(oldFrame[key]) !== JSON.stringify(newFrame[key])) {
        changes.push({
          frame: frameId,
          frameName: frameInfo.name,
          property: key,
          old: oldFrame[key],
          new: newFrame[key],
          affectedFiles: frameInfo.codeFiles,
          phase: frameInfo.phase,
          severity: classifySeverity(key, oldFrame[key], newFrame[key]),
        });
      }
    }

    // 检查子组件变更
    if (newFrame.childComponents && oldFrame.childComponents) {
      const subChanges = deepDiff(
        oldFrame.childComponents,
        newFrame.childComponents,
        frameId,
        frameInfo
      );
      changes.push(...subChanges);
    }
  }

  return changes;
}

function classifySeverity(property, oldVal, newVal) {
  // 尺寸/间距变更 → 可能破坏布局
  if (['width', 'height', 'padding', 'gap', 'fontSize'].includes(property)) {
    return 'high';
  }
  // 圆角/字体 → 视觉影响，不破坏布局
  if (['cornerRadius', 'fontWeight', 'fontFamily'].includes(property)) {
    return 'medium';
  }
  // 颜色 → 纯视觉
  if (['fill', 'stroke'].includes(property)) {
    return 'low';
  }
  return 'medium';
}

function deepDiff(oldObj, newObj, frameId, frameInfo, prefix = '') {
  const changes = [];
  for (const [key, newVal] of Object.entries(newObj || {})) {
    const oldVal = oldObj?.[key];
    if (oldVal === undefined || newVal === undefined) continue;

    const fullPath = prefix ? `${prefix}.${key}` : key;

    if (typeof newVal === 'object' && newVal !== null && !Array.isArray(newVal)) {
      changes.push(...deepDiff(oldVal, newVal, frameId, frameInfo, fullPath));
      continue;
    }

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        frame: frameId,
        frameName: frameInfo.name,
        property: fullPath,
        old: oldVal,
        new: newVal,
        affectedFiles: frameInfo.codeFiles,
        phase: frameInfo.phase,
        severity: classifySeverity(fullPath.split('.').pop() || '', oldVal, newVal),
      });
    }
  }
  return changes;
}

// ── 报告生成 ──

function generateReport(changes, options = {}) {
  const highChanges = changes.filter(c => c.severity === 'high');
  const mediumChanges = changes.filter(c => c.severity === 'medium');
  const lowChanges = changes.filter(c => c.severity === 'low');

  // 按受影响文件聚合
  const fileImpact = {};
  for (const change of changes) {
    for (const file of (change.affectedFiles || [])) {
      if (!fileImpact[file]) fileImpact[file] = [];
      fileImpact[file].push(change);
    }
  }

  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalChanges: changes.length,
      high: highChanges.length,
      medium: mediumChanges.length,
      low: lowChanges.length,
      affectedFiles: Object.keys(fileImpact).length,
    },
    changes,
    fileImpact,
  };
}

function printReport(report) {
  const { summary, changes, fileImpact } = report;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📐 设计变更影响分析');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  变更: ${summary.totalChanges} 处  (🔴${summary.high} 🟠${summary.medium} 🟡${summary.low})`);
  console.log(`  影响文件: ${summary.affectedFiles} 个\n`);

  // 🔴 高影响
  if (summary.high > 0) {
    console.log('  🔴 布局影响:');
    for (const c of changes.filter(c => c.severity === 'high').slice(0, 10)) {
      console.log(`     ${c.frameName}.${c.property}: ${c.old} → ${c.new}  →  ${(c.affectedFiles || []).join(', ') || '未知文件'}`);
    }
  }

  // 🟠 中影响
  if (summary.medium > 0) {
    console.log('\n  🟠 视觉影响:');
    for (const c of changes.filter(c => c.severity === 'medium').slice(0, 5)) {
      console.log(`     ${c.frameName}.${c.property}: ${c.old} → ${c.new}`);
    }
  }

  // 文件影响排行
  if (Object.keys(fileImpact).length > 0) {
    console.log('\n  📁 受影响文件排行:');
    const sorted = Object.entries(fileImpact).sort((a, b) => b[1].length - a[1].length);
    for (const [file, fileChanges] of sorted.slice(0, 5)) {
      const highCount = fileChanges.filter(c => c.severity === 'high').length;
      console.log(`     ${file}: ${fileChanges.length} 处变更${highCount > 0 ? ` (含 ${highCount} 🔴)` : ''}`);
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ── CI 注释生成 ──

function generateCIAnnotation(report) {
  const { summary, fileImpact } = report;

  if (summary.totalChanges === 0) {
    console.log('✅ 设计数据无变更');
    return;
  }

  // 按文件输出 GitHub Actions annotation
  for (const [file, changes] of Object.entries(fileImpact)) {
    const highChanges = changes.filter(c => c.severity === 'high');
    if (highChanges.length > 0) {
      const details = highChanges.map(c => `${c.frameName}.${c.property}: ${c.old}→${c.new}`).join(', ');
      console.log(`::warning file=${file}::设计变更影响 (${highChanges.length} 处): ${details}`);
    }
  }

  // 摘要
  console.log(`::notice::设计变更: ${summary.totalChanges} 处, 影响 ${summary.affectedFiles} 个文件`);
}

// ── 主入口 ──

function main() {
  const args = process.argv.slice(2);
  const ciMode = args.includes('--ci');
  const baseRef = args.includes('--base') ? args[args.indexOf('--base') + 1] : null;

  const layoutFile = path.join(CLAUDE_DIR, '.pen-layout-values.json');
  const diffFile = path.join(CLAUDE_DIR, '.design-diff.json');

  if (!fs.existsSync(layoutFile)) {
    console.log('⚠ .pen-layout-values.json 不存在，跳过设计变更检测');
    process.exit(0);
  }

  const currentLayout = JSON.parse(fs.readFileSync(layoutFile, 'utf-8'));

  // 获取基线
  let baseLayout = { frames: {} };
  if (baseRef) {
    try {
      const baseJson = execSync(`git show ${baseRef}:.claude/.pen-layout-values.json`, {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
      }).toString();
      baseLayout = JSON.parse(baseJson);
    } catch (_) {
      console.log(`⚠ 无法获取 ${baseRef} 的基线数据，与空基线对比`);
    }
  } else if (fs.existsSync(diffFile)) {
    // 使用保存的上次快照
    const prev = JSON.parse(fs.readFileSync(diffFile, 'utf-8'));
    if (prev.snapshot) baseLayout = prev.snapshot;
  }

  const changes = analyzeDesignChanges(baseLayout, currentLayout);
  const report = generateReport(changes);

  // 保存报告
  report.snapshot = currentLayout; // 保存快照用于下次对比
  fs.writeFileSync(diffFile, JSON.stringify(report, null, 2));

  if (ciMode) {
    generateCIAnnotation(report);
  } else {
    printReport(report);
  }

  // 退出码
  if (report.summary.high > 0) {
    process.exit(report.summary.high > 3 ? 1 : 0);
  }
}

/**
 * 管线 check() 接口 — 由 audit-pipeline.js 调度
 */
function check(ctx) {
  const results = [];
  const projectRoot = ctx.PROJECT_ROOT || '.';
  const layoutFile = path.join(projectRoot, '.claude', '.pen-layout-values.json');
  const diffFile = path.join(projectRoot, '.claude', '.design-diff.json');

  if (!fs.existsSync(layoutFile)) {
    results.push({ check: '设计变更检测', status: '🟡', detail: '.pen-layout-values.json 不存在。跳过。' });
    return results;
  }

  const currentLayout = JSON.parse(fs.readFileSync(layoutFile, 'utf-8'));

  let baseLayout = { frames: {} };
  if (fs.existsSync(diffFile)) {
    try {
      const prev = JSON.parse(fs.readFileSync(diffFile, 'utf-8'));
      if (prev.snapshot) baseLayout = prev.snapshot;
    } catch (_) {}
  }

  const changes = analyzeDesignChanges(baseLayout, currentLayout);
  const report = generateReport(changes);

  // 保存快照
  report.snapshot = currentLayout;
  fs.writeFileSync(diffFile, JSON.stringify(report, null, 2));

  if (report.summary.high > 0) {
    results.push({
      check: '设计变更检测',
      status: '🔴',
      detail: `${report.summary.totalChanges} 处变更 (${report.summary.high} 🔴)`,
      changes: report.changes.filter(c => c.severity === 'high').slice(0, 5),
    });
  } else if (report.summary.totalChanges > 0) {
    results.push({
      check: '设计变更检测',
      status: '🟡',
      detail: `${report.summary.totalChanges} 处变更 (0 🔴)`,
    });
  } else {
    results.push({ check: '设计变更检测', status: '🟢', detail: '设计数据无变更' });
  }

  return results;
}

module.exports = { analyzeDesignChanges, generateReport, loadFrameCodeMap, check };

if (require.main === module) {
  main();
}
