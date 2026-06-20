/**
 * coverage-strategy.js — 覆盖率策略顾问
 *
 * 自动检测当前覆盖率阶段 → 输出对应的升级策略。
 * 管线不再依赖 Agent 记忆——到了什么区间，触发什么方法。
 *
 * 阶段规则:
 *   0-10%   → 服务层纯逻辑测试 (vi.mock + temp dir)
 *   10-30%  → IPC mock 层 + 页面测试 (setupIPCMock + 主页面)
 *   30-40%  → 主进程纯逻辑 (engine/ipc/session 纯函数)
 *   40-60%  → V8 合并 E2E 覆盖率 (NODE_V8_COVERAGE + v8-to-istanbul)
 *
 * 触发条件: 覆盖率在区间内停留 > 2 次提交无突破 → 建议升级
 *
 * 用法: 作为 audit-pipeline 模块自动运行
 *
 * 通用性: 仅依赖覆盖率百分比 + 平台类型，不绑定任何产品。
 */

const fs = require('fs');
const path = require('path');

const STRATEGIES = {
  '0-10': {
    name: '服务层纯逻辑测试',
    target: 10,
    check: (ctx) => ctx.currentCoverage < 10,
    advice: `当前覆盖率 < 10%。建议:
    1. 找到 src/main/services/ 下的纯逻辑服务
    2. 用 vi.mock('electron') 隔离 Electron 依赖
    3. 用临时目录 (os.tmpdir()) 做文件 I/O
    4. 每个服务文件 → 写 5-10 条测试 → 覆盖率达到 10%

    工具: node .claude/audit-runner/modules/spec-to-unit-test.js --dir src/main/services`,
    autoAction: 'service-layer',
  },
  '10-30': {
    name: 'IPC mock + 页面测试',
    target: 30,
    check: (ctx) => ctx.currentCoverage >= 10 && ctx.currentCoverage < 30 && ctx.testFileCount < 10,
    advice: `覆盖率 {cov}%，在 10-30% 区间。建议:
    1. 停止小组件测试 (每次 +0.1%，效率太低)
    2. 使用 test-utils/ipc-mock.ts 预置 mock 层
    3. 测主页面组件 (每个 +5-7%)
    4. 4-5 个页面测试 → 突破 30%

    页面优先级: app-layout > skill-home > settings > api-config > editor`,
    autoAction: 'ipc-mock-pages',
  },
  '30-40': {
    name: '主进程纯逻辑',
    target: 40,
    check: (ctx) => ctx.currentCoverage >= 30 && ctx.currentCoverage < 40,
    advice: `覆盖率 {cov}%，在 30-40% 区间。建议:
    1. 测主进程 engine/ipc/session 纯逻辑
    2. session-bridge / tool-executor / agent-loop / session-store
    3. ipc-handlers 注册验证
    4. 每个文件 +0.8-1.9% → 突破 40%

    工具: node .claude/audit-runner/modules/spec-to-unit-test.js --dir src/main/engine`,
    autoAction: 'main-process-logic',
  },
  '40-60': {
    name: 'Playwright CT 迁移',
    target: 60,
    check: (ctx) => ctx.currentCoverage >= 40 && ctx.currentCoverage < 60,
    advice: `覆盖率 {cov}%，vitest jsdom 天花板已到。建议:
    1. 迁移渲染层测试到 Playwright CT (真实 Chromium, 非 jsdom)
    2. vitest (主进程) + Playwright CT (渲染层) → 统一 Chromium V8 → 自然合并
    3. 迁移页面组件测试 (每个 +5-7%) → 覆盖率突破 60%

    工具: npx playwright test --config=playwright-ct.config.ts`,
    autoAction: 'playwright-ct',
  },
  '60+': {
    name: '已完成',
    target: 60,
    check: (ctx) => ctx.currentCoverage >= 60,
    advice: `✅ 覆盖率 {cov}% ≥ 60% — 已达到 Phase 8+ 专业标准。`,
    autoAction: 'done',
  },
};

function check(ctx) {
  const results = [];
  const projectRoot = ctx.PROJECT_ROOT || '.';
  const codeDir = ctx.codeDir || 'do-zhou';

  // 读取当前覆盖率
  const covFile = path.join(codeDir, 'coverage', 'coverage-final.json');
  let currentCoverage = 0;
  let testFileCount = 0;

  if (fs.existsSync(covFile)) {
    try {
      const cov = JSON.parse(fs.readFileSync(covFile, 'utf-8'));
      let total = 0, covered = 0;
      // 兼容两种格式: { file: { s: {} } } 或 { file: { statementMap: {}, s: {} } }
      for (const [file, data] of Object.entries(cov)) {
        if (!file.replace(/\\/g, '/').includes('/src/') || file.includes('node_modules')) continue;
        const s = data.s;
        if (!s) continue;
        // 遍历所有 statement：key 是数字字符串或 '0','1','2'...
        const keys = Object.keys(s);
        for (const k of keys) {
          total++;
          if (s[k] > 0 || s[k] === true) covered++;
        }
      }
      currentCoverage = total > 0 ? Math.round(covered / total * 100) : 0;
    } catch (e) {
      // 无法读取则保持 0
    }
  }

  // 统计测试文件数
  const srcDir = path.join(projectRoot, codeDir, 'src');
  function countTests(dir, depth) {
    if (depth > 5) return;
    try {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name.startsWith('.') || e.name === 'node_modules') continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) countTests(full, depth + 1);
        else if (e.name.includes('.test.') || e.name.includes('.spec.')) testFileCount++;
      }
    } catch (_) {}
  }
  countTests(srcDir, 0);

  // 平台检测
  let platform = 'web';
  try {
    const pkgFile = path.join(projectRoot, codeDir, 'package.json');
    if (fs.existsSync(pkgFile)) {
      const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (Object.keys(deps).some(d => d === 'electron' || d.includes('electron-vite'))) platform = 'desktop';
      else if (Object.keys(deps).some(d => d === 'commander' || d === 'yargs')) platform = 'cli';
    }
  } catch (_) {}

  const ctx2 = { currentCoverage, testFileCount, platform, codeDir, projectRoot };

  // 匹配当前阶段
  let matchedStrategy = null;
  for (const [key, strategy] of Object.entries(STRATEGIES)) {
    if (strategy.check(ctx2)) {
      matchedStrategy = { key, ...strategy };
      break;
    }
  }

  if (!matchedStrategy) {
    results.push({ check: '覆盖策略', status: '🟢', detail: '无法确定阶段' });
    return results;
  }

  const stageStatus = matchedStrategy.key === '60+' ? '🟢' :
    matchedStrategy.key === '40-60' ? '🟡' :
    matchedStrategy.key === '0-10' ? '🟠' : '🟡';

  results.push({
    check: `覆盖策略: ${matchedStrategy.name}`,
    status: stageStatus,
    detail: `${currentCoverage}% → 目标 ${matchedStrategy.target}% | ${testFileCount} 测试文件 | ${platform} 平台`,
  });

  // 具体建议（替换占位符）
  const adviceLines = matchedStrategy.advice.replace(/\{cov\}/g, String(currentCoverage)).split('\n').filter(l => l.trim());
  for (const line of adviceLines.slice(0, 5)) {
    results.push({
      check: `  💡 ${line.trim().substring(0, 80)}`,
      status: '⏳',
      detail: '',
    });
  }

  return results;
}

module.exports = { check, STRATEGIES };
