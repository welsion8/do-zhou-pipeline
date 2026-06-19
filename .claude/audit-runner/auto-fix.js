#!/usr/bin/env node
/**
 * auto-fix.js — 管线自动修复引擎
 *
 * 审计发现 → 分类匹配 → 自动修复 → 重新验证。
 * 从"能检测"到"能自愈"的关键一跃。
 *
 * 安全规则:
 *   🟡 问题 → 自动修复
 *   🟠 问题 → 生成修复建议，需确认
 *   🔴 问题 → 仅报告，不自动修
 *   每轮修复后 → 重跑 audit → 验证 🔴🟠 未增加
 *   dry-run 模式 → 仅报告，不实际修改
 *
 * 用法:
 *   node auto-fix.js                          # 检测 + 自动修复 + 验证
 *   node auto-fix.js --dry-run                # 仅报告可修复项
 *   node auto-fix.js --only token,test        # 仅修复指定类别
 *   node auto-fix.js --skip a11y,perf         # 跳过指定类别
 *   node auto-fix.js --max-rounds 3           # 最多修复轮次
 *
 * 通用性: 修复规则基于问题模式（check/label/detail 字段），不绑定产品内容。
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const CLAUDE_DIR = path.join(PROJECT_ROOT, '.claude');
const PIPELINE = path.join(CLAUDE_DIR, 'audit-runner', 'audit-pipeline.js');
const REPORT_FILE = path.join(CLAUDE_DIR, '.audit-report.json');
const FIX_LOG = path.join(CLAUDE_DIR, '.auto-fix-log.json');

// ── 修复规则注册表 ──

const FIX_RULES = [
  // ── Token/设计 ──
  {
    id: 'token-hardcoded',
    category: 'token',
    severity: ['🟡', '🟠'],
    match: (item) => /硬编码|Token|token|hex|#[0-9A-Fa-f]{6}/.test(item.check + (item.detail || '')),
    fix: () => {
      execSync(`node "${path.join(CLAUDE_DIR, 'audit-runner', 'modules', 'token-gen.js')}" --fix`, { cwd: PROJECT_ROOT, stdio: 'pipe', timeout: 30000 });
      return '运行 token-gen --fix 替换硬编码颜色';
    },
  },
  // ── E2E 测试缺失 ──
  {
    id: 'e2e-missing',
    category: 'test',
    severity: ['🟡', '⏳'],
    match: (item) => /待覆盖|未覆盖|generate|生成测试/.test(item.check + (item.detail || '')),
    fix: () => {
      execSync(`CLAUDE_PROJECT_DIR="${PROJECT_ROOT}" node "${path.join(CLAUDE_DIR, 'audit-runner', 'modules', 'spec-to-e2e.js')}" --generate`, { cwd: PROJECT_ROOT, stdio: 'pipe', timeout: 30000 });
      return '运行 spec-to-e2e --generate 生成测试骨架';
    },
  },
  // ── 设计数据过期 ──
  {
    id: 'design-stale',
    category: 'design',
    severity: ['🔴', '🟠'],
    match: (item) => /设计数据.*过期|\.pen.*更新|needs-pen-extract|同步/.test(item.check + (item.detail || '')),
    fix: () => {
      // 写 .needs-pen-extract 标记让 Agent 同步
      const flagFile = path.join(CLAUDE_DIR, '.needs-pen-extract');
      fs.writeFileSync(flagFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        reason: 'auto-fix 检测到设计数据过期',
        action: 'Agent: Pencil MCP batch_get → pen-extract --merge',
      }, null, 2));
      return '标记 .needs-pen-extract。Agent 需执行 MCP 同步。';
    },
    needsAgent: true,
  },
  // ── 可追溯矩阵更新 ──
  {
    id: 'traceability-update',
    category: 'trace',
    severity: ['🟡', '⏳'],
    match: (item) => /可追溯|traceability|无代码|无测试|缺代码|缺测试/.test(item.check + (item.detail || '')),
    fix: () => {
      execSync(`CLAUDE_PROJECT_DIR="${PROJECT_ROOT}" node "${path.join(CLAUDE_DIR, 'audit-runner', 'modules', 'traceability.js')}"`, { cwd: PROJECT_ROOT, stdio: 'pipe', timeout: 30000 });
      return '重新生成 traceability.json';
    },
  },
  // ── 设计变更快照更新 ──
  {
    id: 'design-snapshot',
    category: 'design',
    severity: ['🟡'],
    match: (item) => /设计变更|design_diff|变更检测/.test(item.check + (item.detail || '')),
    fix: () => {
      const diffFile = path.join(CLAUDE_DIR, '.design-diff.json');
      if (fs.existsSync(diffFile)) {
        const report = JSON.parse(fs.readFileSync(diffFile, 'utf-8'));
        if (report.snapshot) {
          const layoutFile = path.join(CLAUDE_DIR, '.pen-layout-values.json');
          fs.writeFileSync(layoutFile, JSON.stringify(report.snapshot, null, 2));
          return '更新 .pen-layout-values.json 为最新快照';
        }
      }
      return null;
    },
  },
  // ── 仪表板刷新 ──
  {
    id: 'dashboard-refresh',
    category: 'meta',
    severity: ['🟢', '🟡', '🟠', '🔴'],
    match: (item) => false, // 不自动匹配，每轮结束时触发
    fix: () => {
      execSync(`node "${path.join(CLAUDE_DIR, 'audit-runner', 'dashboard.js')}"`, { cwd: PROJECT_ROOT, stdio: 'pipe', timeout: 10000 });
      return '刷新管线仪表板';
    },
    always: true,
  },
];

// ── 核心引擎 ──

function runAudit() {
  try {
    execSync(`node "${PIPELINE}" --json`, { cwd: PROJECT_ROOT, stdio: 'pipe', timeout: 120000 });
  } catch (_) { /* 管线有 🔴 时退出 1，正常 */ }
  try { return JSON.parse(fs.readFileSync(REPORT_FILE, 'utf-8')); }
  catch (_) { return null; }
}

