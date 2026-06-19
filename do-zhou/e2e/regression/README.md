# 累积回归测试套件

> **机制**：每完成一个 UI Phase，Agent 将当前 Phase 的核心交互 E2E 测试追加到此目录。
> Phase N 关闸时，CI 运行此目录的全部测试（Phase 1 到 Phase N-1 的累积）。
> 任何历史测试失败 → CI 红灯 → Phase 不放行。

## 追加规则

- Phase 关闸时，Agent 将当前 Phase 至少 **3 条核心交互路径** 的 E2E 测试写入此目录
- 文件命名：`phase-{N}-{描述}.spec.ts`（如 `phase-3-file-tree.spec.ts`）
- 每条测试覆盖完整的"操作→等待→验证"路径
- 不追加纯配置文件修改 Phase 的测试（无交互）

## 运行方式

```bash
# 本地运行全部回归测试
npx playwright test e2e/regression/

# CI 自动运行（在 ci.yml deep-gate 中配置）
```
