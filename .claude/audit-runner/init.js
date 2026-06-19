#!/usr/bin/env node
/**
 * Product-Dev-OS Init — 在新项目中初始化整套 .claude/ 工作流
 *
 * 用法:
 *   node init.js <target-dir> [--stack react-tailwind] [--platform desktop] [--dry-run]
 *
 * 示例:
 *   node init.js ../my-app --stack vue-css --platform web
 *   node init.js . --dry-run
 */

const fs = require('fs');
const path = require('path');

const ARGS = {
  target: null,
  stack: null,
  platform: null,
  dryRun: false,
  force: false,
};

for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--stack' && process.argv[i + 1]) { ARGS.stack = process.argv[i + 1]; i++; }
  else if (a === '--platform' && process.argv[i + 1]) { ARGS.platform = process.argv[i + 1]; i++; }
  else if (a === '--dry-run') ARGS.dryRun = true;
  else if (a === '--force') ARGS.force = true;
  else if (!a.startsWith('--') && !ARGS.target) ARGS.target = a;
}

// 模板目录 = 当前脚本所在目录的 ../.. （即 .claude/ 目录）
const TEMPLATE_DIR = path.resolve(__dirname, '..');

// 栈预设
const STACK_PRESETS = {
  'react-tailwind': { framework: 'react', styling: 'tailwind', language: 'typescript', extensions: ['.tsx', '.ts', '.css', '.json'] },
  'vue-css': { framework: 'vue', styling: 'css-modules', language: 'typescript', extensions: ['.vue', '.ts', '.css', '.json'] },
  'vue-tailwind': { framework: 'vue', styling: 'tailwind', language: 'typescript', extensions: ['.vue', '.ts', '.css', '.json'] },
  'next-tailwind': { framework: 'next', styling: 'tailwind', language: 'typescript', extensions: ['.tsx', '.ts', '.css', '.json'], extraIgnore: ['.next', 'public'] },
  'svelte-css': { framework: 'svelte', styling: 'css-modules', language: 'typescript', extensions: ['.svelte', '.ts', '.css', '.json'] },
  'vanilla-js': { framework: 'vanilla', styling: 'vanilla', language: 'javascript', extensions: ['.js', '.css', '.json'] },
};

// 文件复制清单（相对于 TEMPLATE_DIR）
const COPY_LIST = [
  'CLAUDE.md',
  'WORKFLOW-TIERS.md',
  'workflows.md',
  'EVOLUTION.md',
  'SKILL-DEPS.md',
  'audit-matrix.md',
  'settings.json',
];

const COPY_DIRS = ['agents', 'hooks', 'skills'];

const COPY_AUDIT = [
  'audit-runner/audit-pipeline.js',
  'audit-runner/audit-dashboard.js',
  'audit-runner/CONFIG-SCHEMA.md',
];

const COPY_AUDIT_MODULES = true; // 整个 modules/ 目录

// ── 交互式询问 ──
function prompt(question, options) {
  // 简化版：命令行参数优先，无参数时用默认值
  console.log(`❓ ${question}`);
  for (let i = 0; i < options.length; i++) console.log(`  ${i + 1}. ${options[i].label}`);
  // 非交互模式直接返回默认
  return options[0].value;
}

function resolveStack() {
  if (ARGS.stack && STACK_PRESETS[ARGS.stack]) return { name: ARGS.stack, ...STACK_PRESETS[ARGS.stack] };
  if (ARGS.stack) { console.log(`⚠ 未知栈 "${ARGS.stack}"，使用默认 react-tailwind`); }
  return { name: 'react-tailwind', ...STACK_PRESETS['react-tailwind'] };
}

function resolvePlatform() {
  if (ARGS.platform && ['desktop', 'web', 'cli'].includes(ARGS.platform)) return ARGS.platform;
  if (ARGS.platform) console.log(`⚠ 未知平台 "${ARGS.platform}"，使用默认 web`);
  return 'web';
}

// ── 生成 project.config.json ──
function generateConfig(stack, platform) {
  const config = {
    project: { type: platform },
    stack: { framework: stack.framework, styling: stack.styling, language: stack.language },
    scanning: { sourceExtensions: stack.extensions },
  };
  if (stack.extraIgnore) config.scanning.extraIgnoreDirs = stack.extraIgnore;
  // 非 UI 栈禁用视觉检查
  if (stack.framework === 'vanilla') {
    config.checks = { disabled: ['visual_consistency', 'component_imports', 'reverse_visual'] };
    config.designSystem = { source: 'none' };
  }
  return JSON.stringify(config, null, 2) + '\n';
}

// ── 文件操作 ──
function copyFile(src, dest) {
  if (ARGS.dryRun) { console.log(`  [dry] 📄 ${path.relative(TARGET, dest)}`); return; }
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  if (!ARGS.force && fs.existsSync(dest)) { console.log(`  ⏭ 已存在: ${path.relative(TARGET, dest)}`); return; }
  fs.copyFileSync(src, dest);
  console.log(`  ✅ ${path.relative(TARGET, dest)}`);
}

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  if (ARGS.dryRun) { console.log(`  [dry] 📁 ${path.relative(TARGET, destDir)}/`); return; }
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(srcDir, e.name);
    const d = path.join(destDir, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else { if (!ARGS.force && fs.existsSync(d)) continue; fs.copyFileSync(s, d); }
  }
}

