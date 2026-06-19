# 架构决策记录 (ADR)

> 记录产品开发过程中的关键架构决策——"为什么这样做"而非"做了什么"。
> 换人接手时，不需要猜当时为什么选了 A 而不是 B。

## ADR 格式

```
### ADR-{序号}: {决策标题}

**日期**: YYYY-MM-DD
**状态**: 提议 / 已采纳 / 已废弃（废弃原因）
**决策者**: {角色或姓名}

**背景**: {为什么需要做这个决策？什么约束导致了选择？}

**选项**:
  A. {方案A} — 优点/缺点
  B. {方案B} — 优点/缺点
  C. {方案C} — 优点/缺点（如适用）

**决策**: 选择 {方案X}

**理由**: {为什么选这个？关键取舍是什么？放弃了什么？}

**后果**: {这个决策带来的正面影响和需要承担的代价}
```

## 示例

```
### ADR-001: 选择 Electron 而非 Tauri

**日期**: 2026-06-04
**状态**: 已采纳
**决策者**: 产品负责人

**背景**: 需要桌面端写作工具，离线可用，文件系统访问，AI 集成。

**选项**:
  A. Electron — 成熟生态，Claude Agent SDK 原生支持 Node.js，大社区
  B. Tauri — 更小体积，更安全，但 Rust 后端，Agent SDK 需适配

**决策**: 选择 Electron

**理由**: Claude Agent SDK 的 Node.js 原生支持是硬约束。Tauri 的 Rust 后端需要额外桥接层，增加 2-3 Phase 开发量。体积差异（~150MB vs ~10MB）对桌面写作工具用户可接受。

**后果**: 需处理 Electron 签名/更新/跨平台兼容。用户需下载 ~150MB 安装包。
```

## 何时写 ADR

- 技术栈选型（Electron vs Tauri / Next.js vs Vite / Tailwind vs CSS Modules）
- 架构模式选择（IPC vs HTTP / SQLite vs JSON file / Context vs Redux）
- 关键库选择（CodeMirror vs Monaco / Playwright vs Cypress）
- 放弃某个方向的原因（"决定不做 X，因为 Y"）
- 不写：日常开发细节、小修小补、显而易见的决策
