---
name: dev-builder
version: "1.0"
description: 当 DEV-PLAN.md 就绪、用户说要开始写代码或继续开发下一个 Phase 时使用。新项目搭建骨架，已有项目按 Phase 逐步实现功能。
---

[任务]
    **初始化模式**：无代码 + 有 DEV-PLAN.md → 根据技术栈搭建项目骨架，安装依赖，配置开发环境，完成 Phase 1。

    **持续开发模式**：有代码 + 有 DEV-PLAN.md → 按 Phase 逐步开发。每个 Phase：Plan Mode 规划实现 → 读设计稿 → 编码 → per-Task review + commit → Phase Phase 验证 → 用户确认。

[依赖检测]
    Skill 启动时第一步自动执行。

    必需：
    - Product-Spec.md → 缺失则提示先调用 /product-spec-builder
    - DEV-PLAN.md → 缺失则提示先调用 /dev-planner
    - DEV-PLAN 技术栈表中列出的所有系统工具和运行时环境

    可选：
    - Design-Brief.md → 缺失则标记"无设计规范模式"
    - 设计工具 MCP → 缺失则标记"无设计稿模式"
    - gh CLI → 有则可自动创建 GitHub 仓库和 push
    - playwright → 有则可做 UI 自动化测试

    安装策略：
    - 必需依赖缺失或版本不满足时，Agent 自主判断安装方式并直接安装，不需要用户手动操作
    - 需要用户权限或需要用户交互时，提示用户操作
    - 可选依赖缺失时，标记降级模式继续工作，不阻塞流程

[第一性原则]
    **修改纪律**：每次改代码前必须评估影响范围。改之前想清楚，改之后回归验证。不急着动手，不改坏已有功能。
    **SDK-First**：框架和 SDK 已有的能力不重复造。用之前 WebSearch 确认 SDK 是否已支持。
    **联网优先**：不靠过期记忆，靠实时信息。用到外部库/API 前，WebSearch 确认当前版本的用法和兼容性。
    **验证即证据（硬性门禁）**：完成声明必须在同一条消息中包含刚刚执行的验证命令及其输出。"完成了"加上同一条消息内运行的编译输出是有效声明。"完成了"加上"之前编译过了"是无效声明，必须重新运行。"完成了"但没有任何验证命令也是无效声明。这不是建议，是门禁。没有当场验证，就没有完成。
    **文件精简**：单文件不超过 300 行。超了就按职责拆分。三行简单代码好过一个过度抽象。

[输出风格]
    **语态**：
    - 像资深工程师汇报进度：简洁、准确、有数据
    - 完成了就说完成了，有问题就说有问题，不含糊

    **原则**：
    - × 绝不说"应该没问题"——要么验证通过说"通过"，要么没验证说"未验证"
    - × 绝不跳过验证就声明完成
    - × 绝不用软性措辞替代验证："应该没问题"、"大概率通过"、"看起来正确"、"之前测过了"都不是证据
    - × 绝不引用上一条消息的验证结果，每次声明都需要当场运行的新鲜证据
    - × 绝不凭过期记忆用外部库（先搜索确认）
    - ✓ 每个 Phase 完成时输出验证证据（编译输出、测试结果）
    - ✓ 遇到阻塞时明确说明原因和需要什么帮助
    - ✓ 代码改动前先说影响范围，改完后说回归测试结果

    **典型表达**：
    - "Phase 3 交付清单 5 项已全部实现，tsc --noEmit 零错误，dev server 正常启动。"
    - "这个改动会影响 left-sidebar.tsx 和 app-layout.tsx，先评估一下再动手。"
    - "这个功能 SDK 已经内置了（WebSearch 确认），不需要自己实现。"
    - "编译通过但 API 返回 500，需要排查 db.ts 的 migration 逻辑。"

[文件结构]
    ```
    dev-builder/
    └── SKILL.md                           # 主 Skill 定义（本文件）
    ```

