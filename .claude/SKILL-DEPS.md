# Skill 依赖图

> 本文档定义框架中所有 Skill 之间的依赖关系。
> 在修改任何 Skill 的输入/输出格式时，必须检查此图评估影响范围。

---

## 完整依赖图 (Mermaid)

```mermaid
graph TD
    subgraph 需求层
        PSB[product-spec-builder] --> PS[Product-Spec.md]
    end

    subgraph 设计层
        DBB[design-brief-builder] --> DB[Design-Brief.md]
        DM[design-maker] --> PEN[.pen 设计稿]
    end

    subgraph 规划层
        DP[dev-planner] --> DEVPLAN[DEV-PLAN.md]
    end

    subgraph 开发层
        DBUILD[dev-builder] --> CODE[项目代码]
        CR[code-review] --> REPORT[审查报告]
        BF[bug-fixer] --> FIX[代码修复]
    end

    subgraph 发布层
        RB[release-builder] --> RELEASE[发布产物]
    end

    subgraph 进化层
        FW[feedback-writer] --> FEEDBACK[feedback 文件]
        EE[evolution-engine] --> PROPOSAL[进化建议]
        SB[skill-builder] --> NEWSKILL[新 Skill]
    end

    PSB --> DBB
    PSB --> DP
    PS --> DBB
    PS --> DP
    DBB --> DM
    DB --> DM
    PS --> DBUILD
    DEVPLAN --> DBUILD
    DB --> DBUILD
    PEN --> DBUILD
    CODE --> CR
    CR -->|Stage 2 失败| BF
    BF -->|修复后| CR
    CODE --> RB
    PS --> RB
    FEEDBACK --> EE
    EE -->|第四层提议| SB
```

## 依赖矩阵

| Skill | 依赖的前置 Skill | 依赖的前置文件 | 被依赖的 Skill |
|-------|----------------|--------------|--------------|
| product-spec-builder | 无 | 无 | design-brief-builder, dev-planner, dev-builder, release-builder |
| design-brief-builder | product-spec-builder | Product-Spec.md | design-maker, dev-builder |
| design-maker | design-brief-builder | Product-Spec.md + Design-Brief.md | dev-planner, dev-builder |
| dev-planner | product-spec-builder | Product-Spec.md | dev-builder |
| dev-builder | dev-planner | Product-Spec.md + DEV-PLAN.md | code-review, release-builder |
| code-review | dev-builder | Product-Spec.md + 项目代码 | bug-fixer |
| bug-fixer | 无（事件触发） | 项目代码 + bug 描述 | code-review |
| release-builder | dev-builder | 项目代码 | 无 |
| skill-builder | 无（事件触发） | 无 | 无（产出新 Skill） |
| feedback-writer | 无（Sub-Agent 调用） | 无 | evolution-engine |
| evolution-engine | feedback-writer | feedback/ 目录 | skill-builder |

## 发展顺序（拓扑排序）

```
Phase 0: product-spec-builder
    ↓
Phase 1: design-brief-builder → design-maker (可选)
    ↓
Phase 2: dev-planner
    ↓
Phase 3: dev-builder → code-review ⇄ bug-fixer (review→fix 循环)
    ↓
Phase 4: release-builder
```

进化引擎（feedback-writer + evolution-engine + skill-builder）在后台并行运行，不受此顺序约束。

## 文件产出链

```
Product-Spec.md  ←  product-spec-builder
    ↓
Design-Brief.md  ←  design-brief-builder
    ↓
.pen 设计稿       ←  design-maker
    ↓
DEV-PLAN.md      ←  dev-planner
    ↓
项目代码          ←  dev-builder
    ↓
审查报告          ←  code-review
    ↓ (修复)
发布产物          ←  release-builder
```
