# project.config.json Schema

> 每个项目一份。管线启动时读取，替代所有硬编码的框架/平台假设。
> 所有字段均可选。缺失时管线使用预设默认值（React + Tailwind + TypeScript）。

---

## 完整 Schema

```jsonc
{
  // ── 项目元信息 ──
  "project": {
    "type": "desktop",            // "desktop" | "web" | "cli" | "library" | "monorepo"
    "codeDir": null,              // 显式指定代码目录（多候选时消除歧义）
    "strict": false               // 启用配置自检（B1）— 比对 config vs 实际项目特征
  },

  // ── 技术栈声明 ──
  "stack": {
    "framework": "react",         // "react" | "vue" | "svelte" | "next" | "vanilla"
    "styling": "tailwind",       // "tailwind" | "css-modules" | "styled-components" | "vanilla"
    "language": "typescript",    // "typescript" | "javascript"
    "bundler": "auto"            // "vite" | "webpack" | "turbopack" | "electron-vite" | "auto"
  },

  // ── 文件扫描配置 ──
  "scanning": {
    // 需要扫描的源文件后缀。默认按 stack.language 推导
    "sourceExtensions": [".tsx", ".ts", ".css", ".json"],
    // 跳过的目录。与默认值合并（默认: node_modules, .git, .claude, out, dist）
    "extraIgnoreDirs": []
  },

  // ── 检查模块开关 ──
  "checks": {
    // 禁用的检查模块。清空此数组 = 全部启用。
    // 可选值: "ipc_bridge", "secure_storage", "visual_consistency",
    //         "component_imports", "reverse_visual", "cross_phase",
    //         "d1_traceability", "d2_consistency", "d3_completeness",
    //         "d4_references", "d5_safety"
    "disabled": []
  },

  // ── 设计系统配置 ──
  "designSystem": {
    // 设计稿来源。决定 L2-L3 视觉对照的精度
    "source": "pen",              // "pen" | "figma" | "none"
    // 数值 token 在代码中的匹配模式。按 stack.styling 自动选择默认模板
    // 每个模板用 {value} 占位符代入具体数值
    "tokenMatchers": {
      // 可以不写——tailwind 有内置默认
    }
  },

  // ── DEV-PLAN 格式约定 ──
  "devPlan": {
    // 默认使用内置正则，仅当你的 DEV-PLAN 格式非常规时才需覆写
    "phaseTitlePattern": null,     // null = 使用默认
    "filePathPattern": null,       // null = 使用默认
    "designValuePatterns": null    // null = 使用默认
  }
}
```

---

## 默认值推导逻辑

管线启动时，`stack` 的三个字段决定大多数默认值：

```
stack.framework = "react"
  → scanning.sourceExtensions = [".tsx", ".ts", ".css", ".json"]
  → checks.disabled (默认): framework !== "electron" → 禁用 ipc_bridge, secure_storage
  → component_imports 模块使用 React import 语法

stack.styling = "tailwind"
  → tokenMatchers 使用 w-[N]/h-[N] 模板
  → inline style 检测始终开启（补充兜底）

stack.framework = "vue"
  → scanning.sourceExtensions = [".vue", ".ts", ".css", ".json"]
  → component_imports 模块使用 Vue SFC import 语法

project.type = "desktop"
  → platform = "electron" → 启用 ipc_bridge, secure_storage

project.type = "web"
  → platform = "web" → ipc_bridge, secure_storage 禁用
```

---

## 最小配置示例

### Electron + React + Tailwind（Do舟）
```json
{
  "project": { "type": "desktop" },
  "stack": { "framework": "react", "styling": "tailwind", "language": "typescript" }
}
```
4 行。其他全部默认。

### Vue + Vite Web 应用
```json
{
  "project": { "type": "web" },
  "stack": { "framework": "vue", "styling": "css-modules", "language": "typescript" },
  "scanning": { "sourceExtensions": [".vue", ".ts", ".css"] }
}
```

### Next.js 全栈
```json
{
  "project": { "type": "web" },
  "stack": { "framework": "next", "styling": "tailwind", "language": "typescript" },
  "scanning": { "extraIgnoreDirs": [".next", "public"] }
}
```

### Monorepo（多包）
```json
{
  "project": { "type": "monorepo" },
  "stack": { "framework": "react", "styling": "tailwind", "language": "typescript" }
}
```
使用 `--scope <包名>` 指定审计目标:
```bash
node .claude/audit-runner/audit-pipeline.js --scope web     # 只审计 packages/web/
node .claude/audit-runner/audit-pipeline.js --scope api     # 只审计 packages/api/
```

### 纯 Vanilla JS CLI 工具
```json
{
  "project": { "type": "cli" },
  "stack": { "framework": "vanilla", "styling": "vanilla", "language": "javascript" },
  "scanning": { "sourceExtensions": [".js", ".json"] },
  "checks": { "disabled": ["visual_consistency", "component_imports", "reverse_visual"] },
  "designSystem": { "source": "none" }
}
```