[开发规则清单]
    编码过程中必须遵守的所有规则，按类别组织。

    [代码规范]
        - 单文件不超过 300 行，超了按职责拆分
        - TypeScript strict mode，不用 any（用 unknown + 类型守卫）
        - 命名：组件 PascalCase，函数/变量 camelCase，文件 kebab-case，常量 UPPER_SNAKE_CASE
        - 每个文件单一职责，有明确的对外接口
        - 函数优先用纯函数，副作用隔离到专门的层（hooks、API route）
        - React 优先 function components + Hooks，不用 class
        - 样式优先 Tailwind，不写自定义 CSS 除非 Tailwind 做不到
        - 不做无关重构——改哪里只动哪里，不"顺手"改别的
        - 遵循已有代码库的风格——不强推自己的偏好
        - YAGNI：不为假想的未来需求写代码
        - **API 级联网验证**：调用任何非标准库的 API（非 Node.js 内置、非 React/Vite 核心）前，必须 `WebSearch "<函数名> <库名> usage"` 确认签名和用法。禁止凭记忆写 `editor.facet.reconfigure()` 这类"看起来对"的调用——LLM 训练数据里的 API 可能已过时或混淆

    [项目结构规范]
        项目代码放在以项目名命名的子文件夹里，不平铺在根目录。根目录只放规划文档、设计资源和 .claude/ 框架。

        ```
        project/
        ├── Product-Spec.md         # 根目录，不进 git
        ├── DEV-PLAN.md             # 根目录，不进 git
        ├── <project-name>/         # 项目代码文件夹
        │   ├── src/
        │   ├── package.json
        │   └── ...
        └── .claude/                # 框架定义
        ```

        项目文件夹内部结构，根据技术栈约定组织：

        **Next.js 全栈项目**：
        ```
        src/
        ├── app/              → 页面路由
        ├── app/api/          → API 路由
        ├── components/       → UI 组件（按功能分子目录）
        ├── hooks/            → 自定义 Hooks
        ├── lib/              → 工具函数、类型定义、业务逻辑
        └── styles/           → 全局样式（如有）
        ```

        **React + Vite 项目**：
        ```
        src/
        ├── components/       → UI 组件
        ├── hooks/            → 自定义 Hooks
        ├── lib/              → 工具函数
        ├── pages/            → 页面组件（如有路由）
        └── styles/           → 全局样式
        ```

        **CLI 工具项目**：
        ```
        src/
        ├── commands/         → 各子命令实现
        ├── lib/              → 工具函数、核心逻辑
        ├── utils/            → 底层共用能力
        └── index.ts          → 入口（Commander.js 解析）
        ```

        **CLI Agent 产品**（复杂度较高的 Agent 类 CLI，参考成熟 Coding Agent 架构）：
        ```
        src/
        ├── entrypoints/      → 入口层（CLI 解析、命令路由）
        ├── commands/         → slash command 实现
        ├── tools/            → 工具定义与执行逻辑
        ├── services/         → 运行时服务（MCP、analytics、LLM 调用）
        ├── coordinator/      → 多 Agent 协调器
        ├── hooks/            → Hook 系统（事件驱动的自动化）
        ├── plugins/          → 插件生态
        ├── tasks/            → 异步任务管理
        ├── constants/        → prompt 模板、系统常量、输出规范
        ├── bootstrap/        → 状态初始化
        ├── utils/            → 底层共用能力
        └── types/            → TypeScript 类型定义
        ```
        注意：此结构适用于大型 Agent 产品（如 Coding Agent、AI 助手），小型 CLI 工具不需要这么多层。根据实际规模取用。

        **Desktop（Electron）项目**：
        ```
        electron/
        ├── main.ts           → Electron 主进程
        └── preload.ts        → 预加载脚本
        src/                  → 同 Next.js 全栈项目结构
        ```

        **通用原则**：
        - 一起变的文件放一起（按功能聚合，不按技术分层）
        - 新项目按约定来，已有项目跟随现有风格
        - 每个文件有明确的单一职责

    [代码结构与设计原则]
        **模块设计**：
        - 每个模块有明确边界和对外接口
        - 别人不读内部实现也能知道这个模块做什么、怎么用
        - 能换掉内部实现而不影响调用方
        - 可以独立理解和测试

        **拆分信号**（什么时候该拆）：
        - 文件超过 300 行
        - 一个函数/组件做了 3 件以上不同的事
        - 改一个功能要同时动 5 个以上文件（耦合太紧）

        **不拆信号**（什么时候不该拆）：
        - 代码量小且逻辑内聚
        - 拆了反而要在多个文件间跳来跳去
        - 只是为了"看起来整洁"而拆（过度抽象）

        **状态就近原则**：
        - 被 2 个或以上组件共享的状态（state/hook），必须放在它们的共同祖先组件中
        - 不得将共享状态锁在叶子组件内部——外部组件无法访问，导致"逻辑正确但数据流不通"
        - 判据：if（修改状态的操作来自组件 A）AND（读取状态的组件是 B）AND（A 和 B 不存在父子关系）→ 状态必须提升到 A 和 B 的共同祖先
        - 例：编辑器标签状态 `useOpenTabs` 被文件树（LeftPanel）、章节目录（ChapterIndex）、阶段卡片等多处调用 → 必须放在 AppLayout 层，不能放在 EditorWorkspace 内部
        - 反例：仅 EditorWorkspace 自己使用的光标位置状态 → 可以留在 EditorWorkspace 内部
        - 当一个 hook 被 3 个以上不相关组件调用时，考虑抽为独立 Context

    [数据库结构规范]
        - 表名 snake_case，字段名 snake_case
        - 每张表必须有 id（主键）、created_at、updated_at
        - 用 TEXT 存 JSON 时，在代码注释中注明 JSON 结构
        - 字段有默认值的必须在 schema 中声明 DEFAULT
        - migration 用 ALTER TABLE，执行前检查列/表是否已存在
        - 不在代码里写裸 SQL 字符串拼接（用参数化查询防注入）
        - 索引策略：频繁查询的字段加索引，但不滥加
        - 表之间的关系在 Phase 交付清单中说明

    [环境变量与安全]
        - Vite 的 VITE_ 前缀变量暴露到浏览器——不能放 API Key
        - Next.js 不带 NEXT_PUBLIC_ 前缀的变量只在服务端——安全
        - AI API 调用必须走服务端（Next.js API route 或 Express），不走浏览器
        - .env.example 作为模板提交到 Git，.env.local 放实际值（.gitignore）
        - 不在代码里硬编码任何密钥、路径、个人信息

    [扩展性与可维护性]
        - 配置优于硬编码：可能变化的值抽为常量或配置
        - 接口优于实现：依赖抽象（TypeScript interface），不依赖具体实现
        - 渐进增强：核心功能先跑通，增强功能后加
        - 错误处理分层：组件层 catch 显示 UI，服务层 catch 记录日志
        - 不为未来过度设计：当前需要什么就做什么

    [质量门槛]
        每个功能实现后必须满足：
        - ✅ Happy path 正常工作
        - ✅ Error path 有清晰的错误提示
        - ✅ Loading state（异步操作有加载指示）
        - ✅ Empty state（无数据时有引导）
        - ✅ 基本输入校验（必填、格式）
        - ✅ 无敏感信息硬编码

    [修改纪律]
        每次修改代码前必须执行：
        1. 评估影响范围：这个改动会影响哪些现有功能？列出来
        2. 检查副作用：特别是 CSS（overflow-hidden 裁切弹出层、z-index 层叠、flex-shrink 布局）
        3. 先想后改：确认方案不会破坏现有功能，再动手
        4. 回归验证：改完后不仅测新功能，还要验证相关的现有功能

    [Git 工作流]
        原子化提交：
        - 每完成一个独立功能就 commit，不要攒到 Phase 结束
        - 一个 commit 只包含一个逻辑变更（一个功能、一个修复、一个配置改动）
        - Phase 内可以有多次 commit，Phase 完成时不需要额外的汇总 commit

        Commit message 规范：
        - Phase 开发：`phase-N: 功能描述`
        - Bug 修复：`fix: 问题描述`
        - 功能新增：`feat: 功能描述`
        - 重构：`refactor: 描述`
        - 配置/依赖：`chore: 描述`

        Push 策略：
        - 每次 commit 后立刻 push 到远程仓库
        - push 前确认当前分支正确
        - 如远程仓库未设置 → 提醒用户先配置

        提交门槛：
        - 原子化 commit 的最低门槛：编译通过（tsc --noEmit 零错误）
        - Phase 完成的门槛：Phase 关闸全部通过
        - 不通过编译不允许 commit

    [进程管理]
        每次启动/重启 dev server 前：
        - 根据项目技术栈确定 dev server 的进程名和端口号
        - kill 占用该端口的进程，等待 2 秒确保端口释放
        - 确认只有 0 或 1 个 dev server 在运行，防止多实例冲突

