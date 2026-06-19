/**
 * pen-sync.js — 设计数据同步强制桥
 *
 * design_read_check 自动化核心。消除"Agent 手工 MCP 读帧"的最后一块盲区。
 *
 * 机制:
 *   1. 检测 设计源文件 vs .pen-layout-values.json 的同步状态
 *   2. .pen 更新但 JSON 未同步 → 写 .needs-pen-extract 标记
 *   3. Agent 检测到标记 → 必须调用 MCP batch_get → pen-extract --merge
 *   4. 同步完成后 → 自动标记 design_read_check pass
 *
 * 用法:
 *   node pen-sync.js                        # 检查同步状态
 *   node pen-sync.js --mark-synced          # MCP 提取完成后标记已同步
 *   node pen-sync.js --force                # 强制标记需要同步
 *   node pen-sync.js --watch                # 持续监听 .pen 变更
 *
 * Phase gate 联动:
 *   .needs-pen-extract 存在 → design_read_check = pending/fail
 *   .needs-pen-extract 不存在 → design_read_check = pass
 *
 * 通用性: 检测项目根目录下 *设计源文件。换产品 → 换 .pen → 自动适配。
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const CLAUDE_DIR = path.join(PROJECT_ROOT, '.claude');
const NEEDS_EXTRACT_FLAG = path.join(CLAUDE_DIR, '.needs-pen-extract');
const LAYOUT_VALUES = path.join(CLAUDE_DIR, '.pen-layout-values.json');
const PEN_FRAMES = path.join(CLAUDE_DIR, '.pen-frames.json');

/**
 * 查找项目中的设计源文件（Pencil .pen 或 Figma .json）
 */
function findDesignSource() {
  try {
    const entries = fs.readdirSync(PROJECT_ROOT);
    const penFile = entries.find(f => f.endsWith('.pen') && !f.startsWith('.'));
    if (penFile) return { type: 'pencil', file: penFile };
    const figmaFile = entries.find(f => f.startsWith('figma') && f.endsWith('.json') && !f.startsWith('.'));
    if (figmaFile) return { type: 'figma', file: figmaFile };
    // 也检查 .claude 目录下的 Figma 数据
    const figmaDataFile = path.join(CLAUDE_DIR, '.figma-design-data.json');
    if (fs.existsSync(figmaDataFile)) return { type: 'figma', file: '.claude/.figma-design-data.json' };
    return null;
  } catch (_) {
    return null;
  }
}

/** @deprecated 使用 findDesignSource() 替代 */
function findPenFile() {
  const source = findDesignSource();
  return source?.type === 'pencil' ? source.file : null;
}

/**
 * 检查同步状态
 * @returns {Object} { synced: boolean, penFile: string|null, penMtime: number, layoutMtime: number, reason: string }
 */
function checkSync() {
  const designSource = findDesignSource();

  if (!designSource) {
    return { synced: true, designSource: null, penMtime: 0, layoutMtime: 0, reason: '无设计源文件（.pen 或 Figma JSON）。纯后端/CLI 项目自动跳过。', skip: true };
  }

  const sourcePath = designSource.file.includes('.claude/')
    ? path.join(PROJECT_ROOT, designSource.file)
    : path.join(PROJECT_ROOT, designSource.file);

  // 设计源文件为空 → 设计稿生成中断
  try {
    if (fs.statSync(sourcePath).size === 0) {
      return { synced: false, designSource, penMtime: 0, layoutMtime: 0, reason: `${designSource.type} 文件为空(0字节)。设计稿生成中断。`, empty: true };
    }
  } catch (_) {}

  const sourceMtime = fs.statSync(sourcePath).mtimeMs;

  // .pen-layout-values.json 不存在
  if (!fs.existsSync(LAYOUT_VALUES)) {
    return { synced: false, designSource, penMtime: sourceMtime, layoutMtime: 0, reason: '.pen-layout-values.json 不存在。运行适配器首次提取。' };
  }

  const layoutMtime = fs.statSync(LAYOUT_VALUES).mtimeMs;

  // .pen 比 JSON 新 → 设计稿更新了但数据未同步
  if (sourceMtime > layoutMtime) {
    const diffMinutes = Math.round((sourceMtime - layoutMtime) / 60000);
    return {
      synced: false, designSource, penMtime: sourceMtime, layoutMtime,
      reason: `设计源文件 ${diffMinutes} 分钟前更新，.pen-layout-values.json 未同步。`,
      stale: true, diffMinutes
    };
  }

  // 检查帧数量一致性
  if (fs.existsSync(PEN_FRAMES)) {
    try {
      const frames = JSON.parse(fs.readFileSync(PEN_FRAMES, 'utf-8'));
      const layout = JSON.parse(fs.readFileSync(LAYOUT_VALUES, 'utf-8'));
      const frameCount = frames.length;
      const layoutCount = Object.keys(layout.frames || {}).length;
      if (frameCount > layoutCount) {
        return {
          synced: false, designSource, penMtime: sourceMtime, layoutMtime,
          reason: `.pen-frames.json (${frameCount}帧) > .pen-layout-values.json (${layoutCount}帧)。提取不完整。`,
          frameMismatch: true, frameCount, layoutCount
        };
      }
    } catch (_) {}
  }

  return { synced: true, designSource, penMtime: sourceMtime || layoutMtime, layoutMtime, reason: '同步' };
}

