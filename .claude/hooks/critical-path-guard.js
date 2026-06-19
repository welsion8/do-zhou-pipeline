#!/usr/bin/env node
/**
 * critical-path-guard.js — 关键路径强制审查门禁
 *
 * 单人团队替代"双人 CR"的方案。
 * 破坏性文件变更 → 自动标记 → 强制双审 → 才放行。
 *
 * 关键路径定义:
 *   engine/   → AI 引擎（Claude/Universal）— 影响所有 AI 行为
 *   bridge/   → IPC 桥接（contextBridge/preload）— 影响安全边界
 *   ipc/      → IPC 通道注册 — 影响进程通信
 *   storage/  → 文件系统/加密存储 — 影响数据安全
 *   services/ → 核心服务（backup/session）— 影响数据完整性
 *
 * 触发条件:
 *   git diff → 关键路径文件有变更
 *   → 写 .needs-critical-review 标记
 *   → Phase gate 检查: 存在此标记 → code_review 不得 pass
 *   → Agent 执行双审通过后 → mark-gate-item.sh code_review pass
 *
 * 用法:
 *   node critical-path-guard.js             # 检查当前变更
 *   node critical-path-guard.js --base HEAD~1  # 对比指定 commit
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const MARKER_FILE = path.join(PROJECT_ROOT, '.claude', '.needs-critical-review');

const CRITICAL_PATHS = [
  { path: 'src/main/engine/',    label: 'AI 引擎',         risk: 'critical' },
  { path: 'src/main/ipc/',       label: 'IPC 通道',        risk: 'critical' },
  { path: 'src/main/services/',  label: '核心服务',         risk: 'critical' },
  { path: 'src/preload/',        label: '预加载桥接',       risk: 'critical' },
  { path: 'src/main/storage/',   label: '安全存储',         risk: 'high' },
  { path: 'src/common/security/',label: '安全模块',         risk: 'high' },
];

function isGitRepo() {
  try { execSync('git rev-parse --git-dir', { cwd: PROJECT_ROOT, stdio: 'pipe', timeout: 5000 }); return true; }
  catch (_) { return false; }
}

function getChangedFiles(baseRef) {
  if (!isGitRepo()) return [];
  try {
    const base = baseRef || 'HEAD~1';
    const output = execSync(`git diff --name-only ${base} HEAD`, {
      cwd: PROJECT_ROOT, stdio: 'pipe', timeout: 10000
    }).toString().trim();
    return output.split('\n').filter(Boolean);
  } catch (_) {
    // 首次提交，对比空树
    try {
      const output = execSync('git diff --name-only HEAD', {
        cwd: PROJECT_ROOT, stdio: 'pipe', timeout: 10000
      }).toString().trim();
      return output.split('\n').filter(Boolean);
    } catch (_2) { return []; }
  }
}

function checkCriticalChanges(baseRef) {
  const changed = getChangedFiles(baseRef);
  const hits = [];

  for (const file of changed) {
    for (const cp of CRITICAL_PATHS) {
      if (file.includes(cp.path)) {
        hits.push({ file, label: cp.label, risk: cp.risk });
      }
    }
  }

  return { changed, hits };
}

function main() {
  const args = process.argv.slice(2);
  const baseIdx = args.indexOf('--base');
  const baseRef = baseIdx >= 0 ? args[baseIdx + 1] : null;

  const { changed, hits } = checkCriticalChanges(baseRef);

  if (hits.length === 0) {
    // 无关键变更 → 清除标记
    if (fs.existsSync(MARKER_FILE)) {
      fs.unlinkSync(MARKER_FILE);
    }
    console.log('✅ 无关键路径变更。');
    process.exit(0);
  }

  // 有关键变更 → 写标记
  const criticalHits = hits.filter(h => h.risk === 'critical');
  const highHits = hits.filter(h => h.risk === 'high');

  const marker = {
    timestamp: new Date().toISOString(),
    totalChanged: changed.length,
    criticalChanges: hits.length,
    criticalCount: criticalHits.length,
    highCount: highHits.length,
    hits: hits.map(h => ({ file: h.file, label: h.label, risk: h.risk })),
    required: 'Agent 双审（标准+严格模式）+ 审查通过后 mark-gate-item.sh code_review pass',
  };

  fs.writeFileSync(MARKER_FILE, JSON.stringify(marker, null, 2));

  console.log(`🔴 关键路径变更: ${criticalHits.length} critical + ${highHits.length} high`);
  for (const h of hits) {
    console.log(`   [${h.risk}] ${h.label}: ${h.file}`);
  }
  console.log(`\n⚠ code_review 已锁定。完成双审后执行:`);
  console.log(`   bash .claude/hooks/mark-gate-item.sh code_review pass`);

  process.exit(criticalHits.length > 0 ? 1 : 0);
}

module.exports = { checkCriticalChanges, CRITICAL_PATHS, isGitRepo, getChangedFiles };

if (require.main === module) {
  main();
}
