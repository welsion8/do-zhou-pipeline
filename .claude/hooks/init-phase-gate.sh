#!/bin/bash
# 初始化或重置 Phase 关闸状态
# 用法: init-phase-gate.sh <phase-number>
# 由 Agent 在新 Phase 开始时调用

PHASE="${1:-unknown}"
GATE_FILE="$CLAUDE_PROJECT_DIR/.claude/.phase-gate"

cat > "$GATE_FILE" << EOF
phase=$PHASE
tsc_check=pending
lint_check=pending
test_check=pending
security_scan=pending
runtime_check=pending
design_read_check=pending
code_review=pending
audit_L1=pending
audit_L2=pending
audit_L3=pending
audit_L4=pending
audit_L5=pending
EOF

echo "Phase $PHASE 关闸已初始化（全部 pending）"
exit 0
