/**
 * config-loader.js — 统一配置加载 + 自动校准 + 边界校验
 *
 * 所有模块统一从 project.config.json 读取阈值。
 * 提供默认值、自动校准、边界校验、配置变更审计。
 *
 * 用法:
 *   const cfg = require('./config-loader.js').load(projectRoot);
 *   const redThreshold = cfg.get('traceability.redThreshold');
 *   // 自动应用默认值 + 边界校验 + 校准
 */

const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  'traceability.redThreshold': 25,
  'traceability.yellowThreshold': 15,
  'e2e.weightedCoverageThreshold': 80,
  'a11y.ariaCoverageTarget': 30,
  'a11y.focusRingMinFiles': 3,
  'a11y.attrGreenMin': 15,
  'a11y.attrYellowMin': 5,
  'a11y.axeWeightedThreshold': 10,
  'confirmation.maxItems': 15,
  'confirmation.autoExpireDays': 30,
  'confirmation.maxWildcardDepth': 2,
  'confirmation.minPatternLength': 8,
  'confirmation.trendDeltaRed': 5,
  'confirmation.trendDeltaYellow': 2,
  'visualRegression.deviationRed': 5,
  'visualRegression.deviationOrange': 2,
  'visualRegression.baselineExpireDays': 7,
  'perf.bundleRedlineKB': 3000,
  'boundFiles.coverageTarget': 80,
  'boundFiles.maxEmptyDirs': 5,
  'designDiff.highChangeBlockThreshold': 3,
  'autoFix.maxRounds': 3,
};

const BOUNDS = {
  'traceability.redThreshold': { min: 3, max: 100 },
  'traceability.yellowThreshold': { min: 2, max: 50 },
  'e2e.weightedCoverageThreshold': { min: 20, max: 100 },
  'a11y.ariaCoverageTarget': { min: 5, max: 80 },
  'a11y.axeWeightedThreshold': { min: 3, max: 50 },
  'visualRegression.deviationRed': { min: 1, max: 20 },
  'visualRegression.deviationOrange': { min: 0.5, max: 10 },
  'confirmation.maxItems': { min: 3, max: 50 },
  'confirmation.autoExpireDays': { min: 7, max: 180 },
};

function load(projectRoot) {
  let config = {};

  // 读取用户配置
  try {
    const configPath = path.join(projectRoot, '.claude', 'project.config.json');
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (_) {}

  const specItems = estimateSpecSize(projectRoot);

  return {
    /**
     * 获取配置值。优先级: 用户配置 > 自动校准 > 默认值
     */
    get(key) {
      const userValue = resolvePath(config, key);
      if (userValue !== undefined) {
        const calibrated = autoCalibrate(key, userValue, specItems);
        const bounded = validateBounds(key, calibrated);
        return bounded;
      }
      const def = DEFAULTS[key];
      if (def !== undefined) {
        return autoCalibrate(key, def, specItems);
      }
      return undefined;
    },

    /** 获取原始用户配置（不含默认值） */
    getRaw(key) {
      return resolvePath(config, key);
    },

    /** 检查用户是否显式配置了某值 */
    isUserSet(key) {
      return resolvePath(config, key) !== undefined;
    },

    /** 获取所有覆盖了默认值的配置项 */
    getUserOverrides() {
      const overrides = [];
      for (const key of Object.keys(DEFAULTS)) {
        if (resolvePath(config, key) !== undefined) {
          overrides.push({ key, user: resolvePath(config, key), default: DEFAULTS[key] });
        }
      }
      return overrides;
    },

    specItems,
  };
}

function resolvePath(obj, dottedPath) {
  const parts = dottedPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

function autoCalibrate(key, value, specItems) {
  switch (key) {
    case 'traceability.redThreshold':
      return specItems > 300 ? Math.max(value, 40) : specItems > 100 ? value : Math.min(value, 8);
    case 'traceability.yellowThreshold':
      return specItems > 300 ? Math.max(value, 25) : specItems > 100 ? value : Math.min(value, 4);
    default:
      return value;
  }
}

function validateBounds(key, value) {
  const bounds = BOUNDS[key];
  if (!bounds || value === -1) return value;

  if (value < bounds.min) {
    console.warn(`⚠ config ${key}=${value} 低于下限 ${bounds.min}，已钳制`);
    return bounds.min;
  }
  if (value > bounds.max) {
    console.warn(`⚠ config ${key}=${value} 超过上限 ${bounds.max}，已钳制`);
    return bounds.max;
  }
  return value;
}

function estimateSpecSize(projectRoot) {
  try {
    const specPath = path.join(projectRoot, 'Product-Spec.md');
    if (fs.existsSync(specPath)) {
      const content = fs.readFileSync(specPath, 'utf-8');
      return (content.match(/^[-\d]+[.\)]\s/gm) || []).length +
             (content.match(/^\|\s/gm) || []).length;
    }
  } catch (_) {}
  return 100; // 默认估算
}

/**
 * 写配置变更审计日志
 */
function auditConfigChange(projectRoot, oldConfig, newConfig, reason) {
  const auditFile = path.join(projectRoot, '.claude', '.config-audit.json');
  let auditLog = [];
  try { if (fs.existsSync(auditFile)) auditLog = JSON.parse(fs.readFileSync(auditFile, 'utf-8')); } catch (_) {}

  const overrides = [];
  if (oldConfig) {
    const oldLoader = { get: (k) => resolvePath(oldConfig, k) };
    const newLoader = { get: (k) => resolvePath(newConfig, k) };
    for (const key of Object.keys(DEFAULTS)) {
      const oldVal = oldLoader.get(key);
      const newVal = newLoader.get(key);
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal) && newVal !== undefined) {
        overrides.push({ key, old: oldVal, new: newVal });
      }
    }
  }

  auditLog.push({
    timestamp: new Date().toISOString(),
    reason: reason || '手动修改',
    changes: overrides,
  });

  if (auditLog.length > 50) auditLog = auditLog.slice(-50);
  fs.writeFileSync(auditFile, JSON.stringify(auditLog, null, 2));
}