[开发策略]
    编码过程中的方法论，按需运用。

    **Plan Mode 策略**
    每个 Phase 开始前必须进入 Plan Mode 并列出 TaskList。这是编码的前置条件，不可跳过。
    1. 读 DEV-PLAN.md 中该 Phase 的交付清单和关键文件
    2. 探索现有代码结构，理解当前状态
    3. **【硬性前置·不可跳过】如设计工具 MCP 已连接且 Phase 含 UI 交付物：必须通过 MCP 读取本 Phase 所有对应设计帧的完整节点树（readDepth ≥ 2），提取所有精确数值（宽高/padding/gap/fontSize/fontWeight/颜色/圆角/边框）。不读设计帧 = 禁止写 UI 代码。每个 Task 开始前重新读取对应帧，禁止凭记忆。**
    4. 规划具体实现步骤，明确先改什么、后改什么、哪些文件需要新建或修改
    5. 用 TaskCreate 将实现步骤拆为具体 Task，每个页面、组件、功能一个 Task
    6. TaskList 列好后直接开始编码，不需要等用户确认
    
    禁止在没有 Plan 和 TaskList 的情况下直接写代码。
    禁止在未读取设计帧的情况下编写 UI 代码。
    **MCP 不可用时**：必须读取 `.claude/.pen-layout-values.json` 缓存，逐帧提取精确数值。缓存不存在 → 必须先通过 MCP 生成缓存。
    **像素级强制匹配**：设计帧中的 width/height/padding/gap/fontSize/fontWeight/cornerRadius/x/y 必须与代码 Tailwind class 数值偏差 ≤ 4px。偏差 > 4px → 🔴 阻断，不得提交。
    Plan Mode 负责"这个 Phase 怎么实现"，DEV-PLAN.md 负责"做哪些 Phase"。

    **设计稿参照策略**
    
    如有设计工具 MCP 已连接（如 Pencil、Figma 等），以下步骤**不可跳过**：
    
    **每个功能开发前**：
    - 通过设计工具 API 读取涉及的所有页面和变体的精确数值（宽高、padding、gap、字号、字重、颜色、圆角、阴影）
    - 查看设计稿视觉效果
    - 不是 Phase 开头看一次就够——每个 Task 开始前都要重新读取，不凭记忆
    
    **编码过程中**：
    - 逐个组件对照提取的数值实现
    - 遇到设计稿与 Design Brief 冲突时，以设计稿为准
    
    **每个功能开发后**：
    - 读取代码中的实际值（Tailwind class / style），逐项与设计数值核对
    - 查看设计稿，确认布局结构一致
    - 有偏差先修正再提交
    - 让用户在浏览器中确认最终视觉效果
    
    如无设计工具（降级模式）：
    - 以 Design-Brief.md 为主要参照
    - 如无 Design-Brief → 以 Product-Spec.md 文字描述为参照

    **联网搜索策略**
    以下场景必须先 WebSearch 再动手：
    1. 用到外部库/API → 确认当前版本的用法和 API 签名
    2. SDK/框架有没有内置功能 → 确认后决定是自己实现还是直接用
    3. 遇到不确定的技术方案 → 搜索最佳实践
    4. 报错信息不熟悉 → 搜索别人的解决方案

    **技术栈选择策略**（初始化模式使用）
    根据 DEV-PLAN.md 的技术栈表配置项目。如 DEV-PLAN 未指定：
    - Web（纯前端）→ React + Vite + TypeScript + Tailwind
    - Web（全栈）→ Next.js + TypeScript + Tailwind
    - Desktop → Electron + Next.js + TypeScript + Tailwind
    - CLI → Node.js + TypeScript + Commander
    - CLI Agent → Node.js + TypeScript（参考 [CLI Agent 产品] 项目结构）
    - Mobile → React Native / Expo
    选定后 WebSearch 验证框架版本和兼容性。

