#!/bin/bash
# pre-commit-design-check.sh — Design Token + 设计数据一致性门禁
#
# 在 git commit 前自动执行，不通过则阻止 commit。
# 触发条件: PreToolUse hook (git commit*)
#
# 检查项:
#   1. Token 强制 — 扫描硬编码颜色/间距/字号
#   2. 设计数据新鲜度 — .pen 变更后 .pen-layout-values.json 是否同步
#   3. 设计帧完整性 — 帧数与上次提交是否一致
#
# 退出码: 0=通过 | 1=警告(不阻止) | 2=阻断commit

set -euo pipefail
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
CLAUDE_DIR="$PROJECT_DIR/.claude"
AUDIT_MODULES="$CLAUDE_DIR/audit-runner/modules"

# ── 检查 1: Token 强制 ──
TOKENS_FILE="$PROJECT_DIR/DESIGN-TOKENS.md"
if [ -f "$TOKENS_FILE" ] && [ -f "$AUDIT_MODULES/token-gen.js" ]; then
  TOKEN_CHECK=$(node "$AUDIT_MODULES/token-gen.js" --check 2>&1)
  TOKEN_EXIT=$?
  if [ $TOKEN_EXIT -ne 0 ]; then
    echo "" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "🔴 Design Token 强制检查未通过" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "$TOKEN_CHECK" >&2
    echo "" >&2
    echo "修复方式:" >&2
    echo "  node .claude/audit-runner/modules/token-gen.js --fix   # 自动替换硬编码值" >&2
    echo "  或手动将硬编码颜色替换为 var(--token-name)" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    exit 2
  fi
  echo "✅ Token 强制检查通过"
fi

# ── 检查 2: 设计数据新鲜度 (.pen → .pen-layout-values.json) ──
PEN_FILE=$(find "$PROJECT_DIR" -maxdepth 1 -name "*.pen" -not -name ".*" 2>/dev/null | head -1)
LAYOUT_VALUES="$CLAUDE_DIR/.pen-layout-values.json"

if [ -n "$PEN_FILE" ] && [ -f "$PEN_FILE" ] && [ -f "$LAYOUT_VALUES" ]; then
  PEN_MTIME=$(stat -c %Y "$PEN_FILE" 2>/dev/null || stat -f %m "$PEN_FILE" 2>/dev/null || echo 0)
  LAYOUT_MTIME=$(stat -c %Y "$LAYOUT_VALUES" 2>/dev/null || stat -f %m "$LAYOUT_VALUES" 2>/dev/null || echo 0)

  if [ "$PEN_MTIME" -gt "$LAYOUT_MTIME" ]; then
    echo "" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "⚠ 设计稿已更新但 .pen-layout-values.json 未同步" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "请运行 MCP batch_get 提取最新设计数据：" >&2
    echo "  1. 在 Claude Code 中请求 Agent: '更新设计数据'" >&2
    echo "  2. Agent 会调用 Pencil MCP 读取帧 → pen-extract.js 更新 JSON" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2

    # 标记需要提取
    echo "true" > "$CLAUDE_DIR/.needs-pen-extract"

    # 不阻断 commit，但发出警告
    exit 1
  fi
  echo "✅ 设计数据新鲜度检查通过"
fi

# ── 检查 3: 设计帧数量一致性 ──
PEN_FRAMES="$CLAUDE_DIR/.pen-frames.json"
if [ -f "$PEN_FRAMES" ] && [ -f "$LAYOUT_VALUES" ]; then
  FRAMES_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$PEN_FRAMES','utf-8')).length)" 2>/dev/null || echo 0)
  LAYOUT_COUNT=$(node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('$LAYOUT_VALUES','utf-8')).frames).length)" 2>/dev/null || echo 0)

  if [ "$FRAMES_COUNT" -gt "$LAYOUT_COUNT" ]; then
    echo "⚠ .pen-frames.json ($FRAMES_COUNT 帧) > .pen-layout-values.json ($LAYOUT_COUNT 帧) — 可能需要更新" >&2
    echo "true" > "$CLAUDE_DIR/.needs-pen-extract"
  fi
fi

exit 0
