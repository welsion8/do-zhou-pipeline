#!/usr/bin/env node
/**
 * init-project.js — FeiCai 产品开发工作流一键初始化
 *
 * 为新项目创建完整的工作流骨架：Product-Spec 模板 + DESIGN-TOKENS 模板 +
 * project.config.json + .claude/ 目录结构。
 *
 * 用法:
 *   node init-project.js <project-name>                        # 在当前目录初始化
 *   node init-project.js <project-name> --dir <target-dir>     # 指定目标目录
 *   node init-project.js <project-name> --type web             # 指定项目类型
 *
 * 生成物:
 *   Product-Spec.md (模板)
 *   DESIGN-TOKENS.md (模板)
 *   DEV-PLAN.md (空)
 *   .claude/project.config.json
 *   .claude/CLAUDE.md → 符号链接或复制模板
 *   .github/workflows/ci.yml
 *
 * 通用性: 换产品 → 改 Product-Spec.md 和 DESIGN-TOKENS.md 内容 → 其余自动生成。
 */

const fs = require('fs');
const path = require('path');

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help') {
    console.log('用法: node init-project.js <project-name> [--type web|desktop|cli] [--dir <target>]');
    console.log('示例: node init-project.js my-app --type desktop');
    process.exit(0);
  }

  const projectName = args[0];
  const typeIdx = args.indexOf('--type');
  const projectType = typeIdx >= 0 ? args[typeIdx + 1] : 'web';
  const dirIdx = args.indexOf('--dir');
  const targetDir = dirIdx >= 0 ? path.resolve(args[dirIdx + 1]) : process.cwd();
  const projectDir = path.join(targetDir, projectName);

  console.log(`\n🚀 初始化产品项目: ${projectName}`);
  console.log(`   类型: ${projectType}`);
  console.log(`   路径: ${projectDir}\n`);

  // 创建目录
  const dirs = [
    projectDir,
    path.join(projectDir, '.claude'),
    path.join(projectDir, '.claude', 'audit-runner', 'modules'),
    path.join(projectDir, '.claude', 'hooks'),
    path.join(projectDir, '.claude', 'feedback'),
    path.join(projectDir, '.claude', 'visual-baselines'),
    path.join(projectDir, '.claude', 'audit-reports'),
    path.join(projectDir, '.github', 'workflows'),
    path.join(projectDir, projectName, 'src'),
  ];
  for (const d of dirs) {
    fs.mkdirSync(d, { recursive: true });
  }

  // ── Product-Spec.md 模板 ──
  const specTemplate = `# Product Spec：${projectName}

> **版本**：v1.0
> **创建日期**：${new Date().toISOString().split('T')[0]}
> **项目类型**：${projectType}

---

## 产品概述

**${projectName}** 是一个 [一句话描述产品做什么]。

**核心定位**：[产品解决什么核心问题]

**目标用户**：[谁会使用这个产品]

**核心价值**：
- [价值点 1]
- [价值点 2]
- [价值点 3]

---

## 术语表

| 术语 | 定义 | 区别于 |
|------|------|--------|
| [术语1] | [定义] | [区别说明] |

---

## 应用场景

### 场景 1：[场景名]
[用户] [做什么]。[操作描述]。[预期结果]。

### 场景 2：[场景名]
...

---

## 功能需求

### 核心功能
- [功能 1]：[描述]
- [功能 2]：[描述]

### 辅助功能
- [功能 1]：[描述]

---

## 反功能需求（不做）

- [X]：[不做的事情 1]
- [X]：[不做的事情 2]

---

## 性能预算

| 指标 | P50 | P90 | P99 | CI 红线 | 单位 |
|------|-----|-----|-----|--------|------|
| 冷启动 | 1000 | 2000 | 3000 | P90 | ms |
| 核心操作 | 50 | 100 | 200 | P90 | ms |
| Bundle | 500 | 1500 | 3000 | P90 | KB |

---

## 降级路径

| 故障场景 | 降级策略 | 恢复方式 |
|---------|---------|---------|
| [场景 1] | [策略] | [恢复方式] |

---

## 技术栈

- 框架：[React / Vue / Next.js]
- 样式：[Tailwind / CSS Modules / styled-components]
- 语言：[TypeScript / JavaScript]
- ${projectType === 'desktop' ? '- 桌面: Electron / Tauri' : projectType === 'cli' ? '- CLI: Node.js + Commander' : '- Web: Vite / Next.js'}

---

> 本文档由 init-project.js 自动生成模板。请根据实际产品填充内容。
`;

  // ── DESIGN-TOKENS.md 模板 ──
  const tokensTemplate = `# Design Tokens · ${projectName}

> 可直接复制到项目中使用的设计变量。格式：CSS 自定义属性 + Tailwind 配置。

---

## 颜色系统

\`\`\`css
:root {
  /* 背景色阶 */
  --bg-base:    #0F0F11;
  --bg-panel:   #161618;
  --bg-hover:   #1E1E22;
  --bg-active:  #252528;

  /* 文字色阶 */
  --text-primary:   #F0EEE8;
  --text-secondary: #8B8A8E;
  --text-tertiary:  #5C5B60;

  /* 边框 */
  --border-default: #FFFFFF14;
  --border-hover:   #FFFFFF22;

  /* 强调色 */
  --accent:     #6B7A8A;
  --accent-dim: #3D4852;

  /* 语义色 */
  --error-bg:     #3D2020;
  --error-border: #E57373;
  --error-text:   #EF9A9A;
  --warning-bg:     #2A2520;
  --warning-border: #F0A060;
  --warning-text:   #F0A060;
  --success-bg:     #1A2A1A;
  --success-border: #4CAF50;
  --success-text:   #A5D6A7;
}
\`\`\`

---

## 字体系统

\`\`\`css
:root {
  --font-ui:     'Inter', sans-serif;
  --font-content: 'Noto Serif SC', serif;
  --font-mono:   'JetBrains Mono', monospace;
}
\`\`\`

---

## 间距系统

| Token | 值 | 用途 |
|-------|----|----|
| --spacing-xs | 4px | 图标间距/紧凑布局 |
| --spacing-sm | 8px | 组件内间距 |
| --spacing-md | 16px | 面板内间距 |
| --spacing-lg | 24px | 区块间距 |
| --spacing-xl | 32px | 页面边距 |

---

## 动效语义

| 用途 | 时长 | 缓动 | reduced-motion |
|------|------|------|---------------|
| hover 过渡 | 150ms | ease-out | 0ms |
| 面板展开 | 200ms | ease-in-out | 0ms |
| 弹窗出现 | 150ms | ease-out | 0ms |

---

> 本文档由 init-project.js 自动生成模板。请根据设计稿更新实际数值。
`;

  // ── project.config.json ──
  const configTemplate = {
    project: {
      type: projectType,
      codeDir: projectName,
      strict: false,
    },
    stack: {
      framework: "react",
      styling: "tailwind",
      language: "typescript",
      bundler: projectType === 'desktop' ? "electron-vite" : "vite"
    },
    designSystem: {
      source: "pencil",
      tokenMatchers: {
        width: "w-\\[?{value}px?\\]?|w-{value}\\b",
        height: "h-\\[?{value}px?\\]?|h-{value}\\b"
      }
    },
    scanning: {
      sourceExtensions: [".tsx", ".ts", ".css", ".json"]
    },
    perfBudget: {
      enforce: false,
      ciRedLine: "p90",
      targets: {
        appColdStart: { p50: 1000, p90: 2000, p99: 3000, unit: "ms" },
        coreOp: { p50: 50, p90: 100, p99: 200, unit: "ms" },
        jsBundleSize: { p50: 500, p90: 1500, p99: 3000, unit: "KB" }
      }
    },
    checks: {
      disabled: []
    },
    testCoverage: {
      enforce: false,
      targets: { lines: 60, branches: 50, functions: 60, statements: 60 }
    }
  };

  // 写入文件
  fs.writeFileSync(path.join(projectDir, 'Product-Spec.md'), specTemplate);
  console.log('✅ Product-Spec.md (模板)');

  fs.writeFileSync(path.join(projectDir, 'DESIGN-TOKENS.md'), tokensTemplate);
  console.log('✅ DESIGN-TOKENS.md (模板)');

  fs.writeFileSync(path.join(projectDir, '.claude', 'project.config.json'), JSON.stringify(configTemplate, null, 2));
  console.log('✅ .claude/project.config.json');

  fs.writeFileSync(path.join(projectDir, 'DEV-PLAN.md'), `# Development Plan — ${projectName}\n\n> 由 init-project.js 生成模板。运行 /dev-planner 生成实际计划。\n`);
  console.log('✅ DEV-PLAN.md (空)');

  fs.writeFileSync(path.join(projectDir, '.gitignore'), 'node_modules/\nout/\ndist/\n.env\n.env.local\n*.log\n.claude/audit-reports/*.json\n.claude/visual-baselines/*.png\n');
  console.log('✅ .gitignore');

  console.log(`\n📦 项目 ${projectName} 初始化完成！`);
  console.log(`\n下一步:`);
  console.log(`  1. cd ${projectDir}`);
  console.log(`  2. 填充 Product-Spec.md 功能需求`);
  console.log(`  3. 填充 DESIGN-TOKENS.md 实际设计值`);
  console.log(`  4. 运行 /product-spec-builder 或继续手动完善 Spec`);
  console.log(`  5. Spec 定稿后运行 /dev-planner 生成开发计划`);
}

main();
