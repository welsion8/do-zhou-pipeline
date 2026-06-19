#!/usr/bin/env node
/**
 * Audit Pipeline — 5 阶段交叉审计执行器
 *
 * 单一入口，数据驱动，模块化检查，原子 gate 更新。
 *
 * 用法:
 *   node audit-pipeline.js              # 扫描 + 终端报告 + JSON
 *   node audit-pipeline.js --apply      # 扫描 + 验证通过后自动更新 .phase-gate
 *   node audit-pipeline.js --phase 5    # 指定 Phase（默认读 .phase-gate）
 *   node audit-pipeline.js --full       # 全量 D4 检查（不做 Phase 过滤）
 *   node audit-pipeline.js --ci         # CI 模式：通过后自动更新 gate
 *   node audit-pipeline.js --json       # 仅输出 JSON（供 CI 消费）
 *   node audit-pipeline.js --self-test  # Meta-audit：管线自测
 *
 * 退出码: 0 = 审计通过(🔴0 🟠0 🟡≤3) | 1 = 未通过或 --apply 被拒绝
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── 路径常量 ──
const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const CLAUDE_DIR = path.join(PROJECT_ROOT, '.claude');
const SPEC_FILE = path.join(PROJECT_ROOT, 'Product-Spec.md');
const PLAN_FILE = path.join(PROJECT_ROOT, 'DEV-PLAN.md');
const DESIGN_BRIEF_FILE = path.join(PROJECT_ROOT, 'Design-Brief.md');
const GATE_FILE = path.join(CLAUDE_DIR, '.phase-gate');
const REPORT_FILE = path.join(CLAUDE_DIR, '.audit-report.json');
const ARCHIVE_DIR = path.join(CLAUDE_DIR, 'audit-reports');
const CONFIG_FILE = path.join(CLAUDE_DIR, 'project.config.json');
const MODULES_DIR = path.join(__dirname, 'modules');

// 共享工具
const utils = require('./modules/_utils.js');

// 命令行参数
const ARGS = {
  apply: process.argv.includes('--apply'),
  full: process.argv.includes('--full'),
  jsonOnly: process.argv.includes('--json'),
  ci: process.argv.includes('--ci') || !!process.env.CI,
  selfTest: process.argv.includes('--self-test'),
  phase: null,
  codeDir: null,
  scope: null,
  fix: process.argv.includes('--fix'),
};
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--phase' && process.argv[i + 1]) ARGS.phase = parseInt(process.argv[i + 1]);
  if (process.argv[i] === '--code' && process.argv[i + 1]) ARGS.codeDir = process.argv[i + 1];
  if (process.argv[i] === '--scope' && process.argv[i + 1]) ARGS.scope = process.argv[i + 1];
}

// ── 项目配置加载 ──
function loadConfig() {
  const raw = utils.readFile(CONFIG_FILE);
  const userConfig = raw ? JSON.parse(raw) : {};
  const framework = userConfig.stack?.framework || 'react';
  const styling = userConfig.stack?.styling || 'tailwind';
  const language = userConfig.stack?.language || 'typescript';
  const projectType = userConfig.project?.type || 'web';

  const extMap = { typescript: ['.tsx', '.ts', '.css', '.json'], javascript: ['.jsx', '.js', '.css', '.json'] };
  if (framework === 'vue') extMap.typescript = ['.vue', '.ts', '.css', '.json'];
  const sourceExtensions = userConfig.scanning?.sourceExtensions || extMap[language] || ['.tsx', '.ts', '.css', '.json'];

  const defaultIgnoreDirs = ['node_modules', 'out', 'dist', '.git', '.claude'];
  const extraIgnoreDirs = userConfig.scanning?.extraIgnoreDirs || [];
  const ignoreDirs = [...defaultIgnoreDirs, ...extraIgnoreDirs];

  const allChecks = ['l1_l2_traceability', 'l2_brief_check', 'l2_pen_check', 'd1_traceability', 'd2_consistency', 'd3_completeness', 'd4_references', 'd5_safety',
    'visual_consistency', 'component_imports', 'cross_phase', 'reverse_visual', 'component_routing', 'e2e_check', 'perf_check', 'a11y_check', 'spec_ui_check', 'spec_to_e2e', 'bound_files', 'visual_regression', 'token_enforce', 'design_diff', 'traceability', 'pen_sync', 'dep_health', 'confirmation_guard'];
  if (projectType === 'desktop') allChecks.push('ipc_bridge', 'secure_storage');
  const disabledChecks = new Set(userConfig.checks?.disabled || []);
  const enabledChecks = allChecks.filter(c => !disabledChecks.has(c));

  let tokenMatchers = { width: 'w-\\[?{value}px?\\]?|w-{value}\\b', height: 'h-\\[?{value}px?\\]?|h-{value}\\b' };
  if (userConfig.designSystem?.tokenMatchers) tokenMatchers = { ...tokenMatchers, ...userConfig.designSystem.tokenMatchers };

  const devPlan = {
    phasePattern: userConfig.devPlan?.phaseTitlePattern || '^##\\s*Phase\\s*(\\d+)',
    filePathPattern: userConfig.devPlan?.filePathPattern || '`(src/[^`]+\\.(tsx?|jsx?|css|json|ts|js))`',
    designValuePatterns: userConfig.devPlan?.designValuePatterns || [
      // 宽度
      ['width', '(\\S+)\\s*[=:：]\\s*width\\s*[=:：]?\\s*(\\d+)'],
      // 高度
      ['height', '(\\S+)\\s*[=:：]\\s*height\\s*[=:：]?\\s*(\\d+)'],
      // 通用数值: 组件名 属性=值 或 组件名: 值px
      ['generic', '(\\S+)\\s*[=:：]\\s*(\\d+)(?:px)?\\b'],
      // 尺寸简写（如 44×44）
      ['dimensions', '(\\S+)\\s*[=:：]?\\s*(\\d+)\\s*[×xX]\\s*(\\d+)'],
    ],
  };

  return { projectType, framework, styling, language, sourceExtensions, ignoreDirs,
    enabledChecks: new Set(enabledChecks), disabledChecks, tokenMatchers, devPlan,
    designSource: userConfig.designSystem?.source || 'none', raw: userConfig };
}

const CONFIG = loadConfig();

// ── B1: 配置自检（strictConfigCheck）──
// 比对 config 声明 vs 实际项目特征。仅当 strict=true 时执行。
// platform 不匹配 → 🔴 阻断 / framework/styling 不匹配 → 🟡 警告
function validateConfig() {
  const strict = CONFIG.raw?.project?.strict;
  if (!strict) return { valid: true, warnings: [], errors: [] };

  const warnings = [], errors = [];

  // ── 探测实际项目特征 ──
  const actual = { platform: 'web', framework: null, styling: null };

  // 读 package.json
  const pkgPath = path.join(PROJECT_ROOT, 'package.json');
  let pkg = null;
  if (!utils.fileExists(pkgPath)) {
    // 尝试子目录
    const entries = fs.readdirSync(PROJECT_ROOT, { withFileTypes: true }).filter(e => e.isDirectory() && !e.name.startsWith('.') && !CONFIG.ignoreDirs.includes(e.name));
    for (const e of entries) {
      const sp = path.join(PROJECT_ROOT, e.name, 'package.json');
      if (utils.fileExists(sp)) { pkg = JSON.parse(utils.readFile(sp)); break; }
    }
  } else {
    pkg = JSON.parse(utils.readFile(pkgPath));
  }

  if (pkg) {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const depNames = Object.keys(deps);

    // 平台探测
    const electronDeps = depNames.filter(d => d.startsWith('electron') || d.includes('electron-vite') || d.includes('electron-builder') || d === 'tauri');
    if (electronDeps.length > 0) actual.platform = 'desktop';
    else if (depNames.some(d => d.includes('express') || d.includes('commander') || d.includes('yargs') || d.includes('inquirer'))) actual.platform = 'cli';
    else actual.platform = 'web';

    // 框架探测
    if (depNames.includes('react') || depNames.includes('react-dom')) actual.framework = 'react';
    else if (depNames.includes('vue')) actual.framework = 'vue';
    else if (depNames.includes('next')) actual.framework = 'next';
    else if (depNames.includes('svelte')) actual.framework = 'svelte';

    // 样式探测
    if (depNames.some(d => d.includes('tailwind'))) actual.styling = 'tailwind';
    else if (depNames.some(d => d.includes('styled-components') || d.includes('emotion'))) actual.styling = 'styled-components';
    else if (depNames.some(d => d.includes('css-modules'))) actual.styling = 'css-modules';
  }

  // 文件系统探测（补充）
  if (!actual.framework || !actual.styling) {
    // 独立探测代码目录
    let probeDir = null;
    const rootEntries = fs.readdirSync(PROJECT_ROOT, { withFileTypes: true }).filter(e => e.isDirectory() && !e.name.startsWith('.') && !CONFIG.ignoreDirs.includes(e.name));
    for (const e of rootEntries) {
      const sd = path.join(PROJECT_ROOT, e.name);
      if (utils.dirExists(path.join(sd, 'src'))) { probeDir = sd; break; }
    }
    if (!probeDir) probeDir = PROJECT_ROOT;

    const extCounts = {};
    const scanFiles = utils.findFiles(probeDir, null, CONFIG.ignoreDirs);
    for (const f of scanFiles) {
      const ext = path.extname(f);
      extCounts[ext] = (extCounts[ext] || 0) + 1;
    }
    if ((extCounts['.tsx'] || 0) > (extCounts['.vue'] || 0)) actual.framework = actual.framework || 'react';
    if ((extCounts['.vue'] || 0) > (extCounts['.tsx'] || 0)) actual.framework = actual.framework || 'vue';
    if (!actual.styling && (extCounts['.css'] || 0) > 0) {
      // 有 CSS 文件但无框架特征 → 可能是 css-modules 或 vanilla
      actual.styling = actual.styling || 'css';
    }
  }

  // ── 比对 ──
  // Platform：不匹配 → 🔴 阻断
  if (actual.platform && actual.platform !== CONFIG.projectType) {
    errors.push({
      check: 'platform',
      declared: CONFIG.projectType,
      actual: actual.platform,
      message: `配置声明平台为 "${CONFIG.projectType}"，但检测到 "${actual.platform}" 特征（${actual.platform === 'desktop' ? 'Electron 依赖' : actual.platform === 'cli' ? 'CLI 框架依赖' : '无桌面/CLI 特征'}）。platform 决定哪些安全检查启用，写错有安全后果。请修改 project.config.json 的 project.type。`,
      status: '🔴',
    });
  }

  // Framework：不匹配 → 🟡 警告
  if (actual.framework && actual.framework !== CONFIG.framework) {
    warnings.push({
      check: 'framework',
      declared: CONFIG.framework,
      actual: actual.framework,
      message: `配置声明框架为 "${CONFIG.framework}"，但检测到 "${actual.framework}" 特征。组件导入检查等模块可能不准确。`,
      status: '🟡',
    });
  }

  // Styling：不匹配 → 🟡 警告
  if (actual.styling && actual.styling !== CONFIG.styling) {
    warnings.push({
      check: 'styling',
      declared: CONFIG.styling,
      actual: actual.styling,
      message: `配置声明样式方案为 "${CONFIG.styling}"，但检测到 "${actual.styling}" 特征。视觉一致性检查的 CSS 匹配模式可能不准确。`,
      status: '🟡',
    });
  }

  return { valid: errors.length === 0, warnings, errors };
}

// ── Phase 0: 项目发现 ──
function discoverProject() {
  const result = {
    specContent: null, planContent: null, designBriefContent: null, penFile: null,
    codeDir: null, currentPhase: null, phaseGate: null, stage: 'unknown',
    layers: { L1: true, L2: false, L3: false, L4: true, L5: false },
  };
  result.specContent = utils.readFile(SPEC_FILE);
  result.planContent = utils.readFile(PLAN_FILE);
  result.designBriefContent = utils.readFile(DESIGN_BRIEF_FILE);

  let rootEntries;
  try { rootEntries = fs.readdirSync(PROJECT_ROOT); } catch (_) { rootEntries = []; }
  const penFile = rootEntries.find(f => f.endsWith('.pen'));
  if (penFile) {
    result.penFile = path.join(PROJECT_ROOT, penFile);
    // 防御：.pen 文件存在但为空（0字节）→ 设计稿生成失败或中断
    try {
      const penStat = fs.statSync(result.penFile);
      if (penStat.size === 0) {
        result.penFileEmpty = true;
        console.log('⚠ designsDo舟.pen 文件为空（0字节）。设计稿未生成或生成中断。');
        console.log('   L2/L3 视觉审计将降级为文本模式。');
        console.log('   修复：重新运行 design-maker skill 生成设计稿。\n');
      }
    } catch (_) {}
  }

  // 自动触发 token-mapper（DESIGN-TOKENS.md 存在时自动生成颜色映射）
  // 零副作用：仅读取 DESIGN-TOKENS.md 生成 .token-map.json，不修改任何源文件
  try {
    const tokenMapper = require('./modules/token-mapper.js');
    const mapResult = tokenMapper.generate(PROJECT_ROOT);
    if (mapResult) result.tokenMap = mapResult;
  } catch (_) { /* token-mapper 失败不影响管线主流程 */ }

  const gateContent = utils.readFile(GATE_FILE);
  if (gateContent) {
    result.phaseGate = {};
    for (const line of gateContent.split('\n')) {
      const m = line.match(/^(\w+)=(pending|pass|fail|skip)$/);
      if (m) result.phaseGate[m[1]] = m[2];
      const pm = line.match(/^phase=(\d+)/);
      if (pm) result.currentPhase = parseInt(pm[1]);
    }
  }
  if (ARGS.phase) result.currentPhase = ARGS.phase;
  if (result.designBriefContent) result.layers.L2 = true;
  if (result.penFile) result.layers.L3 = true;
  if (result.phaseGate) result.layers.L5 = true;

  result.codeDir = discoverCodeDir(result);
  if (result.codeDir && !result.layers.L5) result.layers.L5 = true;

  if (!result.specContent) result.stage = 'pre-spec';
  else if (!result.planContent) result.stage = 'spec-done';
  else if (!result.phaseGate) result.stage = 'plan-done';
  else result.stage = 'developing';
  return result;
}

