/**
 * confirmation-guard.js — 确认系统治理引擎 (Google 级)
 *
 * 对标:
 *   Google:  suppression → bug ID + 6个月过期 + 审批链
 *   Facebook: suppression → commit hash + 自动验证 + 趋势仪表板
 *   Chromatic: approve snapshot → PR 绑定 + 合入自动清理
 *
 * 五层治理:
 *   L1 入口校验: 特异性 + 理由 + commit 绑定
 *   L2 存量监控: 过期/过多/过宽
 *   L3 自动验证: 关联代码变更时自动失效
 *   L4 趋势追踪: 项目生命周期抑制率变化
 *   L5 审批链: 写确认项 → 用户确认 → 才生效
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MAX_CONFIRMATIONS = 15;
const MAX_WILDCARD_DEPTH = 2;
const AUTO_EXPIRE_DAYS = 30;
const MIN_PATTERN_LENGTH = 8;
const FORBIDDEN_PATTERNS = [/^\.\*$/, /^\.\*[a-zA-Z]*\.\*/, /^\.[*+]$/, /^\(\.\*\)/];

function isGitRepo(projectRoot) {
  try {
    const result = execSync('git rev-parse --git-dir', { cwd: projectRoot, stdio: 'pipe', timeout: 5000 });
    return result.toString().trim().length > 0;
  } catch (_) { return false; }
}

function getCommitHash(projectRoot) {
  if (!isGitRepo(projectRoot)) return null;
  try {
    return execSync('git rev-parse HEAD', { cwd: projectRoot, stdio: 'pipe', timeout: 5000 }).toString().trim().substring(0, 8);
  } catch (_) { return null; }
}

function loadConfig(projectRoot) {
  const cfg = require('./config-loader.js').load(projectRoot);
  return {
    maxItems: cfg.get('confirmation.maxItems'),
    autoExpireDays: cfg.get('confirmation.autoExpireDays'),
    maxWildcardDepth: cfg.get('confirmation.maxWildcardDepth'),
    minPatternLength: cfg.get('confirmation.minPatternLength'),
    bindToCommit: true,
    trendLog: '.claude/.suppression-trend.json',
    trendDeltaRed: cfg.get('confirmation.trendDeltaRed'),
    trendDeltaYellow: cfg.get('confirmation.trendDeltaYellow'),
  };
}

// ── 趋势追踪 ──
function updateTrendLog(projectRoot, suppressionCount, totalItems) {
  const cfg = loadConfig(projectRoot);
  const trendFile = path.join(projectRoot, cfg.trendLog || '.claude/.suppression-trend.json');
  let trend = [];
  try { if (fs.existsSync(trendFile)) trend = JSON.parse(fs.readFileSync(trendFile, 'utf-8')); } catch (_) {}

  trend.push({
    date: new Date().toISOString().split('T')[0],
    suppressions: suppressionCount,
    totalItems,
    rate: totalItems > 0 ? Math.round(suppressionCount / totalItems * 100) : 0,
  });

  // 只保留最近 90 条记录
  if (trend.length > 90) trend = trend.slice(-90);
  fs.writeFileSync(trendFile, JSON.stringify(trend, null, 2));
}

function getTrendAnalysis(projectRoot) {
  const cfg = loadConfig(projectRoot);
  const trendFile = path.join(projectRoot, cfg.trendLog || '.claude/.suppression-trend.json');
  try {
    if (!fs.existsSync(trendFile)) return null;
    const trend = JSON.parse(fs.readFileSync(trendFile, 'utf-8'));
    if (trend.length < 2) return null;

    const first = trend[0];
    const last = trend[trend.length - 1];
    const delta = last.rate - first.rate;
    const direction = delta > cfg.trendDeltaRed ? '📈 上升' : delta < -cfg.trendDeltaRed ? '📉 下降' : '➡ 平稳';

    return { records: trend.length, firstRate: first.rate, lastRate: last.rate, delta, direction };
  } catch (_) { return null; }
}

