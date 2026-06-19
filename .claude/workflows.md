# 工作流程详情

> 本文件由 CLAUDE.md 引用。包含各阶段的完整执行步骤。
> CLAUDE.md 中保留各阶段的触发条件和简要描述，详细步骤见本文件。

---

## 需求收集阶段

触发：用户表达产品想法（自动）或调用 /product-spec-builder（手动）

执行：调用 product-spec-builder skill

完成后：输出交付指南，引导下一步

---

## 交付阶段

触发：Product Spec 生成完成后自动执行

输出：
```
✅ **Product Spec 已生成！**

文件：Product-Spec.md

---

## 📘 接下来

- 调用 /design-brief-builder 确定视觉方向（可选）
- 调用 /design-maker 生成完整设计稿（可选，需先完成 Design Brief）
- 调用 /dev-planner 制定开发计划
- 直接对话可以改 UI、加功能
```

---

## 设计规范阶段

触发：用户调用 /design-brief-builder

执行：调用 design-brief-builder skill

完成后引导：调用 /design-maker（可选）或 /dev-planner

---

## 设计图制作阶段

触发：用户调用 /design-maker

执行：调用 design-maker skill

完成后引导：调用 /dev-planner

---

## 开发计划阶段

触发：用户调用 /dev-planner

执行：调用 dev-planner skill

完成后引导：调用 /dev-builder

---

## 项目开发阶段

触发：用户调用 /dev-builder

### 第一步：询问设计稿
询问用户是否有设计稿参考。

### 第二步：进入开发
调用 dev-builder skill，进入 Plan Mode，列出当前 Phase 的 TaskList。
Agent 根据 Phase 的 Task 数量和复杂度自主判断：
→ 主 Agent 直接开发
→ 或派发 implementer Sub-Agent（每个 Task 一个 fresh 实例）

### 第三步：per-Task 开发 → review → fix 循环

对 Phase 中的每个 Task：

编码（执行规则见 dev-builder SKILL.md）
    ↓
派发 code-reviewer 两阶段审查
    ↓
Stage 1 Spec Compliance：
    → 通过 → 进入 Stage 2
    → 失败 → 补实现 → 重新派发 code-reviewer
    ↓
Stage 2 Code Quality：
    → 通过 → echo clean > .claude/.needs-review → commit → Task 完成
    → 失败 → 调用 bug-fixer 修复 → 重新派发 code-reviewer（从 Stage 1 开始）

循环直到两个 Stage 都通过。所有 Task 完成 → 进入第四步。

### 第四步：Phase 退出关闸验证（硬性门禁）
执行 dev-builder SKILL.md [Phase 退出关闸]。
重点关注跨 Task 的集成问题——导入关系、文件依赖、命名一致性。
如发现问题 → 调用 bug-fixer 修复 → 用 fix: commit message 提交 → 重新验证。

### 第五步：用户确认 Phase 完成

### 第六步：引导进入下一个 Phase，或提示可调用 /release-builder 发布

### 手动触发入口
- /code-review → 派发 code-reviewer 两阶段审查
- /bug-fixer 或报告 bug → 调用 bug-fixer skill 修复 → 建议 /code-review 验证

---

## 发布阶段

触发：用户调用 /release-builder
执行：调用 release-builder skill
完成后：展示发布结果

---

## 本地运行阶段

触发：用户说"帮我跑起来"、"启动项目"、"运行一下"等
执行：自动检测项目类型，安装依赖，启动项目

---

## 内容修订

当用户提出修改意见时：

第一步：明确变更内容
调用 product-spec-builder（迭代模式）→ 更新 Product-Spec.md → 更新 CHANGELOG

第二步：更新开发计划
调用 dev-planner（迭代模式）→ 更新 DEV-PLAN.md

第三步：执行代码变更
主 Agent 直接使用 dev-builder 或派发 implementer Sub-Agent

第四步：review → fix 循环
执行 [项目开发阶段] 第三步同样的 review → fix 循环

第五步：验证 → 用户确认
执行 dev-builder SKILL.md [Phase 退出关闸]。
完成后引导下一步。

---

## 开发测试规则

> **权威源**：本节是 CLAUDE.md [Phase 关闸] 和 dev-builder SKILL.md [Phase 退出关闸] 的速查摘要。冲突时以 CLAUDE.md 为准。

每完成一个 Phase 必须通过 Phase 关闸全部 12 项，全部 pass/skip 才能确认 Phase 完成。
关闸项定义和操作流程见 CLAUDE.md [Phase 关闸]，证据要求和四证规范见 dev-builder SKILL.md [Phase 退出关闸]。

### 验证项速查

| # | 关闸项 | 说明 |
|---|--------|------|
| 1 | tsc_check | TypeScript 严格模式编译零错误 |
| 2 | lint_check | ESLint 零警告（未配置时 skip） |
| 3 | test_check | 单元/组件/E2E 冒烟测试。标准版未配置时 skip，专业版 UI Phase 必须通过（详见 CLAUDE.md [开发测试规则] 第 3 项） |
| 4 | security_scan | npm audit + grep 硬编码密钥 |
| 5 | runtime_check | 启动应用 + 控制台无红色报错 + UI 可见 |
| 6 | design_read_check | 有 UI 交付物时通过 MCP 读取所有对应设计帧 |
| 7 | code_review | 代码审查（交互密集 Phase 必须派发 code-reviewer） |
| 8-12 | audit_L1~L5 | 五层交叉审计，由 `audit-pipeline.js --apply` 自动更新（缺失层标 skip） |

### 测试证据要求
- 编译：tsc --noEmit 输出
- Lint：eslint 输出
- 单元/组件测试：测试运行器输出（pass/fail 计数）
- E2E：Playwright 或等效工具的测试报告
- 安全：npm audit + grep 结果

Git 工作流规则见 dev-builder SKILL.md [开发规则清单]。
