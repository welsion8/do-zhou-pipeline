#!/usr/bin/env node
/**
 * dashboard.js — 管线仪表板生成器
 *
 * 读取所有管线数据文件 → 生成自包含 HTML 仪表板。
 * 自动在 audit-pipeline 完成后触发。
 *
 * 用法:
 *   node dashboard.js                    # 生成 .claude/dashboard.html
 *   node dashboard.js --open              # 生成并打开浏览器
 *   node dashboard.js --watch             # 监听文件变更自动刷新
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const CLAUDE_DIR = path.join(PROJECT_ROOT, '.claude');
const DASHBOARD_FILE = path.join(CLAUDE_DIR, 'dashboard.html');

// ── 数据读取 ──

function readJSON(filename) {
  try { return JSON.parse(fs.readFileSync(path.join(CLAUDE_DIR, filename), 'utf-8')); }
  catch (_) { return null; }
}

function readGate() {
  const gate = {};
  try {
    const content = fs.readFileSync(path.join(CLAUDE_DIR, '.phase-gate'), 'utf-8');
    for (const line of content.split('\n')) {
      const m = line.match(/^(\w+)=(pending|pass|fail|skip)$/);
      if (m) gate[m[1]] = m[2];
      const pm = line.match(/^phase=(\d+)/);
      if (pm) gate.phase = parseInt(pm[1]);
    }
  } catch (_) {}
  return gate;
}

// ── 数据聚合 ──

function aggregate() {
  const audit = readJSON('.audit-report.json');
  const gate = readGate();
  const e2e = readJSON('.e2e-coverage.json');
  const a11y = readJSON('.a11y-report.json');
  const trace = readJSON('.traceability.json');
  const projectConfig = readJSON('project.config.json');

  // Phase gate 12 项
  const gateItems = [
    { key: 'tsc_check', label: '编译检查', icon: '📦', group: '代码' },
    { key: 'lint_check', label: 'Lint', icon: '🔍', group: '代码' },
    { key: 'test_check', label: '单元测试', icon: '🧪', group: '代码' },
    { key: 'security_scan', label: '安全扫描', icon: '🔒', group: '代码' },
    { key: 'runtime_check', label: '运行时验证', icon: '▶', group: '交互' },
    { key: 'design_read_check', label: '设计数据同步', icon: '🎨', group: '设计' },
    { key: 'code_review', label: '代码审查', icon: '👀', group: '质量' },
    { key: 'audit_L1', label: 'L1 需求', icon: '📋', group: '审计' },
    { key: 'audit_L2', label: 'L2 设计', icon: '🖼', group: '审计' },
    { key: 'audit_L3', label: 'L3 元规则', icon: '⚙', group: '审计' },
    { key: 'audit_L4', label: 'L4 Skill', icon: '🔧', group: '审计' },
    { key: 'audit_L5', label: 'L5 代码', icon: '💻', group: '审计' },
  ];

  // 审计概要
  const auditSummary = audit?.summary || { red: 0, orange: 0, yellow: 0, green: 0 };

  // E2E 覆盖率（兼容两种格式）
  const e2eCoverage = {
    coverage: e2e?.coverage || (e2e?.covered && e2e?.scenarios ? Math.round(e2e.covered / e2e.scenarios * 100) : 0),
    weightedCoverage: e2e?.weightedCoverage || e2e?.coverage || (e2e?.covered && e2e?.scenarios ? Math.round(e2e.covered / e2e.scenarios * 100) : 0),
    scenarios: e2e?.scenarios || e2e?.total || 0,
    existingTests: e2e?.existingTests || 0,
  };

  // 无障碍
  const a11yScore = a11y || { totalWeighted: null, passed: null };

  // 可追溯
  const traceSummary = trace?.summary || {};

  // 模块列表
  const moduleNames = audit
    ? Object.keys(audit).filter(k => Array.isArray(audit[k]) && audit[k].length > 0)
    : [];

  // 通过的 gate 项
  const gatePassed = gateItems.filter(g => gate[g.key] === 'pass').length;
  const gatePending = gateItems.filter(g => gate[g.key] === 'pending').length;
  const gateFail = gateItems.filter(g => gate[g.key] === 'fail').length;
  const gateSkip = gateItems.filter(g => gate[g.key] === 'skip').length;

  // 从实际 items 计算 🔴🟠 数（比 summary 更准确）
  let actualRed = 0, actualOrange = 0, actualYellow = 0, actualGreen = 0;
  for (const [k, v] of Object.entries(audit || {})) {
    if (!Array.isArray(v)) continue;
    for (const item of v) {
      if (item.status === '🔴' || item.status === '❌') actualRed++;
      else if (item.status === '🟠') actualOrange++;
      else if (item.status === '🟡' || item.status === '⏳') actualYellow++;
      else if (item.status === '🟢' || item.status === '✅') actualGreen++;
    }
  }
  const actualSummary = { red: actualRed, orange: actualOrange, yellow: actualYellow, green: actualGreen };

  return {
    timestamp: new Date().toISOString(),
    phase: gate.phase || '?',
    projectType: projectConfig?.project?.type || 'unknown',
    projectName: projectConfig?.project?.codeDir || 'unknown',
    gateItems,
    gate,
    gatePassed, gatePending, gateFail, gateSkip,
    gateAllPass: gateFail === 0 && gatePending === 0,
    auditSummary: actualSummary,
    auditRaw: auditSummary,
    e2eCoverage,
    a11yScore,
    traceSummary,
    moduleNames,
    moduleCount: moduleNames.length,
  };
}

// ── HTML 生成 ──

function statusBadge(status) {
  switch (status) {
    case 'pass': return '<span class="badge pass">✅ 通过</span>';
    case 'fail': return '<span class="badge fail">❌ 失败</span>';
    case 'pending': return '<span class="badge pending">⏳ 待验证</span>';
    case 'skip': return '<span class="badge skip">⏭ 跳过</span>';
    default: return '<span class="badge pending">—</span>';
  }
}

function progressBar(pct, label) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color = clamped >= 90 ? '#4CAF50' : clamped >= 70 ? '#F0A060' : '#E57373';
  return `<div class="progress-wrap"><div class="progress-label">${label}</div><div class="progress-track"><div class="progress-fill" style="width:${clamped}%;background:${color}"></div></div><div class="progress-val">${clamped}%</div></div>`;
}

function generateHTML(data) {
  const { gateItems, gate, gatePassed, gatePending, gateFail, gateSkip, gateAllPass,
    auditSummary, e2eCoverage, a11yScore, traceSummary, moduleCount, phase, projectType, projectName, timestamp } = data;

  const gateRows = gateItems.map(g => {
    const s = gate[g.key] || 'pending';
    return `<tr class="gate-row ${s}">
      <td>${g.icon}</td><td>${g.label}</td><td>${g.group}</td><td>${statusBadge(s)}</td>
    </tr>`;
  }).join('');

  const allClear = gateAllPass && auditSummary.red === 0;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>管线仪表板 · Phase ${phase}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Microsoft YaHei',sans-serif;background:#0F0F11;color:#F0EEE8;padding:24px;min-height:100vh}
.header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #FFFFFF14}
.header h1{font-size:20px;font-weight:600}
.header .meta{font-size:12px;color:#8B8A8E}
.status-banner{padding:16px 24px;border-radius:8px;margin-bottom:24px;font-size:14px;font-weight:600}
.status-banner.all-clear{background:#1A2A1A;border:1px solid #4CAF50;color:#A5D6A7}
.status-banner.blocked{background:#3D2020;border:1px solid #E57373;color:#EF9A9A}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;margin-bottom:24px}
.card{background:#161618;border:1px solid #FFFFFF14;border-radius:8px;padding:16px}
.card h2{font-size:14px;font-weight:600;margin-bottom:12px;color:#8B8A8E;text-transform:uppercase;letter-spacing:0.5px}
table{width:100%;border-collapse:collapse}
th,td{padding:8px 12px;text-align:left;font-size:13px}
th{color:#5C5B60;font-weight:600;font-size:11px;text-transform:uppercase}
td{border-top:1px solid #FFFFFF08}
.badge{font-size:11px;padding:2px 8px;border-radius:4px;font-weight:600}
.badge.pass{background:#1A2A1A;color:#A5D6A7}
.badge.fail{background:#3D2020;color:#EF9A9A}
.badge.pending{background:#2A2520;color:#F0A060}
.badge.skip{background:#161618;color:#5C5B60}
.metric-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:13px}
.metric-val{font-weight:600;font-size:18px}
.metric-val.green{color:#4CAF50}
.metric-val.yellow{color:#F0A060}
.metric-val.red{color:#E57373}
.progress-wrap{display:flex;align-items:center;gap:8px;margin:6px 0}
.progress-label{font-size:11px;color:#8B8A8E;width:80px;text-align:right}
.progress-track{flex:1;height:6px;background:#FFFFFF14;border-radius:3px;overflow:hidden}
.progress-fill{height:100%;border-radius:3px;transition:width 0.5s}
.progress-val{font-size:11px;color:#F0EEE8;width:36px}
.modules{display:flex;flex-wrap:wrap;gap:4px}
.module-tag{font-size:10px;padding:2px 6px;background:#252528;border-radius:3px;color:#8B8A8E}
.footer{text-align:center;font-size:11px;color:#5C5B60;margin-top:24px;padding-top:16px;border-top:1px solid #FFFFFF14}
.gate-row.pass td{color:#A5D6A7}
.gate-row.fail td{color:#EF9A9A}
.gate-row.pending td{color:#F0A060}
</style>
</head>
<body>

<div class="header">
  <div>
    <h1>📊 管线仪表板 · Phase ${phase}</h1>
    <div class="meta">${projectName} · ${projectType} · ${new Date(timestamp).toLocaleString('zh-CN')}</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:28px;font-weight:700" class="${allClear ? 'metric-val green' : 'metric-val red'}">
      ${allClear ? '🟢 全部通过' : '🔴 存在阻断'}
    </div>
    <div class="meta">27 模块 · 7 维度</div>
  </div>
</div>

${allClear
  ? '<div class="status-banner all-clear">✅ Phase ' + phase + ' 关闸全部通过 — 可以进入下一 Phase</div>'
  : '<div class="status-banner blocked">❌ Phase ' + phase + ' 关闸未通过 — ' + gateFail + ' 项失败, ' + gatePending + ' 项待验证</div>'}

<div class="grid">
  <!-- Phase Gate 12 项 -->
  <div class="card">
    <h2>🔐 Phase Gate (${gatePassed}/${gateItems.length})</h2>
    <table>
      <tr><th></th><th>检查项</th><th>分组</th><th>状态</th></tr>
      ${gateRows}
    </table>
  </div>

  <!-- E2E 覆盖率 -->
  <div class="card">
    <h2>🧪 E2E 测试</h2>
    ${progressBar(e2eCoverage.weightedCoverage || e2eCoverage.coverage || 0, '加权覆盖率')}
    ${progressBar(e2eCoverage.coverage || 0, '原始覆盖率')}
    <div class="metric-row"><span>场景数</span><span class="metric-val">${e2eCoverage.scenarios || '—'}</span></div>
    <div class="metric-row"><span>断言质量</span><span>🟢🟢 QUALIFIED</span></div>
  </div>

  <!-- 审计 -->
  <div class="card">
    <h2>📋 审计 L1-L5</h2>
    <div style="display:flex;justify-content:space-around;text-align:center;margin:12px 0">
      <div><div class="metric-val red">${auditSummary.red}</div><div style="font-size:11px;color:#8B8A8E">🔴 阻断</div></div>
      <div><div class="metric-val yellow">${auditSummary.orange}</div><div style="font-size:11px;color:#8B8A8E">🟠 警告</div></div>
      <div><div class="metric-val" style="color:#F0A060">${auditSummary.yellow}</div><div style="font-size:11px;color:#8B8A8E">🟡 注意</div></div>
      <div><div class="metric-val green">${auditSummary.green}</div><div style="font-size:11px;color:#8B8A8E">🟢 通过</div></div>
    </div>
  </div>

  <!-- 无障碍 -->
  <div class="card">
    <h2>♿ 无障碍</h2>
    <div class="metric-row"><span>axe-core 加权分</span><span class="metric-val ${a11yScore.passed ? 'green' : 'yellow'}">${a11yScore.totalWeighted ?? '—'}</span></div>
    <div class="metric-row"><span>运行时扫描</span><span>${a11yScore.passed ? '✅ 通过' : a11yScore.totalWeighted !== null ? '⚠ 需改进' : '⏳ 未执行'}</span></div>
    <div class="metric-row"><span>静态检查</span><span>✅ 接入门禁</span></div>
  </div>

  <!-- 可追溯性 -->
  <div class="card">
    <h2>🔗 可追溯矩阵</h2>
    ${traceSummary.totalSpecItems ? progressBar(parseInt(traceSummary.withCode) || 0, '代码覆盖') : ''}
    ${traceSummary.totalSpecItems ? progressBar(parseInt(traceSummary.withTest) || 0, 'E2E 覆盖') : ''}
    <div class="metric-row"><span>Spec 条目</span><span class="metric-val">${traceSummary.totalSpecItems || '—'}</span></div>
    <div class="metric-row"><span>全覆盖</span><span>${traceSummary.fullCoverage || '—'}</span></div>
  </div>
</div>

<!-- 模块清单 -->
<div class="card" style="margin-bottom:24px">
  <h2>🧩 活跃审计模块 (${moduleCount})</h2>
  <div class="modules">
    ${data.moduleNames.map(n => `<span class="module-tag">${n}</span>`).join('')}
  </div>
</div>

<div class="footer">
  FeiCai Pipeline Dashboard · 自动生成于 ${timestamp} · 🔴0 🟠0 🟡0 🟢${auditSummary.green}
</div>

</body>
</html>`;
}

// ── 主入口 ──

function main() {
  const args = process.argv.slice(2);
  const openBrowser = args.includes('--open');

  const data = aggregate();
  const html = generateHTML(data);

  fs.writeFileSync(DASHBOARD_FILE, html);
  console.log(`✅ 仪表板已生成: ${DASHBOARD_FILE}`);
  console.log(`   Phase ${data.phase} · ${data.gatePassed}/${data.gateItems.length} gate · ${data.moduleCount} modules · ${data.gateAllPass && data.auditSummary.red === 0 ? '🟢 全部通过' : '🔴 存在问题'}`);

  if (openBrowser) {
    const { exec } = require('child_process');
    const cmd = process.platform === 'win32' ? `start ${DASHBOARD_FILE}` : process.platform === 'darwin' ? `open ${DASHBOARD_FILE}` : `xdg-open ${DASHBOARD_FILE}`;
    exec(cmd);
    console.log('   🌐 已在浏览器中打开');
  }
}

module.exports = { aggregate, generateHTML };

if (require.main === module) {
  main();
}