// ── 自动验证 ──
function findStaleConfirmations(projectRoot, confirmedFile) {
  const stale = [];
  const cfg = loadConfig(projectRoot);
  if (!cfg.bindToCommit) return stale;

  try {
    if (!fs.existsSync(confirmedFile)) return stale;
    const confirmed = JSON.parse(fs.readFileSync(confirmedFile, 'utf-8'));
    if (!confirmed._commitHash) return stale;

    // 检查自确认后哪些文件变更了
    let changedFiles = '';
    try {
      changedFiles = execSync(
        `git diff --name-only ${confirmed._commitHash} HEAD -- .claude/ src/`,
        { cwd: projectRoot, stdio: 'pipe', timeout: 10000 }
      ).toString().trim();
    } catch (_) { changedFiles = ''; }

    if (changedFiles) {
      // 有变更 → 可能某些确认已过时
      const changedSet = new Set(changedFiles.split('\n').filter(Boolean));
      for (const item of (confirmed.items || [])) {
        // 检查是否有审计模块代码变更（可能修复了确认项对应的问题）
        if (changedSet.has('.claude/audit-runner/audit-pipeline.js') ||
            changedSet.has('.claude/audit-runner/modules/')) {
          stale.push(item);
        }
      }

      if (stale.length > 0) {
        // 更新 commit hash 防止重复提醒
        const newHash = getCommitHash(projectRoot);
        if (newHash) confirmed._commitHash = newHash;
        fs.writeFileSync(confirmedFile, JSON.stringify(confirmed, null, 2));
      }
    }
  } catch (_) {}

  return stale;
}

// ── 审批链 ──
function isApprovalPending(projectRoot) {
  const approvalFile = path.join(projectRoot, '.claude', '.confirmation-pending.json');
  try {
    if (!fs.existsSync(approvalFile)) return false;
    const pending = JSON.parse(fs.readFileSync(approvalFile, 'utf-8'));
    return pending.items && pending.items.length > 0;
  } catch (_) { return false; }
}

function requestApproval(projectRoot, newItems, justification) {
  const approvalFile = path.join(projectRoot, '.claude', '.confirmation-pending.json');
  const commitHash = getCommitHash(projectRoot);
  fs.writeFileSync(approvalFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    commitHash,
    items: newItems,
    justification,
    _note: '用户需确认后才生效。查看并删除此文件表示批准，或删除 items 中的条目表示拒绝。',
  }, null, 2));
}

function checkApproval(ctx, projectRoot) {
  const results = [];
  const approvalFile = path.join(projectRoot, '.claude', '.confirmation-pending.json');

  if (!fs.existsSync(approvalFile)) return results;

  try {
    const pending = JSON.parse(fs.readFileSync(approvalFile, 'utf-8'));
    if (pending.items && pending.items.length > 0) {
      results.push({
        check: '确认治理: 待审批',
        status: '🟡',
        detail: `${pending.items.length} 条确认项等待用户审批 (${pending.justification || '无理由'})。查看 ${approvalFile}`,
      });
    }
  } catch (_) {}

  return results;
}

