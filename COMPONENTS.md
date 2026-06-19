# 组件规范 · Do 舟

> 每个组件的完整 API：命名、变体、状态、尺寸、代码接入点。
> 开发者拿到此文档可独立实现，不需对照设计稿量尺寸。

---

## 按钮 · Ghost Button

**用途**：所有操作按钮——导入、新建、设置、发送、切换、关闭标签、操作标签。

**变体**：

| 变体 | 背景 | 边框 | 文字色 | 图标色 | 用途 |
|------|------|------|--------|--------|------|
| 默认 | 透明 | `$border-default` 1px | `$text-secondary` | `$text-secondary` | 普通操作 |
| 激活 | `$bg-active` | `$border-hover` 1px | `$text-primary` | `$text-primary` | 当前选中/主要操作 |
| 危险 Hover | `#3D2020` | `#E57373` 1px | `#E57373` | — | 删除/关闭（hover 态） |
| 禁用 | 透明 | `$border-default` 1px | `$text-tertiary` | `$text-tertiary` | opacity 0.3 |

**尺寸**：

| 尺寸 | padding | 字号 | gap | 用途 |
|------|---------|------|-----|------|
| 紧凑 | `[3, 10]` | 11px | 4px | 工具栏按钮、标签操作 |
| 标准 | `[6, 14]` | 13px | 6px | 页面按钮（导入/新建/设置） |
| 宽松 | `[8, 20]` | 14px | 6px | 空状态 CTA 按钮 |

**代码**：
```tsx
<button className="px-[10px] py-[3px] rounded-sm border border-border-default 
  bg-transparent text-text-secondary text-[11px] gap-1
  hover:bg-bg-hover hover:border-border-hover transition-all duration-150">
  <Icon name="plus" size={12} />
  新建
</button>
```

---

## 输入框 · Ghost Input

**变体**：

| 变体 | 背景 | 边框 | 文字 |
|------|------|------|------|
| 默认 | `$bg-active` | `$border-default` 1px | placeholder `$text-tertiary` |
| Focus | `$bg-active` | `$border-hover` 1px | 输入文字 `$text-primary` |
| 只读 | `$bg-panel` | `$border-default` 1px | `$text-secondary` |
| 错误 | `#3D2020` | `#E57373` 1px | `$text-primary` |

**代码**：
```tsx
<input className="px-[16px] py-[8px] rounded-sm bg-bg-active border border-border-default
  text-text-primary text-[13px] placeholder:text-text-tertiary
  focus:border-border-hover outline-none transition-all duration-150" />
```

---

## 阶段卡片 · Stage Card

**用途**：左侧创作流程导航。

**状态**：

| 状态 | 背景 | 左边框 | 文字色 | 右侧图标 |
|------|------|--------|--------|---------|
| ⏹ 未开始 | 透明 | 无 | `$text-tertiary` | 无 |
| ⟳ 进行中 | `$bg-active` | `$accent-dim` 2px | `$text-primary`(bold) | `⟳` `$text-secondary` |
| ✅ 已完成 | 透明 | 无 | `$text-secondary` | `✅` `$text-primary` |
| 展开(章节) | `$bg-active` | `$accent-dim` 2px | `$text-primary`(bold) | `⟳` |

**交互**：
- ⏹/⟳ 点击 → 加载文件 + 触发 AI
- ✅ 点击 → 仅加载文件，不触发 AI
- padding: `[$spacing-xs, $spacing-md]` (紧凑) / `[$spacing-sm, $spacing-md]` (标准)

**代码**：
```tsx
<div className={`px-[16px] py-[4px] rounded-sm 
  ${isActive ? 'bg-bg-active border-l-2 border-l-accent-dim' : ''}`}>
  <span className={isCompleted ? 'text-text-secondary' : 'text-text-primary font-semibold'}>
    ① 故事大纲
  </span>
  {isCompleted && <span className="text-text-primary">✅</span>}
</div>
```

---

## 标签页 · Tab

**用途**：编辑区多文件切换。

**状态**：

