#!/usr/bin/env node
/**
 * multi-dashboard.js — 多项目聚合仪表板
 *
 * 扫描父目录下所有 FeiCai 项目 → 聚合管线状态 → 生成一览 HTML。
 * 多个产品并行开发时一眼看清全部项目健康度。
 *
 * 用法:
 *   node multi-dashboard.js                          # 扫描当前目录
 *   node multi-dashboard.js --dir ~/projects          # 指定扫描目录
 *   node multi-dashboard.js --projects proj1,proj2    # 指定项目列表
 *
 * 通用性: 检测 .claude/project.config.json → 任何 FeiCai 项目自动识别。
 */

const fs = require('fs');
const path = require('path');

function findProjects(scanDir) {
  const projects = [];
  if (!fs.existsSync(scanDir)) return projects;

  const entries = fs.readdirSync(scanDir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith('.')) continue;
    const configPath = path.join(scanDir, e.name, '.claude', 'project.config.json');
    if (fs.existsSync(configPath)) {
      projects.push(path.join(scanDir, e.name));
    }
  }
  return projects;
}

function readProjectStatus(projectDir) {
  const claudeDir = path.join(projectDir, '.claude');

  let config = {};
  try { config = JSON.parse(fs.readFileSync(path.join(claudeDir, 'project.config.json'), 'utf-8')); } catch (_) {}

  let audit = null;
  try { audit = JSON.parse(fs.readFileSync(path.join(claudeDir, '.audit-report.json'), 'utf-8')); } catch (_) {}

  let gate = {};
  try {
    const gateContent = fs.readFileSync(path.join(claudeDir, '.phase-gate'), 'utf-8');
    for (const line of gateContent.split('\n')) {
      const m = line.match(/^(\w+)=(pass|fail|pending|skip)$/);
      if (m) gate[m[1]] = m[2];
    }
  } catch (_) {}

  let e2e = null;
  try { e2e = JSON.parse(fs.readFileSync(path.join(claudeDir, '.e2e-coverage.json'), 'utf-8')); } catch (_) {}

  const passCount = Object.values(gate).filter(v => v === 'pass').length;
  const totalCount = Object.keys(gate).length || 12;

  let status = 'unknown';
  if (totalCount > 0) {
    if (passCount === totalCount) status = 'pass';
    else if (passCount >= totalCount * 0.8) status = 'warn';
    else status = 'fail';
  }

  return {
    name: path.basename(projectDir),
    type: config.project?.type || 'unknown',
    phase: gate.phase || '?',
    status,
    gatePassed: passCount,
    gateTotal: totalCount,
    auditRed: audit?.summary?.red || 0,
    auditOrange: audit?.summary?.orange || 0,
    e2eCoverage: e2e?.coverage || (e2e?.covered && e2e?.scenarios ? Math.round(e2e.covered / e2e.scenarios * 100) : 0),
    a11yScore: audit?.a11y_check?.find(i => i.check?.includes('ARIA'))?.detail || '?',
  };
}

function generateHTML(projects) {
  const allPass = projects.every(p => p.status === 'pass');
  const totalRed = projects.reduce((s, p) => s + p.auditRed, 0);

  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>FeiCai 多项目仪表板</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Inter,sans-serif;background:#0F0F11;color:#F0EEE8;padding:24px}
h1{font-size:20px;margin-bottom:4px}
.subtitle{font-size:12px;color:#8B8A8E;margin-bottom:24px}
.banner{padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:13px}
.banner.pass{background:#1A2A1A;border:1px solid #4CAF50;color:#A5D6A7}
.banner.fail{background:#3D2020;border:1px solid #E57373;color:#EF9A9A}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.card{background:#161618;border:1px solid #FFFFFF14;border-radius:8px;padding:16px}
.card h2{font-size:16px;margin-bottom:4px}
.card .type{font-size:10px;color:#5C5B60;text-transform:uppercase;margin-bottom:8px}
.card .row{display:flex;justify-content:space-between;font-size:12px;padding:3px 0}
.card .row .label{color:#8B8A8E}
.card .val{font-weight:600}
.val.green{color:#4CAF50}.val.yellow{color:#F0A060}.val.red{color:#E57373}
.status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
.status-dot.pass{background:#4CAF50}.status-dot.warn{background:#F0A060}.status-dot.fail{background:#E57373}
.footer{text-align:center;font-size:11px;color:#5C5B60;margin-top:24px;padding-top:16px;border-top:1px solid #FFFFFF14}
</style></head>
<body>
<h1>📊 FeiCai 多项目仪表板</h1>
<div class="subtitle">${projects.length} 个项目 · ${new Date().toLocaleString('zh-CN')}</div>
<div class="banner ${allPass ? 'pass' : 'fail'}">${allPass ? '✅ 全部项目通过' : `⚠ ${totalRed} 项阻断待修复`}</div>
<div class="grid">
`;

  for (const p of projects) {
    html += `<div class="card">
  <h2><span class="status-dot ${p.status}"></span>${p.name}</h2>
  <div class="type">${p.type} · Phase ${p.phase}</div>
  <div class="row"><span class="label">Gate</span><span class="val ${p.gatePassed === p.gateTotal ? 'green' : (p.gatePassed >= p.gateTotal * 0.8 ? 'yellow' : 'red')}">${p.gatePassed}/${p.gateTotal}</span></div>
  <div class="row"><span class="label">审计</span><span class="val ${p.auditRed > 0 ? 'red' : 'green'}">🔴${p.auditRed} 🟠${p.auditOrange}</span></div>
  <div class="row"><span class="label">E2E</span><span class="val ${p.e2eCoverage >= 80 ? 'green' : 'yellow'}">${p.e2eCoverage}%</span></div>
</div>`;
  }

  html += `</div><div class="footer">FeiCai Multi-Project Dashboard · 自动生成</div></body></html>`;
  return html;
}

function main() {
  const args = process.argv.slice(2);
  const dirIdx = args.indexOf('--dir');
  const projectsIdx = args.indexOf('--projects');
  let projectDirs = [];

  if (projectsIdx >= 0) {
    projectDirs = args[projectsIdx + 1].split(',').map(p => path.resolve(p.trim()));
  } else {
    const scanDir = dirIdx >= 0 ? path.resolve(args[dirIdx + 1]) : process.cwd();
    projectDirs = findProjects(scanDir);
    console.log(`🔍 扫描 ${scanDir}: 发现 ${projectDirs.length} 个 FeiCai 项目`);
  }

  const projects = projectDirs.map(readProjectStatus).filter(p => p.name);
  const html = generateHTML(projects);

  const outPath = path.join(process.cwd(), '.claude', 'multi-dashboard.html');
  fs.writeFileSync(outPath, html);
  console.log(`✅ 多项目仪表板: ${outPath} (${projects.length} 个项目)`);
}

module.exports = { findProjects, readProjectStatus, generateHTML };

if (require.main === module) {
  main();
}
