# Design Tokens · Do 舟

> 可直接复制到项目中使用的设计变量。格式：CSS 自定义属性 + Tailwind v4 配置。

---

## 颜色系统

```css
:root {
  /* 背景色阶（深→浅） */
  --bg-base:         #0F0F11;  /* 全局底色，最深 */
  --bg-panel:        #161618;  /* 面板色 */
  --bg-editor:       #1A1A1D;  /* 编辑区底色，介于 base 和 panel 之间 */
  --bg-hover:        #1E1E22;  /* hover 提亮 */
  --bg-active:       #252528;  /* 激活/选中态 */

  /* 文字色阶（亮→暗） */
  --text-primary:    #F0EEE8;  /* 主文字，暖白 */
  --text-secondary:  #8B8A8E;  /* 次文字，说明/时间戳/文件名 */
  --text-tertiary:   #5C5B60;  /* 禁用/占位/辅助 */

  /* 边框 */
  --border-default:  #FFFFFF14; /* 默认边框，半透明白 */
  --border-hover:    #FFFFFF22; /* hover 边框，略亮 */

  /* 强调色（低饱和蓝灰，仅用于 AI 色条/链接/激活标识） */
  --accent:          #6B7A8A;
  --accent-dim:      #3D4852;

  /* 语义色（错误/警告/成功 — 仅用于状态反馈） */
  --error-bg:        #3D2020;     /* 错误块背景 */
  --error-border:    #E57373;     /* 错误块边框 */
  --error-text:      #EF9A9A;     /* 错误信息文字 */
  --warning-bg:      #2A2520;     /* 警告块背景 */
  --warning-border:  #F0A060;     /* 警告块边框 */
  --warning-text:    #F0A060;     /* 警告信息文字 */
}
```

### 颜色使用规则

| 元素 | 背景色 | 文字色 | 边框 |
|------|--------|--------|------|
| 全局页面 | `$bg-base` | — | — |
| 面板（导航/AI对话区） | `$bg-panel` | — | `$border-default` |
| 编辑区 | `$bg-editor` | — | — |
| 标题/正文 | — | `$text-primary` | — |
| 辅助说明 | — | `$text-secondary` | — |
| 占位/禁用 | — | `$text-tertiary` ⚠️ 小字 AA 不达标 | — |
| 激活标签/选中项 | `$bg-active` | — | — |
| 幽灵按钮默认 | 透明 | `$text-secondary` | `$border-default` |
| 幽灵按钮 hover | `$bg-hover` | — | `$border-hover` |
| AI 消息左侧色条 | — | — | `$accent-dim`（2px 左边框） |
| 链接/可点击文本 | — | `$accent` | — |

---

## 字体系统

```css
:root {
  --font-ui:      'Inter', -apple-system, BlinkMacSystemFont, 'Microsoft YaHei', sans-serif;
  --font-editor:  'Noto Serif SC', 'Source Han Serif', 'SimSun', serif;
  --font-mono:    'JetBrains Mono', 'SF Mono', 'Consolas', monospace;
}
```

| Token | 字体 | 用途 | 字号范围 |
|-------|------|------|---------|
| `$font-ui` | Inter / Microsoft YaHei | UI 控件、标签、按钮、面板文字 | 10-18px |
| `$font-editor` | Noto Serif SC / Source Han Serif | 编辑器正文（源码+预览） | 14-24px |
| `$font-mono` | JetBrains Mono | Markdown 源码模式 | 13-15px |

---

## 间距系统

```css
:root {
  --spacing-xs:  4px;   /* 微间距：图标与文字、紧凑 padding */
  --spacing-sm:  8px;   /* 小间距：按钮内边距、标签 gap */
  --spacing-md:  16px;  /* 中间距：面板 padding、列表项间距 */
  --spacing-lg:  24px;  /* 大间距：段落间距、card 内边距 */
  --spacing-xl:  32px;  /* 超大间距：页面 padding、section 间距 */
}
```

| Token | 值 | 典型用途 |
|-------|-----|---------|
| `$spacing-xs` | 4px | 图标-文字 gap、紧凑 padding |
| `$spacing-sm` | 8px | 按钮内边距、标签 gap、列表项间距 |
| `$spacing-md` | 16px | 面板 padding、卡片内边距 |
| `$spacing-lg` | 24px | 段落间距、表单字段间距 |
| `$spacing-xl` | 32px | 页面 padding |

---

## 圆角系统

```css
:root {
  --radius-sm:  4px;   /* 按钮、输入框、标签 */
  --radius-md:  8px;   /* 卡片、面板、下拉菜单 */
  --radius-lg:  12px;  /* 弹窗、大容器 */
}
```

---

## 可访问性 [专业版]

```css
:root {
  /* 聚焦指示 */
  --focus-ring-color: #6B7A8A;   /* = $accent */
  --focus-ring-width: 2px;
  --focus-ring-offset: 2px;

  /* 聚焦样式 */
  /* 全局：*:focus-visible { outline: var(--focus-ring-width) solid var(--focus-ring-color); outline-offset: var(--focus-ring-offset); } */

  /* 动效降级 */
  /* @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0ms !important; transition-duration: 0ms !important; } } */
}
```

### 对比度校验（WCAG）

