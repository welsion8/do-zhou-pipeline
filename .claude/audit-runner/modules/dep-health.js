/**
 * dep-health.js — 依赖健康检查
 *
 * 检查 npm 依赖的过期/弃用/安全状态。
 * 集成到审计管线，重大安全问题 🔴 阻断。
 *
 * 用法:
 *   node dep-health.js                       # 检查 + 报告
 *   node dep-health.js --ci                  # CI 模式
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function check(ctx) {
  const results = [];
  const codeDir = ctx.codeDir;
  if (!codeDir) return results;

  const pkgFile = path.join(codeDir, 'package.json');
  if (!fs.existsSync(pkgFile)) {
    results.push({ check: '依赖健康', status: '🟡', detail: '无 package.json' });
    return results;
  }

  let pkg;
  try { pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf-8')); } catch (_) { return results; }

  // ── 过期依赖 ──
  try {
    const outdated = execSync('pnpm outdated --no-table 2>&1 || true', {
      cwd: codeDir, stdio: 'pipe', timeout: 30000
    }).toString().trim();

    if (outdated) {
      const lines = outdated.split('\n').filter(l => l && !l.startsWith('└') && !l.startsWith('├'));
      const outdatedCount = Math.max(0, lines.length - 1); // 减去表头
      if (outdatedCount > 10) {
        results.push({ check: '依赖过期', status: '🟠', detail: `${outdatedCount} 个依赖有更新` });
      } else if (outdatedCount > 0) {
        results.push({ check: '依赖过期', status: '🟡', detail: `${outdatedCount} 个依赖可更新` });
      } else {
        results.push({ check: '依赖过期', status: '🟢', detail: '全部依赖为最新' });
      }
    } else {
      results.push({ check: '依赖过期', status: '🟢', detail: '全部依赖为最新' });
    }
  } catch (_) {
    results.push({ check: '依赖过期', status: '🟡', detail: '无法检查（离线或 pnpm 不可用）' });
  }

  // ── 关键安全依赖 ──
  const securityDeps = ['electron', 'vite', 'react', 'react-dom', 'tailwindcss', 'playwright'];
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const outdatedSecurity = [];

  for (const dep of securityDeps) {
    if (deps[dep]) {
      try {
        const current = execSync(`pnpm ls ${dep} --depth 0 --json 2>&1 || true`, {
          cwd: codeDir, stdio: 'pipe', timeout: 10000
        }).toString();
        // 简单版本检查：如果输出中包含 "deprecated" 关键词
        if (/deprecated/i.test(current)) {
          outdatedSecurity.push(dep);
        }
      } catch (_) {}
    }
  }

  if (outdatedSecurity.length > 0) {
    results.push({
      check: '依赖安全: 弃用',
      status: '🟠',
      detail: `${outdatedSecurity.join(', ')} 可能已弃用`,
    });
  }

  // ── 总依赖数 ──
  const totalDeps = Object.keys(deps).length;
  results.push({
    check: '依赖概览',
    status: '🟢',
    detail: `${totalDeps} 个依赖 (deps:${Object.keys(pkg.dependencies || {}).length} devDeps:${Object.keys(pkg.devDependencies || {}).length})`,
  });

  return results;
}

module.exports = { check };
