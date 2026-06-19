#!/usr/bin/env node
/**
 * B2: Pre-commit 审计门禁（含 Design Token + 设计数据新鲜度检查）
 *
 * git commit 前自动运行。🔴>0 → 阻止提交并展示问题。
 * 跨平台 Node.js 实现，不依赖 bash。
 *
 * 检查层级:
 *   L0-design: Design Token 强制 + 设计数据新鲜度（新增，先于审计管线执行）
 *   L1-L5:      五层交叉审计（audit-pipeline.js）
 *
 * 用法（由 settings.json hook 自动触发）:
 *   node .claude/hooks/pre-commit-audit.js
 *
 * 退出码: 0 = 通过（允许提交） | 1 = 阻断（🔴>0）
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const REPORT_FILE = path.join(PROJECT_ROOT, '.claude', '.audit-report.json');
const PIPELINE = path.join(PROJECT_ROOT, '.claude', 'audit-runner', 'audit-pipeline.js');

// ── L0-Design 检查 ──

function checkDesignTokens() {
  const tokenGen = path.join(PROJECT_ROOT, '.claude', 'audit-runner', 'modules', 'token-gen.js');
  if (!fs.existsSync(tokenGen)) return { ok: true, violations: [] };

  try {
    execSync(`node "${tokenGen}" --check`, {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      timeout: 30000,
    });
    return { ok: true, violations: [] };
  } catch (e) {
    const stderr = e.stderr?.toString() || '';
    const violations = stderr.split('\n').filter(l => l.includes('应使用')).map(l => l.trim());
    return { ok: false, violations };
  }
}

function checkDesignFreshness() {
  const penFiles = fs.readdirSync(PROJECT_ROOT).filter(f => f.endsWith('.pen') && !f.startsWith('.'));
  const layoutValues = path.join(PROJECT_ROOT, '.claude', '.pen-layout-values.json');

  if (penFiles.length === 0) return { ok: true, stale: false };
  if (!fs.existsSync(layoutValues)) return { ok: false, stale: true, msg: '.pen-layout-values.json 不存在' };

  const penMtime = fs.statSync(path.join(PROJECT_ROOT, penFiles[0])).mtimeMs;
  const layoutMtime = fs.statSync(layoutValues).mtimeMs;

  if (penMtime > layoutMtime) {
    // 标记需要提取
    fs.writeFileSync(path.join(PROJECT_ROOT, '.claude', '.needs-pen-extract'), 'true');
    return { ok: false, stale: true, msg: '.pen 已更新但 .pen-layout-values.json 未同步' };
  }

  return { ok: true, stale: false };
}

function main() {
  let hasBlockingError = false;

  // ── 阶段 0: Design Token 强制 ──
  console.log('🔍 L0-Design: Token 强制检查...');
  const tokenResult = checkDesignTokens();
  if (!tokenResult.ok) {
    console.log(`  ❌ ${tokenResult.violations.length} 处硬编码颜色/间距`);
    for (const v of tokenResult.violations.slice(0, 5)) {
      console.log(`     ${v}`);
    }
    if (tokenResult.violations.length > 5) console.log(`     ... 还有 ${tokenResult.violations.length - 5} 处`);
    console.log('  💡 修复: node .claude/audit-runner/modules/token-gen.js --fix');
    hasBlockingError = true;
  } else {
    console.log('  ✅ 通过');
  }

  // ── 阶段 0: 设计数据新鲜度 ──
  const designCheck = checkDesignFreshness();
  if (!designCheck.ok) {
    console.log(`  ${designCheck.stale ? '🔴' : '⚠'} ${designCheck.msg}`);
    if (designCheck.stale) {
      console.log('  💡 修复: 在 Claude Code 中请求 Agent "同步设计数据"');
      console.log('     或运行: node .claude/audit-runner/modules/pen-sync.js --force');
      hasBlockingError = true;  // .pen 过期 → 阻断 commit
    }
  }

  // ── 阶段 1: 审计管线 ──
  console.log('\n🔍 L1-L5: 审计管线...');
  try {
    execSync(`node "${PIPELINE}" --json --ci`, {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      timeout: 60000,
    });
  } catch (e) {
    // 管线退出码 !0 是正常的（有 🔴 时退出 1）。继续读报告。
  }

  // 读报告
  let report;
  try {
    report = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf-8'));
  } catch (_) {
    if (hasBlockingError) process.exit(1);
    console.log('⚠ 审计报告不可读，跳过 L1-L5 检查。');
    process.exit(0);
  }

  // 综合判定
  const { red, orange, yellow } = report.summary;

  if (red === 0 && orange === 0 && !hasBlockingError) {
    console.log(`✅ Pre-commit 审计通过 (🟡${yellow} 🟢${report.summary.green})`);
    process.exit(0);
  }

  // 阻断——展示具体问题
  if (hasBlockingError) console.log('\n❌ Pre-commit: Design Token 检查未通过');
  console.log('❌ Pre-commit 审计未通过:');
  console.log(`   🔴 ${red}   🟠 ${orange}   🟡 ${yellow}\n`);

  // 列出所有 🔴
  const redItems = [];
  const allArrays = [
    ...(report.d1_traceability || []),
    ...(report.d2_cross_doc || []),
    ...(report.d3_completeness || []),
    ...(report.d5_concurrency || []),
    ...(report.visual_L5_L2 || []),
    ...(report.reverse_visual || []),
    ...(report.ipc_bridge || []),
    ...(report.secure_storage || []),
    ...(report.component_imports || []),
    ...(report.cross_phase || []),
  ];

  // D4 缺失文件
  if (report.d4_references?.details) {
    for (const d of report.d4_references.details) {
      if (!d.exists) redItems.push(`❌ 文件缺失: ${d.file} (DEV-PLAN L${d.planLine}, Phase ${d.phase || '?'})`);
    }
  }

  for (const r of allArrays) {
    if (r.status === '🔴' || r.status === '❌') {
      if (r.file) redItems.push(`🔴 ${r.file}: ${r.label || r.issue || ''}`);
      else if (r.label) redItems.push(`🔴 [${r.label}] ${r.text || ''}`);
      else if (r.channel) redItems.push(`🔴 IPC ${r.channel}: ${r.issue}`);
      else if (r.check) redItems.push(`🔴 ${r.check}`);
    }
  }

  // 限制输出
  const show = redItems.slice(0, 15);
  for (const item of show) console.log(`   ${item}`);
  if (redItems.length > 15) console.log(`   ... 还有 ${redItems.length - 15} 项`);

  console.log('\n💡 修复所有 🔴 后重新 commit。');
  console.log('   运行 node .claude/audit-runner/audit-pipeline.js 查看完整报告。');
  console.log('   紧急情况: git commit --no-verify 跳过检查。\n');

  process.exit(1);
}

main();
