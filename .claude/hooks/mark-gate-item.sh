#!/bin/bash
# 标记单个关闸项为 pass/fail/skip
# 用法: mark-gate-item.sh <check_name> <status>
# 由 Agent 完成验证后调用，也可由自动化 hook 调用

CHECK="$1"
STATUS="${2:-pass}"
GATE_FILE="$CLAUDE_PROJECT_DIR/.claude/.phase-gate"

if [ ! -f "$GATE_FILE" ]; then
  echo "⚠ 未找到 .phase-gate 文件，请先运行 init-phase-gate.sh"
  exit 1
fi

case "$CHECK" in
  tsc_check|lint_check|test_check|security_scan|runtime_check|design_read_check|code_review|audit_L1|audit_L2|audit_L3|audit_L4|audit_L5)
    ;;
  *)
    echo "未知关闸项: $CHECK（有效项: tsc_check lint_check test_check security_scan runtime_check code_review audit_L1 audit_L2 audit_L3 audit_L4 audit_L5）"
    exit 1
    ;;
esac

case "$STATUS" in
  pass|fail|skip)
    ;;
  *)
    echo "无效状态: $STATUS（有效值: pass fail skip）"
    exit 1
    ;;
esac

# 更新指定项
if grep -q "^${CHECK}=" "$GATE_FILE" 2>/dev/null; then
  sed -i "s/^${CHECK}=.*/${CHECK}=${STATUS}/" "$GATE_FILE"
else
  echo "${CHECK}=${STATUS}" >> "$GATE_FILE"
fi

echo "✓ $CHECK → $STATUS"

# 输出当前关闸状态摘要
PASS_COUNT=$(grep -cE '=(pass|skip)$' "$GATE_FILE")
TOTAL_COUNT=$(grep -cE '=(pending|pass|fail|skip)$' "$GATE_FILE")
echo "关闸进度: $PASS_COUNT/$TOTAL_COUNT"

exit 0