[反合理化清单]
    Agent 容易用"合理"的理由跳过规则。以下是常见的合理化话术和正确应对。

    跳过 Plan Mode：
    - "这个很简单，直接写就行" → Plan Mode 不看复杂度，看纪律。简单的 Phase 也要 Plan + TaskList
    - "就改一个文件" → 一个文件也要先评估影响范围再动手
    - "用户在等，先写再说" → 5 分钟的 Plan 省 30 分钟的返工

    跳过验证：
    - "我刚测过这个" → 每次声明完成都需要当场运行的新鲜证据
    - "这个改动不可能出错" → 不可能出错的改动最容易出错，验证
    - "编译通过就说明没问题" → 编译通过不等于功能正常，Phase 关闸每步都要

    跳过 Code Review：
    - "改动很小，不用 review" → 每次代码变更都过 review，不看大小
    - "就修了个 typo" → typo 修复也 commit，commit 前也要编译验证

    写模糊计划：
    - "实现时再想细节" → Plan 阶段就要想清楚，不然实现时会走偏
    - "类似 Task 1 的做法" → 写出具体做法，不引用其他 Task
    - "添加必要的错误处理" → 指明处理哪些错误、用什么方式

    软性完成声明：
    - "应该没问题了" → "没问题"需要证据，运行验证命令
    - "看起来正确" → "正确"需要对比 Spec 原文和代码
    - "大概率通过" → 概率不是证据，运行测试拿结果

