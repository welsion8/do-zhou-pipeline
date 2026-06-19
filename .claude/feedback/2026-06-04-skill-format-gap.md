---
type: feedback
description: 3 个 SKILL.md（design-maker/feedback-writer/evolution-engine）缺少 skill-builder 规定的必需 Section，格式规范未被 enforcement
created: 2026-06-04
updated: 2026-06-05
occurrences: 1
graduated: true
source_skill: skill-builder
scores:
  accuracy: 2
  coverage: 3
  efficiency: 3
  satisfaction: 3
  evidence: "design-maker 缺 [文件结构]，feedback-writer 缺 [依赖检测][第一性原则][初始化]，evolution-engine 缺 [依赖检测][第一性原则][文件结构][初始化]"
---

# Skill 格式合规检测缺失

**问题描述**：skill-builder 规定所有 Skill 必须有 5 个 Section（[任务][依赖检测][第一性原则][文件结构][初始化]），但 10 个 Skill 中有 3 个不达标。design-maker 缺 [文件结构]，feedback-writer 和 evolution-engine 各缺 3-4 个必需 Section。创建 Skill 后没有自动校验环节。

**触发场景**：5×5 审计 L4×D2 维度发现此问题。根本原因是 skill-builder 的"格式规范"只写了要求，但没有在创建流程的第五步（自检）中强制执行。新 Skill 创建后只检查"所有必须 Section 都有？"这一个描述性问题，没有程序化的逐项核对。

**教训/建议**：
1. skill-builder 第五步（创建文件）的自检应改为结构化检查表，逐 Section 核对
2. 应有一个全局的"Skill 格式校验"脚本或检查流程，可对所有 SKILL.md 运行
3. 已于 2026-06-04/05 补全 design-maker 的 [文件结构] 和 feedback-writer/evolution-engine 的缺失 Section