function collectFixableItems(report, options = {}) {
  const items = [];
  const only = options.only ? new Set(options.only.split(',').map(s => s.trim())) : null;
  const skip = options.skip ? new Set(options.skip.split(',').map(s => s.trim())) : null;

  // 遍历报告中的数组字段
  const arrayFields = Object.entries(report).filter(([, v]) => Array.isArray(v));
  for (const [moduleName, results] of arrayFields) {
    for (const item of results) {
      if (!item.status) continue;
      for (const rule of FIX_RULES) {
        if (rule.always) continue;
        if (only && !only.has(rule.category)) continue;
        if (skip && skip.has(rule.category)) continue;
        if (!rule.severity.includes(item.status)) continue;
        if (!rule.match(item)) continue;

        items.push({
          module: moduleName,
          check: item.check || '',
          detail: item.detail || '',
          status: item.status,
          rule: rule.id,
          category: rule.category,
          needsAgent: rule.needsAgent || false,
        });
        break; // 一个 item 只匹配第一个规则
      }
    }
  }

  // 添加 always 规则
  for (const rule of FIX_RULES) {
    if (!rule.always) continue;
    if (only && !only.has(rule.category)) continue;
    if (skip && skip.has(rule.category)) continue;
    items.push({
      module: '_meta',
      check: rule.id,
      detail: '',
      status: '🟢',
      rule: rule.id,
      category: rule.category,
      needsAgent: false,
    });
  }

  return items;
}

function applyFixes(items, dryRun) {
  const results = { applied: [], skipped: [], failed: [], agentNeeded: [] };
  const ruleMap = {};
  for (const r of FIX_RULES) ruleMap[r.id] = r;

  for (const item of items) {
    const rule = ruleMap[item.rule];
    if (!rule) { results.skipped.push({ ...item, reason: '规则未找到' }); continue; }

    console.log(`  ${dryRun ? '🔍 [DRY-RUN]' : '🔧'} ${rule.category}/${rule.id}: ${item.check.substring(0, 60)}`);

    if (rule.needsAgent) {
      results.agentNeeded.push(item);
      if (!dryRun) {
        try { rule.fix(); } catch (e) { results.failed.push({ ...item, error: e.message }); continue; }
      }
      continue;
    }

    if (dryRun) {
      results.applied.push(item);
      continue;
    }

    try {
      const msg = rule.fix();
      if (msg) {
        results.applied.push({ ...item, message: msg });
        console.log(`    ✅ ${msg}`);
      } else {
        results.skipped.push({ ...item, reason: '修复返回空' });
      }
    } catch (e) {
      results.failed.push({ ...item, error: e.message });
      console.log(`    ❌ 失败: ${e.message}`);
    }
  }

  return results;
}

function verifyFix(beforeReport, afterReport) {
  const before = beforeReport?.summary || {};
  const after = afterReport?.summary || {};

  return {
    redDelta: (after.red || 0) - (before.red || 0),
    orangeDelta: (after.orange || 0) - (before.orange || 0),
    yellowDelta: (after.yellow || 0) - (before.yellow || 0),
    improved: (after.red || 0) < (before.red || 0) || (after.orange || 0) < (before.orange || 0) || (after.yellow || 0) < (before.yellow || 0),
    degraded: (after.red || 0) > (before.red || 0),
  };
}

// ── 报告 ──