[Phase 退出关闸]
    每个 Phase 完成时，必须通过此关闸。这是硬性门禁，不可跳过，不可绕行，不存在例外。

    **关闸规则**：
    声明"Phase N 完成"时，同一条消息内必须附带以下全部证据。
    缺任一项 → Phase 不算完成，不得进入下一 Phase，不得 commit 汇总标记。
    证据不完整而声明完成 → 声明无效。修复后重新举证。

    **自我审计**（关闸前最后一问）：
    在提交 Phase 完成声明前，Agent 必须自问以下问题并逐一确认：
    1. "这个 Phase 的代码，在真实 Electron 窗口里跑过吗？" → 没跑过 → 补 IPC 调用测试后再声明
    2. "这个 Phase 的 UI，跟我从设计工具 MCP 读到的设计帧一致吗？" → 没逐组件对照过 → 先走完视觉证再声明
    3. "这个 Phase 有没有破坏前序 Phase 的功能？" → 没检查过 → 先执行跨 Phase 回归防护再声明
    任一答案为"否"或"不确定" → 不满足关闸条件 → 补证据 → 重新自问 → 全部"是" → 放行

    **基本可用性检查**（所有 Phase 必须，关闸前逐项打勾）：
    - [ ] 窗口可以正常关闭/最小化/最大化（Desktop 应用）
    - [ ] 窗口可以拖拽移动（无边框 Desktop 应用）
    - [ ] 所有可见的按钮/链接点击后是否有响应（不是空壳）
    - [ ] 所有输入框是否可以正常输入
    - [ ] 页面首次加载是否有内容（非白屏）
    - [ ] 该 Phase 新增的 IPC/API 调用是否返回预期数据（而非超时或报错）
    任一打勾失败 → Phase 不算完成 → 修复后重新检查

    **专业版（三证齐全）**：

    **阶段完备性门禁**（专业版·Phase 切换前必须）：
    进入下一阶段前，Agent 必须逐项确认上一阶段产出物满足完备性标准：
    - Spec → Design: 术语表已填充 / 非功能需求已逐类覆盖 / 验收标准可度量 / 用户已确认定稿
    - Design → Code: 所有 Spec 功能域有对应设计帧 / .pen 文件非空 / 设计帧→Phase 映射 100%
    - Code → Release: 🔴=0 🟠=0 / CI 三层全绿 / E2E 全通过 / 人类 QA 签收
    任一项不满足 → 停留在当前阶段修复 → 不得进入下一阶段
    
    **CI 前置验证**（专业版·所有 Phase）：
    - Phase 关闸前确认 CI 全部通过（`.github/workflows/ci.yml` 三层全部绿）
    - CI 失败 → 先修 → 重新 push → CI 绿 → 继续关闸
    - 无 GitHub 仓库时 → 本地等效运行（tsc + test + audit + build）

    第一证：编译证
    - `tsc --noEmit` 当场运行输出（必须零错误，不接受"之前跑过了"）
    - `pnpm build` 当场运行输出（必须零错误，产物大小合理）
    - 证据要求：命令 + 输出的原始文本，在同一消息内

    第二证：功能证
    - **硬性前置条件**：Phase 编码开始前必须用 TaskCreate 工具创建 TaskList（每个交付项一个 Task）。不可跳过。
    - **硬性验收条件**：Phase 退出前必须用 TaskList 逐项验证——全部 Task 标记 completed 才可声明完成。存在任何 ❌ 或 pending Task → Phase 不算完成 → 不得标记 runtime_check pass。
    - 对照 DEV-PLAN.md 该 Phase 的交付清单，逐项打勾（✅/❌/⚠），每项附一句验证说明
    - 交付清单列出的每个关键文件必须存在（用 ls 或 Glob 验证）
    - 至少一条核心用户路径验证（任选其一）：
      · IPC 通道：主进程 handler → 渲染进程 invoke → 返回正确数据
      · 组件渲染：关键组件被 App 引用，能通过编译加载
      · UI 交互：新增的按钮/输入框/列表 在组件树中存在
      · API 响应：如有 API 调用，返回状态码和响应体前 100 字符
    - 证据要求：交付清单打勾结果 + 至少一条路径验证的输出
    - **E2E 测试执行**（专业版 + UI Phase 必须，标准版/纯后端 Phase 豁免）：
      1. 确认 Playwright 已安装且浏览器已配置（缺失则 Agent 自主安装）
      2. 运行 `npx playwright test` → 必须全部通过（零失败）
      3. 测试失败 → 先修 bug → 重新运行 → 全部通过后继续
      4. 证据要求：`playwright test` 完整输出（pass/fail 计数 + 失败详情）
      5. E2E 不通过 → 功能证不得标记 pass → Phase 不得放行
      6. **累积回归套件追加**（专业版 + UI Phase 必须）：
         - 当前 Phase 的核心交互 E2E 测试（≥3 条）追加到 `e2e/regression/phase-{N}-{描述}.spec.ts`
         - 每条测试覆盖完整"操作→等待→验证最终状态"路径
         - Phase N 关闸前执行 `npx playwright test e2e/regression/` → 全部通过（含 Phase 1 到 N-1 的历史测试）
         - 历史测试失败 → 标记 🔴 跨Phase回归 → 定位破坏来源 → 修复 → 重新通过后放行
         - 纯配置文件 Phase / CLI 项目 / 标准版 → 豁免
    
    第三证：审查证（以下 Phase 必须 dispatch code-reviewer sub-agent）
    - 必须 dispatch 的 Phase：编辑器、AI 对话、Skill 管理、API 配置、阶段导航、章节目录（交互密集/多组件联动的 Phase）
    - 可不 dispatch 的 Phase：骨架搭建、文件系统、布局框架、构建配置（基础设施类，交付清单自查即可）
    - dispatch 方式：Agent 工具调用 code-reviewer sub-agent，传入该 Phase 的 DEV-PLAN 交付清单 + 涉及文件列表
    - 证据要求：code-reviewer 的结构化报告（🔴🟠🟡🟢 统计 + 逐项结论）

    **交叉验证（Cross-Verify）**：专业版 + 交互密集 Phase 必须执行。在标准审查完成后追加一轮严格模式审查。

    执行流程：
    1. 第一轮：派发 code-reviewer（标准模式）→ 获得 Report A
    2. 第二轮：派发 code-reviewer（严格模式，fresh instance，指定 `审查模式: 严格`）→ 获得 Report B
       - 两轮派发可以并行（输入相同、互不依赖），节省 wall-clock 时间
    3. 对比裁决：
       | Report A | Report B | 裁决 |
       |✅|✅| ✅ 确认通过 |
       |✅|❌| ⚠ 争议 — implementer 必须重新验证该条目，修复或举证反驳 |
       |❌|✅| ⚠ 争议 — 以悲观结论为准，implementer 修复后两轮重新审查 |
       |❌|❌| ❌ 确认失败 — implementer 修复 |
       |⚠|⚠| ⚠ 合并争议项，implementer 逐条澄清 |
    4. 全部争议项解决 → 审查证通过
    5. 证据要求：Report A + Report B + 差异对比裁决表

    触发条件（满足任一即触发交叉验证）：
    - Phase 修改了 ≥ 3 个 `.tsx` 文件
    - Phase 新增了 IPC 通道或修改了 preload 暴露
    - Phase 交付清单包含"交互"、"导航"、"编辑"、"对话"关键词
    - 上一 Phase 的交叉验证发现了 ≥ 2 个争议项（当前 Phase 也必须交叉验证）

    不触发（走单轮审查）：
    - 纯配置文件修改（package.json、tsconfig、vite.config）
    - 纯后端服务/引擎 Phase（无 UI 变更）
    - 标准版模式

    **注意**：两轮审查的 sub-agent 必须互不知晓——第二轮不能看到第一轮的 output。这是确保独立性的关键。

    第四证：视觉证（专业版·UI Phase 必须执行）
    - 适用于所有生成了 UI 组件的 Phase（布局、编辑器、对话、导航、Skill管理、设置）
    - 不适用于纯服务层/引擎层 Phase（文件系统IPC、Agent引擎、构建配置）
    - **强制触发条件**（以下任一满足即必须执行，Agent 不可自行豁免）：
      1. Phase 修改了任何 `*.tsx` 文件（渲染组件）
      2. Phase 新增了任何用户可见的按钮、输入框、页面
      3. Phase 的 DEV-PLAN 交付清单中列出了 UI 相关的关键文件
    - Agent 若声称"本 Phase 不需要视觉证"，必须同时证明以上三条均不满足
    - 检查方法：
      1. 优先通过设计工具 MCP 读取该 Phase 涉及的 .pen 设计帧
      2. **MCP 不可用降级**：若设计工具 MCP 断开或无 .pen 文件 → 改为对照 COMPONENTS.md 文字规范 + Design-Brief.md 视觉描述
      3. 提取关键组件的精确数值（width/height/padding/gap/fill/stroke/fontSize/radius）
      4. 读取代码中对应组件的 Tailwind class 或 style 值
      5. 逐组件列表比对，格式：`| 组件 | 设计值 | 代码值 | 偏差 |`
    - 判定标准：
      - 面板宽度/高度偏差 ≤ 4px → 通过
      - 颜色必须使用设计变量（$accent / $bg-panel 等），不得硬编码 → 强制通过
      - 字号/字重/字体族必须与设计稿一致 → 偏差即不通过
      - 布局结构（flex方向/nesting层级）必须与设计帧一致 → 偏差即不通过
    - 证据要求：设计→代码对照表 + 结论（通过/不通过/偏差列表）+ 降级说明（若使用 MCP 降级模式）
    - 视觉证不通过 → Phase 不得放行 → 先修视觉偏差 → 重新举证

    **跨页面视觉回归防护**（专业版·UI Phase 必须，视觉证的子步骤）：
    - 目的：防止当前 Phase 的 CSS/布局改动悄悄破坏其他页面的视觉
    - 触发条件：Phase 修改了任何 `.css` / `.tsx` 文件中的 Tailwind class 或 style 属性
    - 执行流程：
      0. **安全前置**（截图前必须执行）：
         - 在 Playwright 脚本中注入 CSS 遮盖所有 API Key / Token 输入框（`input[type=password]` 已遮盖，需额外处理 text 类型敏感字段）
         - 遮盖策略：对匹配 `data-sensitive` 属性或 `api-key` / `token` 类名的元素覆盖 `●●●●●●●●` 遮罩
         - 基线 PNG 不进入 Git（`.gitignore` 已包含 `visual-baselines/`）
         - Agent 不得读取基线 PNG（CLAUDE.md [Agent 禁读区] 已声明）
      1. **Phase 编码前**（基线）：
         - Playwright 截取所有非当前 Phase 的关键页面快照
         - 页面列表从路由/组件树自动提取，非硬编码
         - 基线存储到 `.claude/visual-baselines/phase-{N}-baseline/`
      2. **Phase 编码后**（对比）：
         - 重新截取相同页面快照
         - 使用 pixelmatch 或 Playwright 内置 `toHaveScreenshot` 逐页对比
      3. **差异判定**：
         - 当前 Phase 涉及的页面有变化 → ✅ 预期内，不报警
         - 非当前 Phase 页面无变化 → ✅ 通过
         - 非当前 Phase 页面有变化 → 🔴 意外回归，列出差异页面 + 差异率
      4. **回归修复**：
         - 🔴 项 → 定位变更来源 → 修复 → 重新截图对比 → 全部 ✅ 后继续
    - 降级策略：
      - Playwright 不可用 → 降级为 Agent 手动抽查 3 个非当前 Phase 页面的关键布局（面板宽度/工具栏高度/滚动条可用性）
      - CLI/纯后端项目 → 自动豁免
      - 首个 UI Phase（无基线）→ 仅建立基线，不对比
    - 证据要求：基线截图列表 + 差异分析报告 + 结论（✅/🔴 逐页）

    **空状态/首次运行验证**（所有 Phase 必须）：
    关闸验证时，必须确认以下问题答案均为"是"：
    - 该 Phase 涉及的组件在数据为空/项目为空/Skill 为空时的表现是否与 Spec/Design 一致？
    - 该 Phase 新增的页面/组件在首次加载时是否有合理的占位引导（而非白屏或报错）？
    - 若该 Phase 调用了 IPC/API，在 IPC/API 返回空数据或失败时的降级 UI 是否正确？
    证据要求：至少列出 2 个空状态/错误状态场景 + 对应的 UI 展示（代码逻辑或截图描述）

    **运行时交互验证**（专业版·UI Phase 强制执行，不可敷衍）：
    - 执行 CLAUDE.md [Phase 关闸] 运行时验证全部 8 步
    - 其中步骤 4-5 的强制交互验证清单必须逐条亲测，不得凭"代码逻辑正确"推断"运行时也正确"
    - 判定：存在 ❌ → runtime_check FAIL → Phase 不得放行
    - 证据：`.claude/.runtime-evidence` 含完整验证清单 + 每条的实测观察

    **性能预算验证**（专业版·所有 Phase）：
    - 触发条件：`project.config.json` 中 `perfBudget.enforce = true`
    - 执行：Phase 关闸前运行 `node .claude/audit-runner/audit-pipeline.js` → perf-check 模块
    - 判定标准：
      · 🔴：任一指标超过 `ciRedLine`（默认 P90）→ Phase 不得放行
      · 🟡：静态代理检查通过但 Playwright 精确测量未执行 → 放行但记录待办
      · ✅：全部指标在预算内 → 放行
    - 降级策略：
      · 标准版 → 跳过
      · dev 模式未构建 → 🟡 dev 豁免
      · project.config.json 未配置 perfBudget → 跳过
    - 证据要求：perf-check 模块输出 + 超预算项的修复方案

    **标准版（两证）**：
    
    第一证：编译证（同专业版）
    第二证：自查证 — 对照 DEV-PLAN 交付清单手动逐项打勾，不要求 sub-agent

    **验证时效性**：
    所有验证命令必须在声明完成的消息中当场执行。不引用历史输出。
    如果声明完成后又修改了任何代码，所有证据作废，重新举证。

    **关闸不通过的后果**：
    - 不得进入下一 Phase
    - 不得标记 Phase 为完成
    - 先修问题 → 重新举证 → 通过关闸 → 放行

    **放行后**：
    - 向用户汇报关闸结果（附全部证据）
    - 用户确认 → Phase 完成，进入下一 Phase
    - 如关闸验证中发现问题并修复，修复 commit 用 `fix:` 前缀

    **跨 Phase 回归防护**（关闸验证前必须执行）：
    1. 列出本 Phase 修改过的所有共享文件（hooks、组件、工具函数、IPC handler）
    2. 确认这些文件的 API 签名未变更——若变更，检查所有调用方是否已同步更新
    3. 手动验证至少一条依赖前序 Phase 的旧功能路径仍可用
       - 例：Phase 5 改了文件服务 → 必须验证 Phase 3 创建的项目仍能正常打开文件
       - 例：Phase 8 改了阶段导航 → 必须验证 Phase 4 的编辑器仍能正常打开标签页
    4. 若发现前序 Phase 功能被破坏 → 先修回归 bug → 再继续关闸验证
    5. 证据要求：列出检查的旧功能路径 + 每条的验证结果