function discoverCodeDir(project) {
  // 优先级: CLI --code > --scope > config project.codeDir > 自动探测
  if (ARGS.codeDir) { const d = path.resolve(PROJECT_ROOT, ARGS.codeDir); if (utils.dirExists(d)) return d; }

  // --scope: 在 packages/<scope>/ 或 <scope>/ 下查找
  if (ARGS.scope) {
    const candidates = [
      path.join(PROJECT_ROOT, 'packages', ARGS.scope),
      path.join(PROJECT_ROOT, ARGS.scope),
    ];
    for (const d of candidates) {
      if (utils.dirExists(d) && utils.dirExists(path.join(d, 'src'))) return d;
    }
    if (!ARGS.jsonOnly) console.log(`⚠ scope "${ARGS.scope}" 未找到对应代码目录`);
  }

  const configCodeDir = CONFIG.raw?.project?.codeDir;
  if (configCodeDir) {
    const d = path.resolve(PROJECT_ROOT, configCodeDir);
    if (utils.dirExists(d)) return d;
    if (!ARGS.jsonOnly) console.log(`⚠ config 指定 codeDir "${configCodeDir}" 不存在，回退自动探测`);
  }
  if (project.planContent) {
    const planLines = project.planContent.split('\n');
    const filePaths = [];
    for (const line of planLines) {
      const m = line.match(/`(src\/[^`]+\.(tsx?|jsx?|css|json))`/);
      if (m) filePaths.push(m[1]);
    }
    if (filePaths.length > 0) {
      let rootEntries;
      try { rootEntries = fs.readdirSync(PROJECT_ROOT, { withFileTypes: true }); } catch (_) { return null; }
      const candidates = [];
      for (const entry of rootEntries) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || CONFIG.ignoreDirs.includes(entry.name)) continue;
        const subDir = path.join(PROJECT_ROOT, entry.name);
        if (utils.dirExists(path.join(subDir, 'src'))) {
          const testPath = path.join(subDir, filePaths[0]);
          candidates.push({ dir: subDir, match: utils.fileExists(testPath) });
        }
      }
      const exact = candidates.find(c => c.match);
      if (exact) return exact.dir;
      if (candidates.length === 1) return candidates[0].dir;
      if (candidates.length > 1) {
        if (!ARGS.jsonOnly) {
          console.log(`⚠ 检测到 ${candidates.length} 个代码目录候选:`);
          for (const c of candidates) console.log(`   - ${path.relative(PROJECT_ROOT, c.dir)}${c.match ? ' (路径匹配)' : ''}`);
          console.log('   可在 project.config.json 中设置 project.codeDir 消除歧义');
        }
        const titleMatch = project.planContent.match(/Development Plan.*[—\-]\s*(.+)/);
        const title = titleMatch ? titleMatch[1].trim().toLowerCase() : '';
        for (const c of candidates) {
          const dn = path.basename(c.dir).toLowerCase();
          if (title.includes(dn) || dn.includes(title) || (title.includes('do') && dn.includes('do'))) return c.dir;
        }
        if (exact) return exact.dir;
        return candidates[0].dir;
      }
    }
  }
  let rootEntries;
  try { rootEntries = fs.readdirSync(PROJECT_ROOT, { withFileTypes: true }); } catch (_) { return null; }
  for (const entry of rootEntries) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || CONFIG.ignoreDirs.includes(entry.name)) continue;
    const subDir = path.join(PROJECT_ROOT, entry.name);
    if (utils.fileExists(path.join(subDir, 'package.json')) && utils.dirExists(path.join(subDir, 'src'))) return subDir;
  }
  return null;
}

// ── Phase 1: Spec 编译 ──
function compileSpec(specContent) {
  if (!specContent) return { features: [], behaviors: [], stateMachines: [], sections: [], summary: { featureCount: 0, totalBehaviors: 0, stateMachineCount: 0 } };
  const lines = specContent.split('\n');
  const sections = {};
  let currentSection = 'preamble';
  for (const line of lines) {
    const m = line.match(/^##\s+(.+)/);
    if (m) { currentSection = m[1]; sections[currentSection] = []; continue; }
    if (sections[currentSection]) sections[currentSection].push(line);
  }
  const features = [];
  const featureSection = Object.keys(sections).find(s => /功能需求|核心功能|功能/.test(s));
  if (featureSection) {
    let currentFeature = null;
    for (const line of sections[featureSection]) {
      const fm = line.match(/^###\s+(.+)/);
      if (fm) { if (currentFeature) features.push(currentFeature); currentFeature = { name: fm[1], behaviors: [], states: [], children: [] }; continue; }
      if (!currentFeature) continue;
      for (const kw of ['可折叠', '可拖拽', '可展开', '可调整', '双击', '右键菜单', '快捷键', '动画', '自动保存'])
        if (line.includes(kw)) currentFeature.behaviors.push(kw);
      for (const st of ['空状态', '加载态', '加载中', '错误态', '默认态', '展开', '折叠', '完成', '进行中', '未开始'])
        if (line.includes(st)) currentFeature.states.push(st);
    }
    if (currentFeature) features.push(currentFeature);
  }
  const BEHAVIOR_KEYWORDS = ['可折叠', '可拖拽', '可展开', '可调整', '双击', '右键菜单', '快捷键', '动画', '自动保存', '拖拽排序', '标签页切换', '弹窗', 'Toast', '响应式', '深色主题', '浅色主题', '暗色模式', 'focus-ring', '键盘导航'];
  const behaviors = [];
  for (const kw of BEHAVIOR_KEYWORDS) {
    const mentions = [];
    for (let i = 0; i < lines.length; i++) if (lines[i].includes(kw)) mentions.push({ line: i + 1, text: lines[i].trim().substring(0, 100) });
    if (mentions.length > 0) behaviors.push({ keyword: kw, count: mentions.length, mentions: mentions.slice(0, 5) });
  }
  const stateMachines = [];
  for (const [sn, sl] of Object.entries(sections)) {
    const triggers = [], states = [];
    for (const line of sl) {
      for (const t of ['点击', '双击', '拖拽', '右键', '悬停', '输入', '切换', '删除', '重命名', '导入', '导出', '保存'])
        if (line.includes(t) && (line.includes('→') || line.includes('->') || line.includes('触发'))) triggers.push(line.trim().substring(0, 80));
      for (const s of ['状态', '态:', '进入', '变为']) if (line.includes(s)) states.push(line.trim().substring(0, 80));
    }
    if (triggers.length + states.length >= 2) stateMachines.push({ section: sn, triggers: triggers.slice(0, 5), states: states.slice(0, 5) });
  }
  return { features, behaviors, stateMachines, sections: Object.keys(sections), summary: { featureCount: features.length, totalBehaviors: behaviors.reduce((s, b) => s + b.count, 0), stateMachineCount: stateMachines.length } };
}

// ── Phase 2: DEV-PLAN 解析 + 代码扫描 ──
function parsePlan(planContent) {
  if (!planContent) return { filePaths: [], phases: [], projectName: null };
  const lines = planContent.split('\n');
  let projectName = null;
  const titleMatch = planContent.match(/Development Plan.*[—\-]\s*(.+)/);
  if (titleMatch) projectName = titleMatch[1].trim();
  const phaseRx = new RegExp(CONFIG.devPlan.phasePattern, 'i');
  const phaseDetectRx = new RegExp(CONFIG.devPlan.phasePattern.replace('\\(\\d+\\)', '(\\d+)'), 'i');
  const filePathRx = new RegExp(CONFIG.devPlan.filePathPattern, '');
  const phases = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(phaseRx);
    if (m) phases.push({ number: parseInt(m[1]), title: (m[2] || '').trim(), line: i + 1 });
  }
  const filePaths = [];
  let currentPhaseInDoc = null;
  for (let i = 0; i < lines.length; i++) {
    const pm = lines[i].match(phaseDetectRx);
    if (pm) currentPhaseInDoc = parseInt(pm[1]);
    filePathRx.lastIndex = 0;
    const fm = lines[i].match(filePathRx);
    if (fm) filePaths.push({ path: fm[1], line: i + 1, phase: currentPhaseInDoc, raw: lines[i].trim() });
  }
  return { filePaths, phases, projectName };
}

function scanCode(codeDir) {
  const allFiles = utils.findFiles(codeDir, null, CONFIG.ignoreDirs);
  const fileMap = {};
  for (const f of allFiles) fileMap[path.relative(codeDir, f).replace(/\\/g, '/')] = f;
  const allContent = {};
  for (const [rp, ap] of Object.entries(fileMap)) { const c = utils.readFile(ap); if (c) allContent[rp] = c; }
  const combinedCode = Object.values(allContent).join('\n');
  const ic = [
    { keyword: 'collapsible', checks: [{ pattern: /useState|toggle|expand|collapse|setExpanded|setCollapsed/gi, desc: '折叠状态管理' }, { pattern: /onClick|onToggle|handleClick/gi, desc: '点击事件处理' }, { pattern: /transition|animate|duration|rotate/gi, desc: 'CSS 动画' }] },
    { keyword: 'draggable', checks: [{ pattern: /onMouseDown|onDrag|useDrag|draggable/gi, desc: '拖拽事件' }] },
    { keyword: 'resizable', checks: [{ pattern: /onMouseDown|onResize|resize|useResize/gi, desc: '面板尺寸调整事件' }] },
    { keyword: 'contextMenu', checks: [{ pattern: /onContextMenu|contextmenu|ContextMenu/gi, desc: '右键菜单实现' }] },
    { keyword: 'keyboard', checks: [{ pattern: /onKeyDown|onKeyUp|onKeyPress|keyboard|keydown/gi, desc: '键盘事件处理' }, { pattern: /aria-|role=|tabIndex/gi, desc: '无障碍属性' }] },
    { keyword: 'autosave', checks: [{ pattern: /autosave|autoSave|auto.?save|setInterval.*save/gi, desc: '自动保存逻辑' }] },
    { keyword: 'loading', checks: [{ pattern: /loading|isLoading|spinner|skeleton/gi, desc: '加载态组件' }] },
    { keyword: 'empty', checks: [{ pattern: /empty|isEmpty|no.?data|暂无|暂无.*数据/gi, desc: '空状态处理' }] },
    { keyword: 'error', checks: [{ pattern: /error|isError|catch|try.*catch|错误/gi, desc: '错误处理' }] },
    { keyword: 'toast', checks: [{ pattern: /toast|Toast|notification|Notification/gi, desc: 'Toast 组件' }] },
    { keyword: 'modal', checks: [{ pattern: /modal|Modal|dialog|Dialog|popup|Popup/gi, desc: '弹窗组件' }] },
    { keyword: 'animation', checks: [{ pattern: /transition|animate|@keyframes|ease|duration/gi, desc: '动画定义' }] },
    { keyword: 'darkMode', checks: [{ pattern: /theme|darkMode|dark-mode|dark.*mode|ThemeProvider|useTheme/gi, desc: '主题系统' }] },
    { keyword: 'scrollbar', checks: [{ pattern: /overflow|scroll|::-webkit-scrollbar/gi, desc: '滚动条样式' }] },
    { keyword: 'responsive', checks: [{ pattern: /media|breakpoint|responsive|useMedia|useResponsive/gi, desc: '响应式逻辑' }] },
    { keyword: 'dragAndDrop', checks: [{ pattern: /onDragStart|onDragEnd|onDrop|dnd|sortable/gi, desc: '拖拽排序实现' }] },
    { keyword: 'focusRing', checks: [{ pattern: /focus.*ring|outline|:focus|focus-visible/gi, desc: '焦点样式' }] },
  ];
  const behaviorResults = [];
  for (const item of ic) {
    for (const check of item.checks) {
      const matches = [];
      for (const [rp, content] of Object.entries(allContent)) {
        const fl = content.split('\n');
        for (let i = 0; i < fl.length; i++) { check.pattern.lastIndex = 0; if (check.pattern.test(fl[i])) matches.push({ file: rp, line: i + 1 }); }
      }
      behaviorResults.push({ keyword: item.keyword, check: check.desc, found: matches.length > 0, matches });
    }
  }
  return { fileMap, allContent, behaviorResults, combinedCode, allFiles };
}

function filterPlanPathsByPhase(planFilePaths, currentPhase) {
  if (!currentPhase || ARGS.full) return { filteredPaths: planFilePaths, skippedCount: 0 };
  const fp = [], skipped = [];
  for (const p of planFilePaths) { if (p.phase === null || p.phase <= currentPhase) fp.push(p); else skipped.push(p); }
  return { filteredPaths: fp, skippedCount: skipped.length };
}

// ── 模块调度 ──
const MODULE_MAP = {
  l1_l2_traceability: 'l1-l2-traceability.js',
  l2_brief_check: 'l2-brief-check.js',
  l2_pen_check: 'l2-pen-check.js',
  d1_traceability: 'd1-traceability.js',
  d2_consistency: 'd2-consistency.js',
  d3_completeness: 'd3-completeness.js',
  d4_references: 'd4-references.js',
  d5_safety: 'd5-safety.js',
  visual_consistency: 'visual-l5l2.js',
  ipc_bridge: 'ipc-bridge.js',
  secure_storage: 'secure-storage.js',
  component_imports: 'component-imports.js',
  reverse_visual: 'reverse-visual.js',
  cross_phase: 'cross-phase.js',
  component_routing: 'component-routing.js',
  e2e_check: 'e2e-check.js',
  perf_check: 'perf-check.js',
  a11y_check: 'a11y-check.js',
  spec_ui_check: 'spec-ui-check.js',
  bound_files: 'bound-files-check.js',
  visual_regression: 'visual-regression.js',
  token_enforce: 'token-enforce.js',
  spec_to_e2e: 'spec-to-e2e.js',
  design_diff: 'design-diff.js',
  pen_extract: 'pen-extract.js',
  traceability: 'traceability.js',
  pen_sync: 'pen-sync.js',
  dep_health: 'dep-health.js',
  confirmation_guard: 'confirmation-guard.js',
};

function runCheckModule(checkName, ctx) {
  const moduleFile = MODULE_MAP[checkName];
  if (!moduleFile) return [];
  try {
    const mod = require(path.join(MODULES_DIR, moduleFile));
    return mod.check(ctx) || [];
  } catch (e) {
    if (!ARGS.jsonOnly) console.log(`⚠ 模块 ${checkName} 加载失败: ${e.message}`);
    return [];
  }
}

// ── Gate 操作 ──
function updatePhaseGate(report) {
  if (!utils.fileExists(GATE_FILE)) return { success: false, reason: '.phase-gate 不存在，无法更新' };
  if (report.summary.red > 0 || report.summary.orange > 0 || report.summary.yellow > 3)
    return { success: false, reason: `审计未通过: 🔴${report.summary.red} 🟠${report.summary.orange} 🟡${report.summary.yellow}。要求 🔴=0 🟠=0 🟡≤3` };

  const lines = utils.readFile(GATE_FILE).split('\n');
  const layerStatus = {};

  // 空 .pen 阻断：设计稿存在但为空 → L2/L3 标记 fail 而非 skip
  const penEmpty = report.penFileEmpty || false;
  for (let i = 1; i <= 5; i++) {
    if (penEmpty && (i === 2 || i === 3)) {
      layerStatus[`audit_L${i}`] = 'fail';
    } else {
      layerStatus[`audit_L${i}`] = report.layers ? (report.layers[`L${i}`] ? 'pass' : 'skip') : 'pass';
    }
  }

  if (penEmpty) {
    return { success: false, reason: 'designsDo舟.pen 文件为空（0字节）。设计稿生成中断。请重新运行 design-maker 生成设计稿后重试。L2/L3 审计标记为 fail。' };
  }
  const newLines = [];
  const existingKeys = new Set();

  for (const line of lines) {
    const m = line.match(/^(audit_L\d)=(.*)/);
    if (m) {
      const key = m[1];
      existingKeys.add(key);
      newLines.push(`${key}=${layerStatus[key] || 'skip'}`);
    } else {
      newLines.push(line);
    }
  }
  // 追加 gate 文件中缺失的 audit_L 项
  for (let i = 1; i <= 5; i++) {
    const key = `audit_L${i}`;
    if (!existingKeys.has(key)) newLines.push(`${key}=${layerStatus[key] || 'skip'}`);
  }
  utils.atomicWrite(GATE_FILE, newLines.join('\n'));
  const updated = [];
  for (const [k, v] of Object.entries(layerStatus)) updated.push(`${k}=${v}`);
  return { success: true, updated };
}

// ── 主流程 ──
function main() {
  // ═══ B1: 配置自检 ═══
  const configCheck = validateConfig();
  if (!ARGS.jsonOnly) {
    if (configCheck.warnings.length > 0) {
      console.log('⚠ 配置警告 (config vs 实际项目特征不一致):');
      for (const w of configCheck.warnings) console.log(`  🟡 [${w.check}] ${w.message}`);
      console.log('');
    }
  }
  if (!configCheck.valid) {
    if (!ARGS.jsonOnly) {
      console.log('❌ 配置自检失败 (strict=true):');
      for (const e of configCheck.errors) console.log(`  🔴 [${e.check}] ${e.message}`);
      console.log('\n修复 project.config.json 后重试。或设置 "strict": false 跳过自检。');
    }
    process.exit(1);
  }

  // ═══ Phase 0: 项目发现 ═══
  const project = discoverProject();
  if (!ARGS.jsonOnly) {
    console.log('╔══════════════════════════════════════╗');
    console.log('║   Audit Pipeline — 交叉审计执行器    ║');
    console.log('╚══════════════════════════════════════╝\n');
    console.log(`📋 Spec:  ${project.specContent ? '✅' : '❌ 未找到'}`);
    console.log(`📐 Plan:  ${project.planContent ? '✅' : '❌ 未找到'}`);
    console.log(`🎨 Brief: ${project.designBriefContent ? '✅' : '⚠ L2 降级'}`);
    console.log(`🖌  .pen: ${project.penFile ? '✅ ' + path.basename(project.penFile) : '⚠ L3 降级'}`);
    console.log(`📁 Code:  ${project.codeDir ? '✅ ' + path.relative(PROJECT_ROOT, project.codeDir) : '❌ L5 跳过'}`);
    console.log(`🔒 Gate:  ${project.phaseGate ? '✅ Phase ' + project.currentPhase : '⚠ 未初始化'}`);
    console.log(`📌 Stage: ${project.stage}\n`);
  }
  // ── B路 步骤3: 运行时证据检测 ──
  if (project.phaseGate && project.phaseGate.runtime_check === 'pass') {
    const evidenceFile = path.join(CLAUDE_DIR, '.runtime-evidence');
    const evidence = utils.readFile(evidenceFile);
    if (!evidence || evidence.trim().length === 0) {
      console.log('🟡 运行时证据缺失: .claude/.runtime-evidence 为空\n');
    } else if (evidence.includes('❌')) {
      console.log('🟡 Spec 功能验证未完成: .claude/.runtime-evidence 中存在 ❌ 项。请修复后更新证据\n');
    }
  }

  // ── B路 步骤4: E2E 用户故事脚本检查 ──
  if (project.codeDir && project.phaseGate) {
    const e2eDir = path.join(project.codeDir, 'e2e');
    if (utils.dirExists(e2eDir)) {
      const fs = require('fs');
      const specFiles = fs.readdirSync(e2eDir).filter(function(f) { return f.endsWith('.spec.ts') });
      const hasInteraction = specFiles.some(function(f) { return f.indexOf('interaction') !== -1 || f.indexOf('user-story') !== -1 || f.indexOf('phase-') !== -1 });
      if (!hasInteraction) {
        console.log('🟡 E2E 交互脚本缺失: e2e/ 目录无用户故事测试脚本。请根据 Spec 拟写 Phase 交互测试用例\n');
      }
    }
  }

  // ── B路 步骤6: 主进程重启检测 ──
  if (project.codeDir) {
    const mainTs = path.join(project.codeDir, 'electron', 'main.ts');
    const outMain = path.join(project.codeDir, 'out', 'main', 'index.js');
    if (utils.fileExists(mainTs) && utils.fileExists(outMain)) {
      const fs = require('fs');
      const mainMtime = fs.statSync(mainTs).mtimeMs;
      const outMtime = fs.statSync(outMain).mtimeMs;
      if (mainMtime > outMtime) {
        console.log('🟡 主进程代码已修改但未重建: electron/main.ts 比 out/main/index.js 新。请运行 pnpm build 并重启 Electron\n');
      }
    }
  }

  // ── B路 步骤7: 模块变化提示 ──
  const currentModuleCount = Object.keys(MODULE_MAP).length;
  const countFile = path.join(CLAUDE_DIR, '.module-count');
  const prevCount = parseInt(utils.readFile(countFile) || '0');
  if (prevCount > 0 && currentModuleCount !== prevCount) {
    console.log('🟡 审计模块数量变化: ' + prevCount + ' → ' + currentModuleCount + '。建议对已完成 Phase 执行增量审计\n');
  }
  require('fs').writeFileSync(countFile, String(currentModuleCount));
  if (project.stage === 'pre-spec') { console.log('❌ Product-Spec.md 不存在。请先完成需求收集。'); process.exit(1); }

  // ═══ Phase 1: Spec 编译 ═══
  const specCompiled = compileSpec(project.specContent);
  if (!ARGS.jsonOnly && project.specContent) console.log(`📊 Spec: ${specCompiled.summary.featureCount} 模块, ${specCompiled.summary.totalBehaviors} 行为关键词\n`);

  // ═══ Phase 2: DEV-PLAN 解析 + 代码扫描 ═══
  const plan = parsePlan(project.planContent);
  if (!ARGS.jsonOnly && project.planContent) console.log(`📐 Plan: ${plan.phases.length} Phase, ${plan.filePaths.length} 文件引用\n`);
  let codeScan = { fileMap: {}, allContent: {}, behaviorResults: [], combinedCode: '', allFiles: [] };
  if (project.codeDir && project.layers.L5) { codeScan = scanCode(project.codeDir); if (!ARGS.jsonOnly) console.log(`🔍 Code: ${Object.keys(codeScan.fileMap).length} 文件\n`); }

  // D4 的 Phase 过滤
  let planFilePaths = plan.filePaths;
  let skippedCount = 0;
  if (project.currentPhase) {
    const { filterPlanPathsByPhase } = require('./modules/d4-references.js');
    const filtered = filterPlanPathsByPhase(plan.filePaths, project.currentPhase, ARGS.full);
    planFilePaths = filtered.filteredPaths; skippedCount = filtered.skippedCount;
    if (!ARGS.jsonOnly && skippedCount > 0) console.log(`📍 Phase ${project.currentPhase} | D4 过滤 ${skippedCount} 个未来 Phase 路径\n`);
  }
  // 将过滤结果挂到 plan 上供 d4 模块使用
  plan.filePaths = planFilePaths;

  // ═══ Phase 3: 模块化审计 ═══
  const ctx = { PROJECT_ROOT, CLAUDE_DIR, SPEC_FILE, PLAN_FILE, CONFIG, ARGS,
    specContent: project.specContent, planContent: project.planContent,
    designBriefContent: project.designBriefContent, specCompiled, plan,
    codeScan, codeDir: project.codeDir, project, utils };

  const audit = {};
  const moduleLabels = {
    l1_l2_traceability: 'L1↔L2 功能覆盖', l2_brief_check: 'L2 设计规范自洽', l2_pen_check: 'L2 设计帧自洽', d1_traceability: 'D1 可追溯性', d2_consistency: 'D2 数值一致性',
    d3_completeness: 'D3 完整性', d4_references: 'D4 引用有效性',
    d5_safety: 'D5 交互安全性', visual_consistency: 'L5↔L2 视觉一致性',
    ipc_bridge: 'IPC 桥接完整性', secure_storage: 'safeStorage 安全审计',
    component_imports: '组件树完整性', reverse_visual: '反向视觉检测',
    cross_phase: '跨 Phase 接口消费',
    component_routing: '组件路由完整性', e2e_check: 'E2E 冒烟测试', perf_check: '性能预算检查', a11y_check: '无障碍检测', spec_ui_check: 'Spec→UI 检查', spec_to_e2e: 'Spec→E2E 生成',
    cross_index: '交叉索引',
  };

  for (const checkName of CONFIG.enabledChecks) {
    const label = moduleLabels[checkName] || checkName;
    if (!ARGS.jsonOnly) console.log(`━━━ ${label} ━━━\n`);
    audit[checkName] = runCheckModule(checkName, ctx);
    if (!ARGS.jsonOnly) {
      for (const r of audit[checkName]) {
        const e = r.status === '🔴' ? '🔴' : r.status === '🟡' ? '🟡' : r.status === '⏳' ? '⏳' : r.exists === false ? '❌' : '✅';
        if (typeof r.exists !== 'undefined') { if (!r.exists) console.log(`❌ ${r.file} (L${r.planLine}${r.phase ? ', P' + r.phase : ''}) → 缺失`); }
        else if (r.channel) console.log(`${r.status} ${r.channel}: ${r.issue}`);
        else if (r.label && r.status === '⏳') console.log(`⏳ ${r.label}\n   → ${r.instruction}`);
        else if (r.check) console.log(`${r.status} ${r.check} ${r.file ? '→ ' + r.file : ''}`);
        else if (r.keyword) console.log(`${r.status} [${r.keyword}] ${r.description}`);
        else if (r.type === 'numeric_conflict') console.log(`🟡 ${r.label}`);
        else if (r.page) console.log(`${r.status} ${r.page}: ${r.detail}`);
        else if (r.name) console.log(`${r.status} ${r.type} ${r.name} (${r.file}) — 未被导入`);
        else if (r.label) console.log(`${r.status} ${r.label} ${r.codeFile ? '\n   文件: ' + r.codeFile : ''}\n   → ${r.instruction || ''}`);
        else console.log(`${r.status} ${JSON.stringify(r).substring(0, 80)}`);
      }
      const reds = audit[checkName].filter(r => r.status === '🔴' || r.status === '❌').length;
      const yellows = audit[checkName].filter(r => r.status === '🟡' || r.status === '⏳').length;
      if (audit[checkName].length === 0) console.log('✅ 通过\n');
      else if (reds + yellows > 0) console.log(`\n${reds + yellows} 项需关注\n`);
      else console.log('');
    }
  }

  // D3 的交互清单和导航从 completeness 模块中分离显示（已包含在 d3_completeness 里）
  // 兼容旧版: 将 d3_completeness 中的导航和交互清单拆分到独立 key
  audit.navigation_closure = audit.d3_completeness?.filter(r => r.page) || [];
  audit.interaction_behavior = audit.d3_completeness?.filter(r => r.status === '⏳') || [];
  audit.d3_completeness = audit.d3_completeness?.filter(r => !r.page && r.status !== '⏳') || [];

  // ═══ 交叉索引分析 ═══
  const crossIssues = [];
  if (audit.l1_l2_traceability && audit.l2_pen_check) {
    const specCovered = new Set((audit.l1_l2_traceability || []).filter(function(r) { return r.status === '✅' }).map(function(r) { return r.feature }));
    const structMissing = (audit.l2_pen_check || []).filter(function(r) { return r.status === '🔴' }).map(function(r) { return r.check });
    for (var i = 0; i < structMissing.length; i++) {
      crossIssues.push({ check: '交叉索引: ' + structMissing[i], status: '🟠',
        detail: 'L1↔L2 追溯通过但 L2 结构比对发现此区块缺失——设计与 Spec 要求了但代码未实现' });
    }
  }
  audit.cross_index = crossIssues;

  // ═══ Phase 4: 汇总 ═══
  // 兼容旧版报告格式的模块别名
  audit.visual_L5_L2 = audit.visual_consistency || [];
  const allResults = [];
  const skipKeys = new Set(['visual_L5_L2']); // 别名，避免双重计数
  for (const [key, results] of Object.entries(audit)) {
    if (skipKeys.has(key)) continue;
    if (Array.isArray(results)) allResults.push(...results);
  }

  // Agent确认机制: 读取 .audit-confirmed.json, 匹配的🟡项降为🟢
  // 约束: 通配符规则只对确认文件创建时已知的项生效，防止掩耳盗铃
  const confirmedPath = path.join(CLAUDE_DIR, '.audit-confirmed.json');
  const confirmedRaw = utils.readFile(confirmedPath);
  const confirmedPatterns = confirmedRaw ? (JSON.parse(confirmedRaw).items || []) : [];
  if (confirmedPatterns.length > 0) {
    let confirmedCount = 0;
    const moduleResults = Object.entries(audit);
    for (const [moduleName, items] of moduleResults) {
      if (!Array.isArray(items)) continue;
      for (const r of items) {
        if (r.status !== '🔴' && r.status !== '❌' && r.status !== '🟠' && r.status !== '🟡' && r.status !== '⏳') continue;
        const key = moduleName + '|' + (r.check || '') + '|' + (r.label || '') + '|' + (r.detail || '');
        for (const pat of confirmedPatterns) {
          try { if (new RegExp(pat).test(key)) { r.status = '🟢'; r.found = true; confirmedCount++; break; } } catch (_) {}
        }
      }
    }
    // 安全阀: 确认超过20项时警告，防止通配符过大掩埋真问题
    if (confirmedCount > 20 && !ARGS.jsonOnly) {
      console.log(`⚠ Agent确认: ${confirmedCount}项降为🟢。请检查 .audit-confirmed.json 通配符范围是否过大。`);
    }
  }

  const redCount = allResults.filter(r => r.status === '🔴' || r.status === '❌').length;
  const orangeCount = allResults.filter(r => r.status === '🟠').length;
  const yellowCount = allResults.filter(r => r.status === '🟡' || r.status === '⏳').length;
  const greenCount = allResults.filter(r => r.status === '✅' || r.status === '🟢').length;

  if (!ARGS.jsonOnly) {
    console.log('╔══════════════════════════════════════╗');
    console.log(`║  审计汇总: 🔴${redCount} 🟠${orangeCount} 🟡${yellowCount} 🟢${greenCount}    ║`);
    console.log('╚══════════════════════════════════════╝\n');
  }

  // ═══ 报告生成 ═══
  const report = {
    timestamp: new Date().toISOString(), projectRoot: PROJECT_ROOT,
    codeDir: project.codeDir ? path.relative(PROJECT_ROOT, project.codeDir) : null,
    stage: project.stage, layers: project.layers,
    penFileEmpty: project.penFileEmpty || false,
    summary: { red: redCount, orange: orangeCount, yellow: yellowCount, green: greenCount },
    d1_traceability: audit.d1_traceability || [],
    d2_cross_doc: audit.d2_consistency || [],
    d3_completeness: audit.d3_completeness || [],
    d4_references: { total: (audit.d4_references || []).length, found: (audit.d4_references || []).filter(r => r.exists).length, missing: (audit.d4_references || []).filter(r => !r.exists).length, details: audit.d4_references || [] },
    d5_concurrency: audit.d5_safety || [],
    visual_L5_L2: audit.visual_L5_L2 || [],
    interaction_behavior: audit.interaction_behavior || [],
    navigation_closure: audit.navigation_closure || [],
    ipc_bridge: audit.ipc_bridge || [],
    secure_storage: audit.secure_storage || [],
    component_imports: audit.component_imports || [],
    reverse_visual: audit.reverse_visual || [],
    cross_phase: audit.cross_phase || [],
    cross_index: audit.cross_index || [],
    design_diff: audit.design_diff || [],
    traceability: audit.traceability || [],
    token_enforce: audit.token_enforce || [],
    pen_sync: audit.pen_sync || [],
    a11y_check: audit.a11y_check || [],
    spec_to_e2e: audit.spec_to_e2e || [],
    e2e_check: audit.e2e_check || [],
    visual_regression: audit.visual_regression || [],
    perf_check: audit.perf_check || [],
    l2_pen_check: audit.l2_pen_check || [],
    phase: project.currentPhase,
    spec: { behaviorCount: specCompiled.summary.totalBehaviors, featureCount: specCompiled.summary.featureCount },
    plan: { phaseCount: plan.phases.length, filePathCount: plan.filePaths.length },
    code: { fileCount: Object.keys(codeScan.fileMap).length },
  };

  utils.atomicWrite(REPORT_FILE, JSON.stringify(report, null, 2));

  if (ARGS.apply) {
    if (!utils.dirExists(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    const archiveName = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19) + '.json';
    fs.writeFileSync(path.join(ARCHIVE_DIR, archiveName), JSON.stringify(report, null, 2));
  }
  if (!ARGS.jsonOnly) { console.log('📊 .claude/.audit-report.json'); if (ARGS.apply || ARGS.ci) console.log('📁 .claude/audit-reports/'); }

  // ═══ 仪表板自动生成 ═══
  try {
    const dashboard = require('./dashboard.js');
    dashboard.aggregate = require('./dashboard.js').aggregate;
    const dashData = require('./dashboard.js').aggregate();
    // 直接用 aggregate 的数据生成 HTML 写入
    const fs = require('fs');
    const path = require('path');
    const html = require('./dashboard.js').generateHTML(dashData);
    fs.writeFileSync(path.join(CLAUDE_DIR, 'dashboard.html'), html);
    if (!ARGS.jsonOnly) console.log('📊 .claude/dashboard.html');
  } catch (_) { /* dashboard 生成失败不影响管线主流程 */ }

  // ═══ Auto-fix（--fix 模式）═══
  if (ARGS.fix && (report.summary.red > 0 || report.summary.orange > 0 || report.summary.yellow > 0)) {
    if (!ARGS.jsonOnly) console.log('\n🔧 --fix: 自动修复可修复项...');
    try {
      execSync(`node "${path.join(CLAUDE_DIR, 'audit-runner', 'auto-fix.js')}"`, { cwd: PROJECT_ROOT, stdio: 'inherit', timeout: 300000 });
    } catch (_) { /* auto-fix 失败不阻断 */ }
  }

  // ═══ Phase 5: Gate 更新 ═══
  // --apply: 显式更新（Agent 手动） / --ci: 通过后自动更新（CI/pre-commit）
  const shouldAutoApply = ARGS.ci && redCount === 0 && orangeCount === 0 && yellowCount <= 3;
  if (ARGS.apply || shouldAutoApply) {
    if (shouldAutoApply && !ARGS.jsonOnly) console.log('\n🔧 CI 模式：审计通过，自动更新 gate...');
    const gateResult = updatePhaseGate(report);
    if (gateResult.success) { if (!ARGS.jsonOnly) console.log(`\n✅ Gate 已更新: ${gateResult.updated.join(', ')}`); }
    else { if (!ARGS.jsonOnly) console.log(`\n❌ Gate 拒绝: ${gateResult.reason}`); process.exit(1); }
  }

  process.exit(redCount > 0 || orangeCount > 0 || yellowCount > 3 ? 1 : 0);
}

// ── B4: Meta-audit 自测 ──
// 验证管线本身没有损坏。CI 可定期调用 --self-test。
function runSelfTest() {
  const results = [];
  const pass = (name) => { results.push({ name, status: '✅' }); };
  const fail = (name, err) => { results.push({ name, status: '❌', error: err.message || err }); };

  console.log('╔══════════════════════════════╗');
  console.log('║  Meta-Audit — 管线自测       ║');
  console.log('╚══════════════════════════════╝\n');

  // 1. 模块加载测试
  console.log('📦 模块加载:');
  for (const [checkName, moduleFile] of Object.entries(MODULE_MAP)) {
    try {
      const mod = require(path.join(MODULES_DIR, moduleFile));
      if (typeof mod.check !== 'function') throw new Error('缺少 check() 导出');
      // 空上下文调用应返回数组不崩溃
      const r = mod.check({ specContent: '', planContent: '', codeScan: { fileMap: {}, allContent: {}, behaviorResults: [], combinedCode: '', allFiles: [] }, codeDir: null, CONFIG, utils, PROJECT_ROOT: '.' });
      if (!Array.isArray(r)) throw new Error('check() 未返回数组');
      console.log(`  ✅ ${checkName} (${r.length} 结果)`);
      pass(`module:${checkName}`);
    } catch (e) {
      console.log(`  ❌ ${checkName}: ${e.message}`);
      fail(`module:${checkName}`, e);
    }
  }

  // 2. 工具函数测试
  console.log('\n🔧 工具函数:');
  try {
    const testDir = path.join(CLAUDE_DIR, 'audit-runner');
    const files = utils.findFiles(testDir, ['.js'], CONFIG.ignoreDirs);
    if (files.length < 5) throw new Error(`文件数异常: ${files.length}`);
    const content = utils.readFile(files[0]);
    if (typeof content !== 'string') throw new Error('readFile 返回值异常');
    if (!utils.fileExists(files[0])) throw new Error('fileExists 异常');
    if (!utils.dirExists(testDir)) throw new Error('dirExists 异常');
    console.log('  ✅ findFiles / readFile / fileExists / dirExists');
    pass('utils:core');
  } catch (e) {
    console.log(`  ❌ ${e.message}`);
    fail('utils:core', e);
  }

  // 3. Config 解析测试
  console.log('\n⚙ Config 解析:');
  try {
    if (!CONFIG.enabledChecks || CONFIG.enabledChecks.size < 3) throw new Error('enabledChecks 异常');
    if (!CONFIG.sourceExtensions || CONFIG.sourceExtensions.length < 2) throw new Error('sourceExtensions 异常');
    if (!CONFIG.devPlan || !CONFIG.devPlan.phasePattern) throw new Error('devPlan 异常');
    console.log(`  ✅ ${CONFIG.enabledChecks.size} 个检查模块启用`);
    console.log(`  ✅ 文件后缀: ${CONFIG.sourceExtensions.join(', ')}`);
    console.log(`  ✅ 平台: ${CONFIG.projectType}, 框架: ${CONFIG.framework}`);
    pass('config');
  } catch (e) {
    console.log(`  ❌ ${e.message}`);
    fail('config', e);
  }

  // 4. Spec 编译测试
  console.log('\n📋 Spec 编译:');
  try {
    const sampleSpec = '## 功能需求\n### 测试功能\n可折叠面板\n空状态显示\n### 另一功能\n拖拽排序';
    const compiled = compileSpec(sampleSpec);
    if (compiled.features.length < 2) throw new Error(`功能提取不足: ${compiled.features.length}`);
    if (compiled.behaviors.length < 2) throw new Error(`行为提取不足: ${compiled.behaviors.length}`);
    console.log(`  ✅ ${compiled.features.length} 功能, ${compiled.behaviors.length} 行为关键词`);
    pass('spec:compile');
  } catch (e) {
    console.log(`  ❌ ${e.message}`);
    fail('spec:compile', e);
  }

  // 5. DEV-PLAN 解析测试
  console.log('\n📐 Plan 解析:');
  try {
    const samplePlan = '## Phase 1: 基础\n- `src/app.tsx`\n## Phase 2: 进阶\n- `src/extra.ts`';
    const parsed = parsePlan(samplePlan);
    if (parsed.phases.length !== 2) throw new Error(`Phase 解析异常: ${parsed.phases.length}`);
    if (parsed.filePaths.length !== 2) throw new Error(`文件路径解析异常: ${parsed.filePaths.length}`);
    console.log(`  ✅ ${parsed.phases.length} Phase, ${parsed.filePaths.length} 文件`);
    pass('plan:parse');
  } catch (e) {
    console.log(`  ❌ ${e.message}`);
    fail('plan:parse', e);
  }

  // 6. 报告格式验证
  console.log('\n📊 报告格式:');
  const reportFile = path.join(CLAUDE_DIR, '.audit-report.json');
  if (utils.fileExists(reportFile)) {
    try {
      const report = JSON.parse(utils.readFile(reportFile));
      const required = ['timestamp', 'summary', 'd1_traceability', 'd4_references'];
      const missing = required.filter(k => !(k in report));
      if (missing.length > 0) throw new Error(`缺少字段: ${missing.join(', ')}`);
      if (typeof report.summary.red !== 'number') throw new Error('summary.red 类型异常');
      console.log(`  ✅ 报告格式有效 (上次审计: 🔴${report.summary.red})`);
      pass('report:format');
    } catch (e) {
      console.log(`  ❌ ${e.message}`);
      fail('report:format', e);
    }
  } else {
    console.log('  ⏭ 无审计报告，跳过');
    pass('report:format');
  }

  // 7. Gate 格式验证
  console.log('\n🔒 Gate 格式:');
  if (utils.fileExists(GATE_FILE)) {
    try {
      const gate = utils.readFile(GATE_FILE);
      const items = gate.split('\n').filter(l => /^\w+=(pending|pass|fail|skip)$/.test(l));
      if (!gate.match(/^phase=\d+/m)) throw new Error('缺少 phase=N 行');
      if (items.length < 6) throw new Error(`关闸项不足: ${items.length}`);
      console.log(`  ✅ ${items.length} 个关闸项，格式正确`);
      pass('gate:format');
    } catch (e) {
      console.log(`  ❌ ${e.message}`);
      fail('gate:format', e);
    }
  } else {
    console.log('  ⏭ 无 gate 文件，跳过');
    pass('gate:format');
  }

  // ── 汇总 ──
  const passed = results.filter(r => r.status === '✅').length;
  const failed = results.filter(r => r.status === '❌').length;
  console.log(`\n╔══════════════════════════════╗`);
  console.log(`║  自测结果: ✅${passed} ❌${failed}          ║`);
  console.log(`╚══════════════════════════════╝`);

  if (failed > 0) {
    console.log('\n❌ 自测未通过。请检查以上失败项。');
    process.exit(1);
  }
  console.log('✅ 管线自测全部通过。\n');
  process.exit(0);
}

if (ARGS.selfTest) runSelfTest();

main();
