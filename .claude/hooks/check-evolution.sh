#!/bin/bash
# Hook: SessionStart (startup)
# 检查 FEEDBACK-INDEX.md 是否有需要处理的 feedback
# 有条目 → 输出提醒派发 evolution-runner

FEEDBACK_INDEX="$CLAUDE_PROJECT_DIR/.claude/feedback/FEEDBACK-INDEX.md"

if [ ! -f "$FEEDBACK_INDEX" ]; then
  # 索引不存在但模板存在 → Feedback 系统未初始化
  if [ -f "$CLAUDE_PROJECT_DIR/.claude/feedback/templates/feedback-index-template.md" ]; then
    echo "📋 Feedback 系统未初始化。建议基于 templates/feedback-index-template.md 创建 FEEDBACK-INDEX.md。"
  fi
  exit 0
fi

COUNT=$(grep -c "^- \[" "$FEEDBACK_INDEX" 2>/dev/null)
COUNT=${COUNT:-0}
COUNT=$(echo "$COUNT" | tr -d '[:space:]')

if [ "$COUNT" -gt 0 ] 2>/dev/null; then
  echo "📋 项目有 ${COUNT} 条 feedback 记录。建议派发 evolution-runner 检查是否有进化建议。"
fi

exit 0
