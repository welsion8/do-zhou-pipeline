---
type: feedback
description: design-maker 校验阶段只做完整性/一致性/Spec对照，缺失布局合规性、视觉规范性、交互完备性三类审计维度
created: 2026-06-05
updated: 2026-06-05
occurrences: 1
graduated: true
source_skill: design-maker
scores:
  accuracy: 3
  coverage: 2
  efficiency: 2
  satisfaction: 2
  evidence: "校验阶段只检查'有没有'，不检查'对不对'和'好不好'。15+个设计问题（帧重叠、内容裁切、控件冲突、对齐不一）全部漏过。"
---

# design-maker 校验维度缺失

**问题描述**：design-maker 的 [校验阶段] 只有三个检查维度：完整性（页面够不够）、一致性（颜色/字号是否统一）、Spec 对照（功能是否遗漏）。缺失布局合规性（重叠/裁切/溢出）、视觉规范性（对齐/命名/内容/组件一致性）、交互完备性（状态覆盖/组件双态/交互链路/平台适配）三类审计维度。

**触发场景**：Do 舟设计稿产出后，用户反复发现布局问题——帧重叠、内容裁切、窗口按钮冲突、输入框宽度不统一、组件缺少 OFF 状态。每次靠人眼发现→手动修复→再发现→再修复，5+ 轮对话才修完 15+ 个问题。

**教训/建议**：已于 2026-06-05 将四阶段设计审计维度（完整性→布局合规性→视觉规范性→交互完备性）嵌入 design-maker SKILL.md [校验阶段]。对标 Figma Design Review 和 Zeplin Handoff Checklist 的 QA 标准。
