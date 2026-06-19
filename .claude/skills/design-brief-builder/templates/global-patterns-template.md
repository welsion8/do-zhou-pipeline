# 全局交互模式

> **用途**：定义产品中所有页面公用的交互模式。每个页面必须遵循此模板。
> **生成时机**：Design-Brief 定稿时同步生成。
> **约束**：代码中所有空态/错误态/加载态必须匹配此模板的模式。偏差 → 🟠。

---

## 空态 (Empty State)

```
布局: flex flex-col items-center justify-center
      最小高度: py-[80px]（桌面）或 py-[48px]（移动）
图标: text-[48px] emoji 或插画
标题: text-text-primary text-[18px] font-ui font-semibold
描述: text-text-tertiary text-[13px] max-w-[400px] text-center
行动按钮: 可选，px-[14px] py-[6px] rounded-sm border
         ghost 风格: bg-transparent border-border-default
         强调风格: bg-accent-dim/20 border-accent-dim text-accent
```

## 错误态 (Error State)

```
布局: 与空态相同结构，颜色替换为错误语义
背景: bg-[#2A2520]（暗红底）
边框: border border-[#F0A060]（暖橙边框）
图标: ⚠ emoji 或 [重试] 按钮
标题: text-[#F0A060] text-[13px] font-ui font-semibold
描述: text-[#E57373] text-[12px]
行动按钮: [重试] / [取消]，暗色背景+暖色边框
```

## 加载态 (Loading State)

```
规则: 等待时间 < 500ms → 无加载态（避免闪烁）
      等待时间 500ms-2s → spinner
      等待时间 > 2s → skeleton + 进度文字

Spinner: w-[24px] h-[24px] animate-spin border-2 border-accent-dim
Skeleton: bg-bg-active animate-pulse rounded-sm
进度文字: text-text-tertiary text-[12px] font-ui
         示例: "AI 正在生成故事大纲..."
```

## 边界态 (Edge Cases)

```
超长文本: truncate + title attribute（单行）/ line-clamp-3（多行）
超多列表项: overflow-y-auto + 虚拟滚动（100+ 项时）
空输入: placeholder 文字 + disabled 提交按钮
数值溢出: 超过 999 → 显示 "999+"
```

## 合规检查

代码审查时，逐页对比以下模式：

| 页面 | 空态模板✅ | 错误态模板✅ | 加载态模板✅ | 边界处理✅ |
|------|:--:|:--:|:--:|:--:|
| | | | | |

任何列出现 ❌ → 🟠 标记，需修复。