/**
 * 检查并更新 .needs-pen-extract 标记文件
 * @returns {Object} { needsExtract: boolean, checkResult: object }
 */
function checkAndFlag() {
  const result = checkSync();

  if (!result.synced) {
    // 写标记
    const flagContent = JSON.stringify({
      timestamp: new Date().toISOString(),
      penFile: result.penFile,
      reason: result.reason,
      action: 'Agent: 调用 Pencil MCP batch_get 读取全部帧 → node .claude/audit-runner/modules/pen-extract.js --merge .claude/.pen-layout-values.json',
    }, null, 2);
    fs.writeFileSync(NEEDS_EXTRACT_FLAG, flagContent);
    return { needsExtract: true, checkResult: result };
  }

  // 同步 → 清除标记
  if (fs.existsSync(NEEDS_EXTRACT_FLAG)) {
    fs.unlinkSync(NEEDS_EXTRACT_FLAG);
  }
  return { needsExtract: false, checkResult: result };
}

/**
 * 标记已同步（MCP 提取完成后由 pen-extract --merge 调用）
 */
function markSynced() {
  if (fs.existsSync(NEEDS_EXTRACT_FLAG)) {
    fs.unlinkSync(NEEDS_EXTRACT_FLAG);
    console.log('✅ .needs-pen-extract 已清除。design_read_check 自动 pass。');
  }

  // 更新 layout-values 的 mtime 标记
  if (fs.existsSync(LAYOUT_VALUES)) {
    const now = new Date();
    fs.utimesSync(LAYOUT_VALUES, now, now);
  }
}

// ── check() 管线接口 ──
function check(ctx) {
  const results = [];
  const result = checkSync();

  if (result.skip) {
    results.push({ check: 'design_read: 设计数据同步', status: 'skip', detail: result.reason });
    return results;
  }

  if (result.empty) {
    results.push({ check: 'design_read: 设计源文件', status: '🔴', detail: result.reason });
    return results;
  }

  if (result.stale) {
    results.push({
      check: 'design_read: 设计数据过期',
      status: '🔴',
      detail: result.reason,
    });
    results.push({
      check: 'design_read: 修复方式',
      status: '⏳',
      detail: 'Agent 调用 MCP batch_get → pen-extract --merge。同步后 design_read_check 自动 pass。',
    });
  } else if (result.frameMismatch) {
    results.push({
      check: 'design_read: 帧数不匹配',
      status: '🟠',
      detail: result.reason,
    });
  } else {
    results.push({
      check: 'design_read: 设计数据同步',
      status: '🟢',
      detail: `.pen ↔ .pen-layout-values.json 同步 (${new Date(result.penMtime).toISOString()})`,
    });
  }

  return results;
}

// ── 主入口 ──
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--mark-synced')) {
    markSynced();
    return;
  }

  if (args.includes('--force')) {
    const penFile = findPenFile();
    if (penFile) {
      fs.writeFileSync(NEEDS_EXTRACT_FLAG, JSON.stringify({
        timestamp: new Date().toISOString(),
        penFile,
        reason: '手动强制标记',
        action: 'Agent: MCP batch_get → pen-extract --merge',
      }, null, 2));
      console.log('✅ .needs-pen-extract 已强制标记');
    }
    return;
  }

  const { needsExtract, checkResult } = checkAndFlag();

  if (needsExtract) {
    console.log(`⚠ 设计数据需同步: ${checkResult.reason}`);
    console.log(`   标记: ${NEEDS_EXTRACT_FLAG}`);
    console.log(`   Agent 操作: MCP batch_get → pen-extract --merge`);
    process.exit(1);
  } else {
    console.log(`✅ 设计数据已同步: ${checkResult.reason}`);
  }
}

module.exports = { check, checkSync, checkAndFlag, markSynced, findPenFile };

if (require.main === module) {
  main();
}
