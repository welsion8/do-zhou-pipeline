#!/usr/bin/env node
/**
 * Stop Gate — Node.js 跨平台版本
 * 替代 stop-gate.sh，不依赖 bash。Windows/Linux/macOS 均可用。
 *
 * 检查两层:
 *   1. .needs-review — 代码修改后是否已 review
 *   2. .phase-gate — Phase 12 项关闸是否全部 pass/skip
 *
 * 输出: JSON decision (block/allow) + reason
 * Exit code: 0 = decision made, read stdout for JSON
 */

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const REVIEW_FILE = path.join(PROJECT_DIR, '.claude', '.needs-review');
const GATE_FILE = path.join(PROJECT_DIR, '.claude', '.phase-gate');

function block(reason) {
  console.log(JSON.stringify({ decision: 'block', reason }));
  process.exit(0);
}

// ── 第一层: 代码审查 ──
if (fs.existsSync(REVIEW_FILE)) {
  const state = fs.readFileSync(REVIEW_FILE, 'utf-8').trim();
  if (state === 'needs_review') {
    block('代码已修改但未进行 code review。请派发 code-reviewer sub-agent 进行审查。');
  }
  if (state === 'clean') {
    fs.unlinkSync(REVIEW_FILE);
  }
}

// ── 第二层: Phase 关闸 ──
if (!fs.existsSync(GATE_FILE)) {
  // 未初始化 → 放行
  process.exit(0);
}

const content = fs.readFileSync(GATE_FILE, 'utf-8');
const lines = content.split('\n');

const LABELS = {
  tsc_check: '编译验证 (tsc --noEmit)',
  lint_check: 'Lint 检查 (ESLint)',
  test_check: '测试 (vitest)',
  security_scan: '安全扫描 (npm audit + 密钥检查)',
  runtime_check: '运行时验证 (启动应用 + 检查控制台无报错 + UI 可见)',
  design_read_check: '设计帧读取 (已通过 MCP 读取本 Phase 所有对应设计帧)',
  code_review: '代码审查 (code-review)',
  audit_L1: '需求层审计 (L1)',
  audit_L2: '设计层审计 (L2)',
  audit_L3: '设计稿审计 (L3)',
  audit_L4: 'Skill层审计 (L4)',
  audit_L5: '代码层审计 (L5)',
};

const missing = [];
const failed = [];

for (const line of lines) {
  const m = line.match(/^(\w+)=(pending|fail|skip|pass)$/);
  if (!m) continue;
  const [, name, status] = m;
  if (status === 'pending') {
    missing.push(LABELS[name] || name);
  } else if (status === 'fail') {
    failed.push(LABELS[name] || name);
  }
}

if (missing.length === 0 && failed.length === 0) {
  // 全部 pass/skip → 放行
  process.exit(0);
}

const phase = (content.match(/^phase=(\d+)/m) || [])[1] || '?';
let reason = `Phase ${phase} 关闸未通过:\n`;
for (const f of failed) reason += `  ❌ ${f} (失败需修复)\n`;
for (const m of missing) reason += `  ⏳ ${m} (未完成)\n`;
reason += '\n请完成所有检查后重试。';

block(reason);