// ── 平台适配器 ──

/**
 * 获取产品平台类型和适配信息。
 * 所有平台相关逻辑集中于此，模块不各自判断。
 */
function autoDetectPlatform(projectRoot, configCodeDir, configType) {
  // 用户显式配置优先
  if (configType && configType !== 'auto') return configType;

  const codeDir = configCodeDir || path.basename(projectRoot);
  const pkgFile = path.join(projectRoot, codeDir, 'package.json');

  try {
    if (fs.existsSync(pkgFile)) {
      const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const depNames = Object.keys(deps);

      // 检测规则（优先级递减）
      if (depNames.some(d => d === 'electron' || d.includes('electron-vite') || d.includes('electron-builder')))
        return 'desktop';
      if (depNames.some(d => d === 'react' || d === 'vue' || d === 'next' || d === 'svelte' || d === 'vite'))
        return 'web';
      if (depNames.some(d => d === 'commander' || d === 'yargs' || d === 'inquirer' || d === 'chalk'))
        return 'cli';
      if (fs.existsSync(path.join(projectRoot, codeDir, 'src', 'index.ts')) && !fs.existsSync(path.join(projectRoot, codeDir, 'index.html')))
        return 'cli';
    }
  } catch (_) {}

  return 'web'; // 默认
}

function getPlatformAdapter(projectRoot) {
  const cfg = load(projectRoot);
  let config = {};
  try {
    const configPath = path.join(projectRoot, '.claude', 'project.config.json');
    if (fs.existsSync(configPath)) config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (_) {}

  const codeDir = config.project?.codeDir || path.basename(projectRoot);
  const platform = autoDetectPlatform(projectRoot, codeDir, config.project?.type);
  const srcDir = path.join(projectRoot, codeDir, 'src');
  const autoDetected = !config.project?.type || config.project?.type === 'auto';

  const adapter = {
    platform,
    autoDetected,
    codeDir,
    srcDir,

    /** 平台是否属于某类 */
    isDesktop: platform === 'desktop',
    isWeb: platform === 'web',
    isCLI: platform === 'cli',
    hasUI: platform !== 'cli',

    /** 跳过特定平台的检查 */
    skipFor(...platforms) {
      return platforms.includes(platform);
    },

    /** Electron 应用启动信息（仅 desktop） */
    getLaunchInfo() {
      if (platform !== 'desktop') return null;
      return {
        electronPath: path.join(projectRoot, codeDir, 'node_modules', 'electron', 'dist', 'electron.exe'),
        mainEntry: path.join(projectRoot, codeDir, 'out', 'main', 'index.js'),
        preloadEntry: path.join(projectRoot, codeDir, 'out', 'preload', 'index.js'),
        rendererDir: path.join(projectRoot, codeDir, 'out', 'renderer'),
      };
    },

    /** Web 应用信息 */
    getWebInfo() {
      if (platform !== 'web') return null;
      const pkgFile = path.join(projectRoot, codeDir, 'package.json');
      let devServer = 'http://localhost:5173';
      try {
        if (fs.existsSync(pkgFile)) {
          const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf-8'));
          const scripts = pkg.scripts || {};
          if (scripts.dev && scripts.dev.includes('--port'))
            devServer = 'http://localhost:' + (scripts.dev.match(/--port\s*(\d+)/)?.[1] || '5173');
        }
      } catch (_) {}
      return { devServer, buildDir: path.join(projectRoot, codeDir, 'dist') };
    },

    /** 生成 Playwright 测试模板代码 */
    getE2ETemplate() {
      switch (platform) {
        case 'desktop':
          return {
            imports: `import { test, expect, _electron as electron } from '@playwright/test';\nimport path from 'path';`,
            launchCode: `const EP = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe');\nconst MAIN = path.join(__dirname, '..', 'out', 'main', 'index.js');`,
            beforeAll: `app = await electron.launch({ executablePath: EP, args: [MAIN] });\npage = await app.firstWindow();`,
            afterAll: `try { await app.close(); await app.process().kill(); } catch (e) {}`,
          };
        case 'web':
          return {
            imports: `import { test, expect } from '@playwright/test';`,
            launchCode: `const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';`,
            beforeAll: `page = await browser.newPage();\nawait page.goto(BASE_URL);`,
            afterAll: `await page.close();`,
          };
        case 'cli':
          return {
            imports: `import { test, expect } from '@playwright/test';\nimport { execSync } from 'child_process';`,
            launchCode: `const CLI_ENTRY = 'node dist/index.js';`,
            beforeAll: `// CLI: 通过 execSync 执行命令，不需要浏览器`,
            afterAll: `// CLI: 无需清理`,
          };
        default:
          return null;
      }
    },

    /** 安全检查依赖列表 */
    getSecurityDeps() {
      const base = ['vite', 'react', 'react-dom', 'tailwindcss', 'playwright'];
      if (platform === 'desktop') base.unshift('electron');
      return base;
    },

    /** 需要构建的目录（用于判断是否已构建） */
    getBuildCheckPath() {
      if (platform === 'desktop') return path.join(projectRoot, codeDir, 'out', 'main', 'index.js');
      if (platform === 'web') return path.join(projectRoot, codeDir, 'dist', 'index.html');
      return null;
    },
  };

  return adapter;
}

module.exports = { load, DEFAULTS, BOUNDS, auditConfigChange, getPlatformAdapter };