| Token | 前景 | 背景 | 对比度 | AA 正文(4.5:1) | AA 大号(3:1) |
|-------|------|------|--------|---------------|-------------|
| text-primary | `#F0EEE8` | `#0F0F11` | **14.2:1** | ✅ AAA | ✅ |
| text-secondary | `#8B8A8E` | `#0F0F11` | **5.8:1** | ✅ | ✅ |
| text-tertiary | `#5C5B60` | `#0F0F11` | **3.1:1** | ❌ | ⚠️ 仅大号可用 |
| text-secondary | `#8B8A8E` | `#161618` | **5.2:1** | ✅ | ✅ |
| text-tertiary | `#5C5B60` | `#161618` | **2.8:1** | ❌ | ❌ 需替换 |
| accent | `#6B7A8A` | `#0F0F11` | **4.6:1** | ⚠️ 临界 | ✅ |
| accent-dim | `#3D4852` | `#0F0F11` | **2.1:1** | ❌ | ❌ 仅作装饰色条 |

> ⚠️ `$text-tertiary` 在 `$bg-base` 和 `$bg-panel` 上均不满足 AA 正文标准。仅可用于 ≥18px bold 或 ≥24px 的大号文字。小号文字（如占位符、提示文本）需提升至 `#7A7980`（对比度 4.6:1，满足 AA）。
>
> ⚠️ `$accent-dim` 仅用作 AI 消息左侧 2px 装饰色条和面板分隔线，不作为文字或交互元素颜色使用，无需满足对比度要求。

```

---

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        'bg-base':    '#0F0F11',
        'bg-panel':   '#161618',
        'bg-editor':  '#1A1A1D',
        'bg-hover':   '#1E1E22',
        'bg-active':  '#252528',
        'text-primary':   '#F0EEE8',
        'text-secondary': '#8B8A8E',
        'text-tertiary':  '#5C5B60',
        'border-default': '#FFFFFF14',
        'border-hover':   '#FFFFFF22',
        'accent':      '#6B7A8A',
        'accent-dim':  '#3D4852',
      },
      fontFamily: {
        'ui':     ['Inter', 'Microsoft YaHei', 'sans-serif'],
        'editor': ['Noto Serif SC', 'Source Han Serif', 'serif'],
        'mono':   ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      spacing: {
        'xs': '4px', 'sm': '8px', 'md': '16px', 'lg': '24px', 'xl': '32px',
      },
      borderRadius: {
        'sm': '4px', 'md': '8px', 'lg': '12px',
      },
    },
  },
};
```

---

## 滚动条样式

```css
/* 对标 Arc 浏览器 6px 极窄滚动条 */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--border-default); border-radius: 3px; }
::-webkit-scrollbar-thumb { background: var(--text-tertiary); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-secondary); }
```

---

## 动效参数

### 动效语义表 [专业版]

| 场景 | 用途分类 | 时长 | 缓动函数 | 动画属性 | reduced-motion |
|------|---------|------|---------|---------|----------------|
| 幽灵按钮 hover | state（状态过渡） | 150ms | `cubic-bezier(0, 0, 0.2, 1)` | background, border-color | 0ms instant |
| 内容块首次出现 | enter（入场） | 200ms | `cubic-bezier(0, 0, 0.2, 1)` | opacity | 0ms instant |
| 内容块关闭/移除 | exit（离场） | 150ms | `cubic-bezier(0.4, 0, 1, 1)` | opacity | 0ms instant |
| 阶段卡片激活 | state（状态过渡） | 150ms | `cubic-bezier(0, 0, 0.2, 1)` | color, background, border-left-color | 0ms instant |
| 消息流式输出 | enter（入场） | 逐字 | step-end | text content | 0ms（一次性全文显示） |
| 阶段卡片脉冲 | attention（注意） | 2s 循环 | `cubic-bezier(0.4, 0, 0.6, 1)` | opacity (0.8↔1.0) | 无动画，常亮 |
| 分隔线拖拽 hover | attention（注意） | 150ms | `cubic-bezier(0, 0, 0.2, 1)` | width, color | 0ms instant |
| 面板切换 | state（状态过渡） | 0ms（即时） | — | — | — |
| Toast 滑入 | enter（入场） | 200ms | `cubic-bezier(0, 0, 0.2, 1)` | transform(translateY) + opacity | 0ms instant |
| Toast 消失 | exit（离场） | 150ms（延迟 3s） | `cubic-bezier(0.4, 0, 1, 1)` | opacity | 0ms instant |

### 编排规则

| 规则 | 参数 |
|------|------|
| 同级元素 stagger | 间隔 50ms，从上到下依次入场 |
| 父→子延迟 | 父容器入场后 30ms 开始子元素动画 |
| 离场优先 | exit 动画先于 enter 动画执行（旧内容先走，新内容再来） |
| 拖拽释放 | 释放后 150ms ease-out 过渡到最终位置 |
| 滚动条出现 | hover 时 150ms 淡入，离开 300ms 后淡出 |

### 缓动函数定义

```css
:root {
  --ease-enter:   cubic-bezier(0, 0, 0.2, 1);   /* 入场：减速 */
  --ease-exit:    cubic-bezier(0.4, 0, 1, 1);    /* 离场：加速 */
  --ease-attention: cubic-bezier(0.4, 0, 0.6, 1); /* 注意：对称呼吸 */
  --ease-state:   cubic-bezier(0, 0, 0.2, 1);    /* 状态过渡：同入场 */
}
```

### reduced-motion 降级

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0ms !important;
  }
}
```

> 降级后所有动效变为即时切换。流式打字改为一次性展示全文。脉冲改为常亮。此为用户系统级设置，开发者无需额外适配。
