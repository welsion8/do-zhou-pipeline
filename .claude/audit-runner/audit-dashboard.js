#!/usr/bin/env node
/**
 * Audit Dashboard — 审计趋势看板
 *
 * 读取 audit-reports/ 归档，生成质量趋势分析。
 *
 * 用法:
 *   node audit-dashboard.js           # 终端看板
 *   node audit-dashboard.js --json    # JSON 输出（供 CI/外部消费）
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const ARCHIVE_DIR = path.join(PROJECT_ROOT, '.claude', 'audit-reports');
const JSON_ONLY = process.argv.includes('--json');

function readArchives() {
  if (!fs.existsSync(ARCHIVE_DIR)) return [];
  const files = fs.readdirSync(ARCHIVE_DIR).filter(f => f.endsWith('.json')).sort();
  return files.map(f => {
    try { return JSON.parse(fs.readFileSync(path.join(ARCHIVE_DIR, f), 'utf-8')); }
    catch (_) { return null; }
  }).filter(Boolean);
}

function analyze(archives) {
  if (archives.length === 0) return { trend: 'no_data', insights: [] };

  // ── 1. 🔴 趋势 ──
  const reds = archives.map((a, i) => ({ index: i, time: a.timestamp, red: a.summary.red, yellow: a.summary.yellow, green: a.summary.green, phase: a.phase }));
  const firstRed = reds[0].red;
  const lastRed = reds[reds.length - 1].red;
  const trend = lastRed < firstRed ? 'converging' : lastRed > firstRed ? 'diverging' : 'stable';

  // 移动平均（窗口=3）
  const movingAvg = [];
  for (let i = 0; i < reds.length; i++) {
    const slice = reds.slice(Math.max(0, i - 2), i + 1);
    movingAvg.push({ time: reds[i].time, avg: Math.round(slice.reduce((s, r) => s + r.red, 0) / slice.length) });
  }

  // ── 2. 模块健康度 ──
  const checkModules = ['d1_traceability', 'd2_cross_doc', 'd3_completeness', 'd4_references', 'd5_concurrency', 'visual_L5_L2', 'ipc_bridge', 'secure_storage', 'component_imports', 'reverse_visual', 'cross_phase'];
  const moduleStats = {};
  for (const mod of checkModules) {
    let totalReds = 0, totalYellows = 0, totalItems = 0, appearances = 0;
    for (const a of archives) {
      const data = a[mod];
      if (!data) continue;
      let items = [];
      if (Array.isArray(data)) items = data;
      else if (data.details) items = data.details;

      if (items.length > 0) appearances++;
      totalItems += items.length;
      for (const item of items) {
        if (item.status === '🔴' || item.status === '❌') totalReds++;
        if (item.status === '🟡' || item.status === '⏳') totalYellows++;
      }
    }
    const hitRate = appearances > 0 ? Math.round(totalReds / Math.max(1, totalItems) * 100) : 0;
    moduleStats[mod] = { totalReds, totalYellows, totalItems, appearances, hitRate };
  }

  // ── 3. Phase 进度健康 ──
  const phaseMap = {};
  for (const a of archives) {
    const p = a.phase || '?';
    if (!phaseMap[p]) phaseMap[p] = { reds: [], yellows: [], count: 0 };
    phaseMap[p].reds.push(a.summary.red);
    phaseMap[p].yellows.push(a.summary.yellow);
    phaseMap[p].count++;
  }

  // ── 4. 洞察 ──
  const insights = [];
  if (trend === 'converging') insights.push('✅ 🔴 数量在收敛 — 质量在改善');
  if (trend === 'diverging') insights.push('⚠ 🔴 数量在发散 — 需要关注质量退化');
  if (trend === 'stable' && lastRed > 10) insights.push('🟡 🔴 数量稳定但偏高 — 建议逐条审核是否为假阳性');

  const noisyModules = Object.entries(moduleStats)
    .filter(([, s]) => s.appearances >= 2 && s.hitRate > 80)
    .map(([name]) => name);
  if (noisyModules.length > 0) {
    insights.push(`🔧 高误报模块: ${noisyModules.map(m => m.replace(/_/g, ' ')).join(', ')} — 命中率 >80%，建议优化检查逻辑`);
  }

  const quietModules = Object.entries(moduleStats)
    .filter(([, s]) => s.appearances >= 2 && s.totalItems === 0)
    .map(([name]) => name);
  if (quietModules.length > 0) {
    insights.push(`💤 静默模块: ${quietModules.map(m => m.replace(/_/g, ' ')).join(', ')} — 从未产出结果，确认是否应禁用`);
  }

  return { trend, reds, movingAvg, moduleStats, phaseMap, insights };
}

function render(analysis) {
  if (JSON_ONLY) { console.log(JSON.stringify(analysis, null, 2)); return; }

  const { trend, reds, movingAvg, moduleStats, phaseMap, insights } = analysis;

  console.log('╔══════════════════════════════════════════╗');
  console.log('║   Audit Dashboard — 审计趋势看板          ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // ── 🔴 趋势 ──
  console.log('━━━ 🔴 趋势 ━━━');
  const trendEmoji = trend === 'converging' ? '✅' : trend === 'diverging' ? '⚠' : '➡';
  console.log(`状态: ${trendEmoji} ${trend}  |  首: 🔴${reds[0].red}  →  末: 🔴${reds[reds.length - 1].red}  |  ${reds.length} 次审计\n`);

  // 简易 ASCII 趋势图
  const maxRed = Math.max(...reds.map(r => r.red), 1);
  const width = 30;
  for (const r of reds) {
    const bar = '█'.repeat(Math.round(r.red / maxRed * width));
    const label = `🔴${r.red}`.padEnd(5);
    const phase = r.phase ? `P${r.phase}` : '?';
    console.log(`  ${phase.padEnd(3)} ${label} ${bar}`);
  }

  // 移动平均
  if (movingAvg.length >= 3) {
    const ma = movingAvg.map(m => m.avg);
    console.log(`\n  移动平均: ${ma.join(' → ')}  ${ma[ma.length - 1] <= ma[0] ? '✅ 收敛中' : '⚠ 扩散中'}`);
  }

  // ── 模块健康度 ──
  console.log('\n━━━ 模块健康度 ━━━');
  console.log('模块                 命中%   🔴    🟡    总计  出现');
  console.log('──────────────────────────────────────────────────');
  const sortedMods = Object.entries(moduleStats).sort((a, b) => b[1].hitRate - a[1].hitRate);
  for (const [name, s] of sortedMods) {
    const pct = `${s.hitRate}%`.padEnd(6);
    const label = name.replace(/_/g, ' ').substring(0, 20).padEnd(21);
    const flag = s.hitRate > 80 ? '⚠' : s.totalItems === 0 ? '💤' : '  ';
    console.log(`${flag} ${label} ${pct} ${String(s.totalReds).padEnd(5)} ${String(s.totalYellows).padEnd(5)} ${String(s.totalItems).padEnd(6)} ${s.appearances}`);
  }

  // ── 洞察 ──
  console.log('\n━━━ 💡 洞察 ━━━');
  for (const ins of insights) console.log(`  ${ins}`);
  if (insights.length === 0) console.log('  ✅ 无特别关注项');

  // ── 底部 ──
  console.log(`\n📁 数据来源: ${reds.length} 个归档  |  ${new Date(reds[reds.length - 1].time).toLocaleString()} 最后更新`);
}

// ── 主流程 ──
const archives = readArchives();
if (archives.length === 0) {
  console.log('⚠ 无审计归档数据。运行 audit-pipeline.js --apply 会生成归档。');
  process.exit(0);
}
const analysis = analyze(archives);
render(analysis);