[工作流程（初始化模式）]
    触发条件：有 DEV-PLAN.md，无项目代码

    [启动阶段]
        第一步：依赖检测
            执行 [依赖检测]

        第二步：加载文档
            读取 Product-Spec.md → 提取产品概述、核心功能
            读取 DEV-PLAN.md → 提取技术栈表、Phase 1 内容、数据库表（如有）
            如有 Design-Brief.md → 读取色彩方向、信息密度（配置 Tailwind 主题）
            如有设计工具 MCP → 读取 Phase 1 相关页面的设计数据

    [技术方案阶段]
        运用 [技术栈选择策略]
        根据 DEV-PLAN.md 的技术栈表确认方案
        WebSearch 验证框架版本和关键依赖兼容性
        如有多个合理选项 → 给用户 2-3 个方案选

    [项目搭建阶段]
        在 <project-name>/ 子文件夹中初始化项目，不在根目录。
        命名：小写字母 + 数字 + 连字符。
        配置 TypeScript strict mode、安装依赖、配置 Tailwind、配置环境变量。

        Git 准备：
        1. 根目录 git init + 创建 .gitignore（排除规划文档、设计资源、环境变量、构建产物）
        2. 确保 gh CLI 可用且已认证（未安装则安装，未认证则引导用户完成 `gh auth login`）
        3. 创建 GitHub **private** 仓库并关联远程
        4. 首次 commit + push

    [Phase 1 开发]
        进入 [持续开发模式] 的 Phase 执行流程，从 Phase 1 开始

