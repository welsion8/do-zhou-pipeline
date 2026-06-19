#!/bin/bash
# Hook: PostToolUse (Bash) if git commit*
# commit 成功后自动 push。失败时写入错误日志并通知。
# 对标：CI/CD pipeline 的 post-commit push 环节

INPUT=$(cat)
EXIT_CODE=$(echo "$INPUT" | jq -r '.tool_exit_code // .exit_code // "1"' 2>/dev/null)

if [ "$EXIT_CODE" != "0" ]; then
  exit 0
fi

# 执行 push，捕获输出和错误
PUSH_OUTPUT=$(git push 2>&1)
PUSH_EXIT=$?

if [ $PUSH_EXIT -ne 0 ]; then
  # push 失败 → 记录错误日志 + 输出到 stderr（Claude 会看到）
  LOG_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
  mkdir -p "$LOG_DIR"
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  {
    echo "[${TIMESTAMP}] PUSH FAILED"
    echo "Exit code: ${PUSH_EXIT}"
    echo "Output:"
    echo "${PUSH_OUTPUT}"
    echo "---"
  } >> "$LOG_DIR/push-errors.log"

  # 保留最近 50 条错误记录，防止日志膨胀
  if [ -f "$LOG_DIR/push-errors.log" ]; then
    tail -n 200 "$LOG_DIR/push-errors.log" > "$LOG_DIR/push-errors.log.tmp" 2>/dev/null
    mv "$LOG_DIR/push-errors.log.tmp" "$LOG_DIR/push-errors.log" 2>/dev/null
  fi

  echo "⚠️ git push 失败。错误已记录到 .claude/logs/push-errors.log。请手动检查网络连接和远程仓库状态。" >&2
  echo "${PUSH_OUTPUT}" >&2

  # 常见失败原因诊断
  if echo "${PUSH_OUTPUT}" | grep -q "remote: Repository not found"; then
    echo "诊断：远程仓库不存在或无权限。请检查 GitHub 仓库是否已被删除或重命名。" >&2
  elif echo "${PUSH_OUTPUT}" | grep -q "Connection refused\|Could not resolve host"; then
    echo "诊断：网络连接问题。请检查网络或 VPN 连接。" >&2
  elif echo "${PUSH_OUTPUT}" | grep -q "rejected"; then
    echo "诊断：远程分支有冲突。可能需要先 git pull 或 force push（谨慎）。" >&2
  elif echo "${PUSH_OUTPUT}" | grep -q "Permission denied"; then
    echo "诊断：权限问题。请检查 SSH key 或 GitHub token 是否有效。" >&2
  fi

  exit 0
fi

exit 0