function writeFile(filePath, content) {
  if (ARGS.dryRun) { console.log(`  [dry] ✍ ${path.relative(TARGET, filePath)}`); return; }
  if (!ARGS.force && fs.existsSync(filePath)) { console.log(`  ⏭ 已存在: ${path.relative(TARGET, filePath)}`); return; }
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  ✅ ${path.relative(TARGET, filePath)}`);
}

// ── 主流程 ──
function main() {
  if (!ARGS.target) {
    console.log('用法: node init.js <target-dir> [--stack react-tailwind] [--platform desktop] [--dry-run]');
    console.log('\n可用栈:');
    for (const [name, p] of Object.entries(STACK_PRESETS)) {
      console.log(`  ${name.padEnd(18)} ${p.framework} + ${p.styling} + ${p.language}`);
    }
    console.log('\n可用平台: desktop | web | cli');
    process.exit(1);
  }

  const TARGET = path.resolve(ARGS.target);
  globalThis.TARGET = TARGET; // 给 copyFile/copyDir 用
  const CLAUDE_TARGET = path.join(TARGET, '.claude');

  const stack = resolveStack();
  const platform = resolvePlatform();

  console.log('\n╔══════════════════════════════╗');
  console.log('║  Product-Dev-OS Init        ║');
  console.log('╚══════════════════════════════╝');
  console.log(`\n📂 目标: ${TARGET}`);
  console.log(`📦 栈:   ${stack.framework} + ${stack.styling} (${stack.language})`);
  console.log(`🖥 平台: ${platform}`);
  if (ARGS.dryRun) console.log('🔍 DRY RUN — 不写入文件');
  console.log('');

  // 1. 创建 .claude/ 目录
  if (!ARGS.dryRun && !fs.existsSync(CLAUDE_TARGET)) fs.mkdirSync(CLAUDE_TARGET, { recursive: true });

  // 2. 复制根级文件
  console.log('📄 核心文件:');
  for (const f of COPY_LIST) {
    const src = path.join(TEMPLATE_DIR, f);
    if (fs.existsSync(src)) copyFile(src, path.join(CLAUDE_TARGET, f));
  }

  // 3. 复制子目录
  for (const d of COPY_DIRS) {
    console.log(`📁 ${d}/`);
    copyDir(path.join(TEMPLATE_DIR, d), path.join(CLAUDE_TARGET, d));
  }

  // 4. 复制 audit-runner（管线 + 模块）
  console.log('📁 audit-runner/');
  if (!ARGS.dryRun && !fs.existsSync(path.join(CLAUDE_TARGET, 'audit-runner')))
    fs.mkdirSync(path.join(CLAUDE_TARGET, 'audit-runner'), { recursive: true });

  for (const f of COPY_AUDIT) {
    const src = path.join(TEMPLATE_DIR, f);
    if (fs.existsSync(src)) copyFile(src, path.join(CLAUDE_TARGET, f));
  }

  // 复制 modules/ 目录
  const modulesSrc = path.join(TEMPLATE_DIR, 'audit-runner', 'modules');
  const modulesDest = path.join(CLAUDE_TARGET, 'audit-runner', 'modules');
  if (fs.existsSync(modulesSrc)) {
    console.log('📁 audit-runner/modules/');
    copyDir(modulesSrc, modulesDest);
  }

  // 复制 init.js 自身
  const initSrc = path.join(TEMPLATE_DIR, 'audit-runner', 'init.js');
  if (fs.existsSync(initSrc)) copyFile(initSrc, path.join(CLAUDE_TARGET, 'audit-runner', 'init.js'));

  // 5. 生成 project.config.json
  console.log('\n⚙ 生成配置:');
  const configContent = generateConfig(stack, platform);
  writeFile(path.join(CLAUDE_TARGET, 'project.config.json'), configContent);

  // 6. 复制 feedback 模板
  const feedbackTemplatesSrc = path.join(TEMPLATE_DIR, 'feedback', 'templates');
  const feedbackTemplatesDest = path.join(CLAUDE_TARGET, 'feedback', 'templates');
  if (fs.existsSync(feedbackTemplatesSrc)) {
    console.log('📁 feedback/templates/');
    copyDir(feedbackTemplatesSrc, feedbackTemplatesDest);
  }

  // 7. 创建空目录
  const emptyDirs = ['audit-reports'];
  for (const d of emptyDirs) {
    const dp = path.join(CLAUDE_TARGET, d);
    if (ARGS.dryRun) { console.log(`  [dry] 📁 ${d}/`); continue; }
    if (!fs.existsSync(dp)) fs.mkdirSync(dp, { recursive: true });
  }

  // 8. .gitignore 建议
  const gitignorePath = path.join(TARGET, '.gitignore');
  const gitignoreEntries = '\n# Product-Dev-OS\n.claude/.phase-gate\n.claude/.audit-report.json\n.claude/audit-reports/\n.claude/.needs-review\n';
  if (ARGS.dryRun) {
    console.log('\n📝 建议添加到 .gitignore:');
    console.log(gitignoreEntries);
  } else if (fs.existsSync(gitignorePath)) {
    const existing = fs.readFileSync(gitignorePath, 'utf-8');
    if (!existing.includes('Product-Dev-OS')) {
      fs.appendFileSync(gitignorePath, gitignoreEntries);
      console.log('\n📝 .gitignore 已追加');
    }
  }

  console.log('\n✅ 初始化完成！');
  console.log(`\n下一步:`);
  console.log(`  cd ${path.relative(process.cwd(), TARGET)}`);
  console.log('  创建 Product-Spec.md');
  console.log('  运行 node .claude/audit-runner/audit-pipeline.js');
}

main();