[工作流程（持续开发模式）]
    触发条件：有 DEV-PLAN.md + 有项目代码

    [加载阶段]
        第一步：依赖检测
            执行 [依赖检测]

        第二步：加载文档和代码状态
            读取 DEV-PLAN.md → 识别所有 Phase 及完成状态
            读取 Product-Spec.md → 作为功能参照
            如有 Design-Brief.md → 读取视觉方向
            如有 DESIGN-TOKENS.md → 读取 CSS 变量和间距体系，直接用于 Tailwind 配置
            如有 COMPONENTS.md → 读取组件 API 和状态表，作为编码规范
            如有设计工具 MCP → 准备读取
            扫描已有代码结构 → 了解当前项目状态

        第三步：确定当前 Phase
            显示 Phase 列表和完成状态
            识别下一个待开发的 Phase
            如用户指定某个 Phase → 使用指定的

    [Phase 执行流程]
        第一步：Plan + TaskList
            这一步是编码的前置条件，不可跳过，不需要用户确认。没有 Plan 和 TaskList 不允许写任何代码。
            1. 读取该 Phase 的交付清单和关键文件
            2. 如有设计工具 MCP 已连接，查看该 Phase 涉及的页面，读取精确数值。如无设计工具，以 Design-Brief.md 或 Product-Spec.md 为参照
            3. 探索现有代码，理解当前结构
            4. 规划实现步骤，明确先做什么、后做什么
            5. 用 TaskCreate 列出具体任务清单，每个页面、组件、功能一个 Task
            6. TaskList 列好后直接进入第二步，不等用户确认

        第二步：逐个 Task 实现 + 单 Task Review 循环

            对每个 Task 执行以下循环：

            开发前——加载参照文档：
            1. 读取 DEV-PLAN.md 中该 Task 对应的交付清单和关键文件
            2. 读取 Product-Spec.md 中该 Task 涉及的功能描述
            3. 读取 Design-Brief.md 中该 Task 涉及的视觉方向和页面备注
            4. 如有设计工具 MCP 已连接，通过设计工具找到该 Task 对应的设计页面，读取该页面及其组件的精确数值。每个 Task 都重新读取，不凭记忆
            5. 明确该 Task 的交付目标：功能上实现什么、视觉上做成什么样

            编码：
            6. 严格按参照文档实现，逐个组件对照设计数值编码

            开发后——对照验证 + Review 循环：
            7. 读取代码实际值，逐项与设计数值核对，有偏差则修正
            8. 对照 Product-Spec.md 确认功能行为符合描述
            9. 派发 code-reviewer 执行两阶段审查。code-reviewer 同样对照 Product-Spec.md、Design-Brief.md、DEV-PLAN.md 和设计稿审查
            10. Stage 1 失败（功能缺失）→ 补实现 → 重新派发 code-reviewer
            11. Stage 2 失败（代码质量）→ 调用 bug-fixer 修复 → 重新派发 code-reviewer
            12. 两个 Stage 都通过 → TaskUpdate 标记完成 → 执行 Bash: echo clean > .claude/.needs-review 清除 review 状态 → commit
            13. 进入下一个 Task

            编码过程中始终遵循：
            - [开发规则清单] 中的所有规则
            - [修改纪律]：每次改动前评估影响
            - [联网搜索策略]：用外部库前确认 API
            - 遇到阻塞时明确说明，不强行继续

        第三步：Phase 完成验证
            所有 Task 完成后，执行 [Phase 退出关闸] 的硬性门禁验证
            这是最终确认，确保所有 Task 的代码在一起能编译、能运行、功能完整
            每步附上证据
            不通过则修复后重新验证

        第四步：用户确认
            向用户汇报 Phase 完成情况，附证据
            用户确认 OK → Phase 完成
            用户有修改意见 → 修改后重新走第三步

        第五步：引导下一步
            "Phase N 已完成验证。下一个：Phase N+1。继续？"

[初始化]
    检测项目状态，路由到对应模式：
    - 无代码 + 有 DEV-PLAN.md → 初始化模式
    - 有代码 + 有 DEV-PLAN.md → 持续开发模式
    - 无 DEV-PLAN.md → 提示先调用 /dev-planner
    - 无 Product-Spec.md → 提示先调用 /product-spec-builder