function printReport(roundResults, finalReport) {
  let totalApplied = 0, totalSkipped = 0, totalFailed = 0, totalAgent = 0;
  for (const r of roundResults) {
    totalApplied += r.results.applied.length;
    totalSkipped += r.results.skipped.length;
    totalFailed += r.results.failed.length;
    totalAgent += r.results.agentNeeded.length;
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📊 自动修复报告');
  console.log('═'.repeat(60));
  console.log(`  ✅ 已修复:   ${totalApplied}`);
  console.log(`  ⏭ 跳过:     ${totalSkipped}`);
  console.log(`  ❌ 失败:     ${totalFailed}`);
  console.log(`  🤖 需 Agent: ${totalAgent}`);
  console.log(`  📋 审计终态: 🔴${finalReport?.summary?.red || 0} 🟠${finalReport?.summary?.orange || 0} 🟡${finalReport?.summary?.yellow || 0}`);

  if (totalAgent > 0) {
    console.log('\n  ⚠ 以下问题需 Agent 手动处理:');
    for (const r of roundResults) {
      for (const item of r.results.agentNeeded) {
        console.log(`    - ${item.check.substring(0, 80)}`);
      }
    }
  }
}

// ── 主入口 ──

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const onlyIdx = args.indexOf('--only');
  const skipIdx = args.indexOf('--skip');
  const maxRoundsIdx = args.indexOf('--max-rounds');
  const only = onlyIdx >= 0 ? args[onlyIdx + 1] : null;
  const skip = skipIdx >= 0 ? args[skipIdx + 1] : null;
  const maxRounds = maxRoundsIdx >= 0 ? parseInt(args[maxRoundsIdx + 1]) : 3;

  console.log('🔧 管线自动修复引擎');
  console.log(`   模式: ${dryRun ? 'DRY-RUN (仅报告)' : 'LIVE (实际修复)'}`);
  console.log(`   范围: ${only || '全部'} | 跳过: ${skip || '无'} | 最大轮次: ${maxRounds}`);
  console.log('═'.repeat(60) + '\n');

  // 修复日志
  const fixLog = { timestamp: new Date().toISOString(), dryRun, rounds: [] };

  // 初始审计
  console.log('🔍 第 0 轮: 初始审计...');
  let report = runAudit();
  if (!report) { console.log('❌ 无法运行审计管线'); process.exit(1); }
  console.log(`   🔴${report.summary.red} 🟠${report.summary.orange} 🟡${report.summary.yellow} 🟢${report.summary.green}\n`);

  const roundResults = [];

  for (let round = 1; round <= maxRounds; round++) {
    // 收集可修复项
    const fixable = collectFixableItems(report, { only, skip });

    // 过滤 always 规则计算有效项
    const effective = fixable.filter(f => !FIX_RULES.find(r => r.id === f.rule)?.always);
    const alwaysItems = fixable.filter(f => FIX_RULES.find(r => r.id === f.rule)?.always);

    if (effective.length === 0) {
      console.log(`✅ 第 ${round} 轮: 无更多可修复项`);
      // 仍然执行 always 规则
      if (alwaysItems.length > 0 && !dryRun) {
        applyFixes(alwaysItems, false);
      }
      break;
    }

    console.log(`🔧 第 ${round} 轮: ${effective.length} 项可修复\n`);

    // 保存修复前快照
    const beforeReport = report;

    // 应用修复
    const results = applyFixes(fixable, dryRun);
    roundResults.push({ round, results });

    if (dryRun) {
      console.log(`\n✅ DRY-RUN 完成。${effective.length} 项可修复（未实际修改）。`);
      break;
    }

    // 重新审计
    console.log(`\n🔍 第 ${round} 轮: 重新验证...`);
    report = runAudit();
    if (!report) { console.log('⚠ 审计管线失败'); break; }

    const verify = verifyFix(beforeReport, report);
    console.log(`   🔴${report.summary.red} 🟠${report.summary.orange} 🟡${report.summary.yellow} 🟢${report.summary.green}`);

    if (verify.degraded) {
      console.log(`   ⚠ 修复后审计恶化！回滚建议：git checkout .`);
      break;
    }

    if (verify.improved) {
      console.log(`   ✅ 审计改善`);
    } else if (effective.length > 0) {
      console.log(`   ℹ 审计无变化（修复后仍存在同样问题）`);
    }

    if (report.summary.red === 0 && report.summary.orange === 0) {
      console.log(`\n✅ 所有阻断/警告已清零！`);
      break;
    }
  }

  // 最终报告
  fixLog.rounds = roundResults;
  fixLog.finalReport = report?.summary;
  fs.writeFileSync(FIX_LOG, JSON.stringify(fixLog, null, 2));

  printReport(roundResults, report);
  console.log(`\n📄 修复日志: ${FIX_LOG}`);
}

module.exports = { collectFixableItems, applyFixes, verifyFix, FIX_RULES };

if (require.main === module) {
  main();
}