| 状态 | 背景 | 右边框 | 文字色 |
|------|------|--------|--------|
| 激活 | `$bg-editor` | 无 | `$text-primary` |
| 非激活 | 透明 | `$border-default` 1px | `$text-tertiary` |

**溢出**：
- 最小宽度 80px，超出截断为 `文件名...`
- 总宽超标签栏时底部出现 3px 横向滚动条
- 鼠标滚轮横向滑动
- 右侧 `▼` 下拉列出全部标签

**交互**：
- 双击标签名 → inline 编辑重命名
- `×` 关闭标签
- `[← 目录]` 章节标签专用，返回章节目录视图

**代码**：
```tsx
<div className={cn(
  "flex items-center gap-2 px-[14px] py-[8px] text-[12px] border-r border-border-default min-w-[80px]",
  isActive ? "bg-bg-editor text-text-primary" : "bg-transparent text-text-tertiary"
)}>
  <span className="truncate" onDoubleClick={startRename}>{filename}</span>
  <button onClick={closeTab} className="text-[14px] text-text-tertiary hover:text-text-secondary">×</button>
</div>
```

---

## 对话消息 · Chat Message

**变体**：

| 变体 | 背景 | 左边框 | 文字 | 圆角 |
|------|------|--------|------|------|
| AI 消息 | 透明 | `$accent-dim` 2px | `$text-secondary`(正文)/`$text-primary`(标题) | 无 |
| 用户消息 | `$bg-active` | 无 | `$text-primary` | `$radius-sm` |
| 系统消息 | 透明 | 无 | `$text-tertiary`(居中、极小字号) | 无 |
| 阶段分隔 | — | — | `$text-tertiary`(居中) | — |

**AI 消息内部结构**：
```
▎ [Markdown 渲染正文]
  [📝 已写入 outline.md] [✏️ 手动调整] [🔄 重新生成]  ← 幽灵按钮组
```

**代码**：
```tsx
// AI 消息
<div className="pl-[8px] border-l-2 border-l-accent-dim">
  <Markdown content={message} />
  <div className="flex gap-1 mt-2">
    <GhostButton size="compact">📝 已写入 outline.md</GhostButton>
    <GhostButton size="compact">✏️ 手动调整</GhostButton>
    <GhostButton size="compact">🔄 重新生成</GhostButton>
  </div>
</div>

// 用户消息
<div className="p-[8px] rounded-sm bg-bg-active">
  <p className="text-[12px] text-text-primary">{message}</p>
</div>

// 阶段分隔
<p className="text-center text-[10px] text-text-tertiary">── 故事大纲 · 14:30 ──</p>
```

---

## 章节索引项 · Chapter Row

**用途**：章节目录视图中的每一行。

**状态**：

| 状态 | 章节号色 | 标题色 | 背景 | 箭头 |
|------|---------|--------|------|------|
| 默认 | `$text-secondary` | `$text-primary` | 透明 | `$text-tertiary` `→` |
| Hover | `$text-secondary` | `$text-primary` | `$bg-hover` | `$text-tertiary` `→` |
| 文件不存在 | `$text-tertiary` | `$text-tertiary` | 透明 | `⚠` |

**代码**：
```tsx
<div className="flex items-center gap-[24px] py-[16px] hover:bg-bg-hover cursor-pointer">
  <span className="w-[80px] text-[14px] text-text-secondary font-semibold">第一章</span>
  <div className="flex-1">
    <p className="text-[16px] text-text-primary font-semibold font-editor">{title}</p>
    <p className="text-[12px] text-text-tertiary">{description}</p>
  </div>
  <span className="text-[14px] text-text-tertiary">→</span>
</div>
```

---

## 章节列表项 · Chapter List Item

**用途**：左侧面板阶段④下方的紧凑章节导航。

| 属性 | 值 |
|------|-----|
| 激活态 | `$bg-active` + `$radius-sm` |
| 章节号 | 12px, `$text-secondary`, bold, 固定 38px 宽 |
| 标题 | 12px, `$text-tertiary` |
| 展开/折叠 | `... 展开全部 N 章 ▾` (11px, `$accent`) |

