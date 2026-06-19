---
type: feedback
description: FEEDBACK-INDEX.md 从未创建，evolution-engine 和 check-evolution.sh 均因索引缺失而永远返回"无进化建议"，feedback 系统形同虚设
created: 2026-06-05
updated: 2026-06-05
occurrences: 1
graduated: true
source_skill: evolution-engine
scores:
  accuracy: 3
  coverage: 1
  efficiency: 1
  satisfaction: 1
  evidence: "feedback 目录有模板、有 Skill、有 Hook，但索引文件从未初始化。整个 session 发现 40+ 问题仅 1 条被记录。"
---

# feedback 系统未初始化

**问题描述**：feedback 系统的基建（feedback-writer SKILL.md、feedback-observer Agent、feedback 模板）全部就绪，但 FEEDBACK-INDEX.md 从未被创建。check-evolution.sh 因索引文件不存在返回 0，evolution-engine 无法扫描反馈，整个进化链路断裂。

**触发场景**：Do 舟项目 session 中发现 40+ 个问题（25 项 5×5 审计发现 + 15+ 设计稿问题 + 若干架构问题），但仅 1 条 feedback 被记录（design-audit-rule）。其余 39+ 条经验全部丢失。

**教训/建议**：
1. 新项目初始化时应自动创建 FEEDBACK-INDEX.md（或由 feedback-writer 在首次写入时自动创建）
2. check-evolution.sh 检测到索引不存在时应提示"Feedback 系统未初始化，建议创建 FEEDBACK-INDEX.md"
3. feedback-observer 在 session 中的触发应更主动——不仅依赖 detect-feedback-signal hook 的关键词匹配，还应在大规模审计/修复完成后主动提示主 Agent 派发