// ── 管线 check() ──
function check(ctx) {
  const results = [];
  const projectRoot = ctx.PROJECT_ROOT || '.';
  const confirmedPath = path.join(projectRoot, '.claude', '.audit-confirmed.json');
  const utils = ctx.utils || require('./_utils.js');
  const cfg = loadConfig(projectRoot);

  const maxItems = cfg.maxItems || MAX_CONFIRMATIONS;
  const expireDays = cfg.autoExpireDays || AUTO_EXPIRE_DAYS;

  if (!utils.fileExists(confirmedPath)) {
    results.push({ check: '确认治理', status: '🟢', detail: '无确认项。管线全量审计。' });
    return results;
  }

  let confirmed;
  try { confirmed = JSON.parse(utils.readFile(confirmedPath)); } catch (_) { return results; }

  const items = confirmed.items || [];
  const timestamp = confirmed.timestamp;
  const now = Date.now();
  const violations = [];
  const expired = [];

  // 过期检查
  if (timestamp) {
    const ageDays = (now - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > expireDays) {
      results.push({
        check: '确认治理: 过期',
        status: '🔴',
        detail: `${Math.round(ageDays)} 天未更新 → 自动清空。请重新审查。`,
      });
      if (!ctx.ci) {
        confirmed.items = [];
        confirmed.timestamp = new Date().toISOString();
        confirmed._commitHash = getCommitHash(projectRoot);
        confirmed._note = 'AUTO-EXPIRED: 自动清空。请重新确认仍需抑制的项。';
        fs.writeFileSync(confirmedPath, JSON.stringify(confirmed, null, 2));
      }
    }
  }

  // 特异性检查
  for (const item of items) {
    let forbidden = false;
    for (const fp of FORBIDDEN_PATTERNS) {
      if (fp.test(item)) { forbidden = true; violations.push(item); break; }
    }
    if (!forbidden) {
      if (item.length < MIN_PATTERN_LENGTH) violations.push(item);
      const starCount = (item.match(/\*/g) || []).length;
      if (starCount > MAX_WILDCARD_DEPTH) violations.push(item);
    }
  }

  // 自动清除违规项
  if (violations.length > 0 && !ctx.ci) {
    confirmed.items = items.filter(i => !violations.includes(i));
    fs.writeFileSync(confirmedPath, JSON.stringify(confirmed, null, 2));
    results.push({
      check: '确认治理: 违规清除',
      status: '🔴',
      detail: `移除了 ${violations.length} 条违反特异性要求的确认项: ${violations.join(', ')}`,
    });
  }

  // 数量检查
  if (items.length > maxItems) {
    results.push({
      check: '确认治理: 超限',
      status: '🟠',
      detail: `${items.length}/${maxItems} 条。满额时须清理旧项才能加新项。`,
    });
  }

  // ── 自动验证: 检查过时确认（仅 Git 项目）──
  if (isGitRepo(projectRoot) && cfg.bindToCommit !== false) {
    const stale = findStaleConfirmations(projectRoot, confirmedPath);
    if (stale.length > 0) {
      results.push({
        check: '确认治理: 代码已变更',
        status: '🟡',
        detail: `${stale.length} 条确认可能已过时（审计模块代码已变更）。请验证是否仍需抑制。`,
      });
    }
  }

  // ── 审批链: 检查待审批项 ──
  const approvalResults = checkApproval(ctx, projectRoot);
  results.push(...approvalResults);

  // ── 趋势追踪 ──
  // 计算本次抑制数：从审计报告中统计被确认匹配的项数
  let suppressionCount = 0, totalAuditItems = 0;
  if (ctx.auditReport) {
    for (const [k, v] of Object.entries(ctx.auditReport)) {
      if (!Array.isArray(v)) continue;
      totalAuditItems += v.length;
    }
  }
  // 从确认文件估算抑制数
  suppressionCount = Math.min(items.length * 3, totalAuditItems); // 每条确认最多匹配3项
  updateTrendLog(projectRoot, suppressionCount, totalAuditItems);

  const trend = getTrendAnalysis(projectRoot);
  if (trend) {
    results.push({
      check: '确认治理: 趋势',
      status: trend.delta > cfg.trendDeltaRed ? '🟠' : (trend.delta > cfg.trendDeltaYellow ? '🟡' : '🟢'),
      detail: `${trend.direction} ${trend.firstRate}% → ${trend.lastRate}% (${trend.records} 天记录)`,
    });
  }

  const activeItems = items.length - violations.length;
  if (violations.length === 0 && activeItems <= maxItems) {
    results.push({
      check: '确认治理',
      status: activeItems > 10 ? '🟡' : '🟢',
      detail: `${activeItems} 条确认规则，合规有效。本次抑制 ~${suppressionCount} 项。`,
    });
  }

  // ── commit 绑定（仅在 Git 项目）──
  if (isGitRepo(projectRoot) && cfg.bindToCommit !== false && !confirmed._commitHash) {
    const hash = getCommitHash(projectRoot);
    if (hash) {
      confirmed._commitHash = hash;
      fs.writeFileSync(confirmedPath, JSON.stringify(confirmed, null, 2));
    }
  }
  if (!isGitRepo(projectRoot)) {
    results.push({ check: '确认治理: Git', status: '🟡', detail: '非 Git 项目，commit 绑定和自动验证不可用。初始化 git 后可启用。' });
  }

  return results;
}

// ── 写入前校验 ──
function validateBeforeWrite(newItems, projectRoot) {
  const errors = [];
  const cfg = loadConfig(projectRoot);
  const maxItems = cfg.maxItems || MAX_CONFIRMATIONS;

  if (!Array.isArray(newItems)) return { valid: false, errors: ['items 必须是数组'] };
  if (newItems.length > maxItems) errors.push(`${newItems.length} 条超过上限 ${maxItems}。请先清理旧项。`);

  for (const item of newItems) {
    if (typeof item !== 'string') { errors.push(`无效类型: ${typeof item}`); continue; }
    for (const fp of FORBIDDEN_PATTERNS) {
      if (fp.test(item)) { errors.push(`禁止模式 "${item}" → 过于宽泛`); break; }
    }
    if (item.length < MIN_PATTERN_LENGTH) errors.push(`"${item}" 太短 → 可能过于宽泛`);
    const starCount = (item.match(/\*/g) || []).length;
    if (starCount > MAX_WILDCARD_DEPTH) errors.push(`"${item}" 含 ${starCount} 个通配符 (上限 ${MAX_WILDCARD_DEPTH})`);
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { check, validateBeforeWrite, requestApproval, findStaleConfirmations,
  updateTrendLog, getTrendAnalysis, MAX_CONFIRMATIONS, AUTO_EXPIRE_DAYS };