---

## 弹窗 · Dialog

**通用结构**：
```
┌─ 标题 ────────────────────────── ✕ ─┐ ← Header: padding $spacing-lg
│                                       │
│  正文内容                              │ ← Body: padding $spacing-lg
│                                       │
├───────────────────────────────────────┤ ← Footer: padding $spacing-lg, border-top
│                    [取消]  [确认/创建]  │
└───────────────────────────────────────┘
```

| 属性 | 值 |
|------|-----|
| 宽度 | 440px |
| 圆角 | `$radius-lg` (12px) |
| 背景 | `$bg-panel` |
| 边框 | `$border-default` 1px |
| Header 底部 | `$border-default` 1px |
| Footer 顶部 | `$border-default` 1px |

**弹窗实例**：
- `u7FGO`：新建项目（单输入 + 下拉 + 取消/创建）
- `y4jkh`：导入冲突（三选一选项列表）
- `NfGnL`：删除警告（红色标题 + 取消/确认删除）
- `ehJLk`：恢复冲突（三选一选项列表）

---

## 滚动条 · Scrollbar

| 属性 | 值 |
|------|-----|
| 宽度 | 6px（对标 Arc 浏览器） |
| 轨道 | `$border-default`, radius 3px |
| 滑块 | `$text-tertiary`, radius 3px |
| Hover | 滑块变 `$text-secondary` |

---

## Tooltip · 工具提示

| 属性 | 值 |
|------|-----|
| 背景 | `$bg-panel` |
| 边框 | `$border-default` 1px |
| 圆角 | `$radius-sm` (4px) |
| 内边距 | `[$spacing-xs, $spacing-sm]` |
| 文字 | `$text-secondary`, 11px, `$font-ui` |
| 出现延迟 | 300ms hover |
| 消失 | 移开后 150ms fade-out |
| 位置 | 元素上方 6px，居中 |

**代码**：
```tsx
<div className="absolute -top-[calc(100%+6px)] left-1/2 -translate-x-1/2
  px-[8px] py-[4px] rounded-sm bg-bg-panel border border-border-default
  text-text-secondary text-[11px] whitespace-nowrap pointer-events-none
  opacity-0 group-hover:opacity-100 transition-opacity duration-150">
  {tooltip}
</div>
```

---

## Toast · 轻量通知

| 属性 | 值 |
|------|-----|
| 位置 | 页面顶部居中 |
| 宽度 | 自适应内容，最大 400px |
| 高度 | 44px |
| 圆角 | `$radius-md` (8px) |
| 出现/消失 | 从顶部滑入 200ms / 3s 后自动消失 |
| 错误变体 | 背景 `#3D2020`，边框 `#E57373`，文字 `#EF9A9A` |
| 成功变体 | 背景 `#1A2E1A`，边框 `#66BB6A`，文字 `#A5D6A7` |
| 警告变体 | 背景 `#2A2520`，边框 `#F0A060`，文字 `#F0A060` |

---

## 右键菜单 · Context Menu

**通用结构**：
| 属性 | 值 |
|------|-----|
| 宽度 | 200px（自适应内容） |
| 圆角 | `$radius-md` |
| 背景 | `$bg-panel` |
| 边框 | `$border-default` 1px |
| 菜单项 padding | `[$spacing-sm, $spacing-md]` |
| 菜单项 hover | `$bg-active` |
| 危险操作 | 文字 `#E57373`，hover 背景 `#3D2020` |
| 分隔线 | 1px `$border-default` |

**已设计实例**：
- `cQmYV`：项目右键（打开/重命名/置顶/──/移入回收站/彻底删除）
- `NFkan`：编辑器右键（复制/剪切/粘贴/──/AI重写/AI扩写/AI润色）
- `c4dNol`：文件树右键（打开/重命名/──/删除）
- `sWr5A`：标签页右键（关闭/关闭其他/关闭所有/──/复制文件路径）
