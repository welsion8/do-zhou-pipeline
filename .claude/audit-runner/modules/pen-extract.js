/**
 * pen-extract.js — 设计数据自动提取引擎
 *
 * 从 MCP batch_get 原始 JSON 输出中自动提取子组件布局数值，
 * 消除"Agent 人眼提取"环节，实现确定性、可审计的设计数据管道。
 *
 * 用法:
 *   node pen-extract.js < raw-mcp-output.json              # stdin 输入
 *   node pen-extract.js mcp-dump.json                       # 文件输入
 *   node pen-extract.js mcp-dump.json --merge existing.json # 合并到已有数据
 *   node pen-extract.js mcp-dump.json --diff existing.json  # 差异检测
 *
 * 输入: MCP batch_get 原始输出（resolveVariables=true, readDepth>=2）
 * 输出: 标准化 childComponents JSON → .claude/.pen-layout-values.json
 *
 * 通用性: 输入格式是 MCP batch_get 标准输出，不绑定任何特定 .pen 文件。
 *         换产品 → 换 .pen → 同一脚本提取。
 */

const fs = require('fs');
const path = require('path');

// ── 类型标记 ──
const NON_LAYOUT_TYPES = new Set(['text', 'icon', 'rectangle', 'ellipse', 'path', 'polygon', 'ref', 'group', 'note']);
const LAYOUT_TYPES = new Set(['frame']);
const IGNORE_NAMES = /^(Spacer|Divider|Separator)$/i;

// ── 提取逻辑 ──

/**
 * 判断节点是否为布局容器（有子组件结构需要递归的）
 */
function isLayoutContainer(node) {
  return node.type === 'frame' && node.children && node.children.length > 0;
}

/**
 * 从节点名称中提取语义化的组件名
 * e.g. "Tab_Ch-01.md" → "tab", "InputBar" → "inputBar", "SKTab_📋 基本信息" → "tabItem"
 */
function semanticName(node) {
  const name = node.name || '';
  // 移除 emoji 前缀但保留语义
  const cleaned = name.replace(/^[^\w]*/, '').replace(/_\w+$/, '');
  // 取第一个单词或下划线前的部分
  const parts = cleaned.split(/[\s_\-]+/);
  if (parts.length === 1) return parts[0];
  // 看名称模式
  if (name.includes('_')) {
    // e.g. "阶段_① 故事大纲" → "stageCard"
    const prefix = name.split('_')[0];
    return prefix;
  }
  // 取前两个有意义的词
  return parts.slice(0, 2).join('');
}

/**
 * 提取单个节点的设计 token 值
 */
function extractNodeTokens(node) {
  const tokens = {};

  // 字体相关
  if (node.fontSize !== undefined) tokens.fontSize = node.fontSize;
  if (node.fontWeight !== undefined) tokens.fontWeight = node.fontWeight;
  if (node.fontFamily !== undefined) tokens.fontFamily = node.fontFamily;
  if (node.lineHeight !== undefined) tokens.lineHeight = node.lineHeight;

  // 填充
  if (node.fill) {
    if (typeof node.fill === 'string') {
      tokens.fill = node.fill;
    } else if (Array.isArray(node.fill) && node.fill.length === 1) {
      tokens.fill = typeof node.fill[0] === 'string' ? node.fill[0] : node.fill[0]?.color;
    }
  }

  // 描边
  if (node.stroke) {
    if (typeof node.stroke === 'string') {
      tokens.stroke = node.stroke;
    } else if (Array.isArray(node.stroke) && node.stroke.length === 1) {
      tokens.stroke = typeof node.stroke[0] === 'string' ? node.stroke[0] : node.stroke[0]?.color;
    }
  }
  if (node.strokeWidth !== undefined) tokens.strokeWidth = node.strokeWidth;

  // 圆角
  if (node.cornerRadius !== undefined) tokens.cornerRadius = node.cornerRadius;

  // 间距和填充
  if (node.padding !== undefined) tokens.padding = node.padding;
  if (node.gap !== undefined) tokens.gap = node.gap;

  // 尺寸
  if (node.width !== undefined && typeof node.width === 'number') tokens.w = node.width;
  if (node.height !== undefined && typeof node.height === 'number') tokens.h = node.height;

  // 对齐
  if (node.justifyContent) tokens.justifyContent = node.justifyContent;
  if (node.alignItems) tokens.alignItems = node.alignItems;

  // 图标
  if (node.type === 'icon') {
    tokens.icon = node.icon;
    tokens.lib = node.library;
  }

  // 内容/文本
  if (node.content) tokens.content = node.content;

  return tokens;
}

/**
 * 递归提取子组件树的结构化 layout values
 *
 * @param {Object} node - MCP batch_get 返回的节点
 * @param {number} depth - 当前递归深度
 * @param {number} maxDepth - 最大深度
 * @returns {Object|null} 该节点的结构化数据（null = 叶子节点无有价值数据）
 */
function extractComponentTree(node, depth = 0, maxDepth = 4) {
  if (!node || depth > maxDepth) return null;

  const tokens = extractNodeTokens(node);
  const name = node.name || node.id;

  // 叶子节点：返回提取到的 token 值
  const hasTokens = Object.keys(tokens).length > 0;
  const hasChildren = node.children && node.children.length > 0;

  if (!hasChildren) {
    if (!hasTokens) return null;
    // 只返回有实际设计值的叶子
    const meaningful = {};
    if (tokens.fontSize !== undefined || tokens.fontWeight !== undefined || tokens.fontFamily !== undefined) {
      meaningful._type = 'text';
      Object.assign(meaningful, tokens);
    } else if (tokens.icon !== undefined) {
      meaningful._type = 'icon';
      Object.assign(meaningful, tokens);
    } else if (tokens.cornerRadius !== undefined || tokens.stroke !== undefined || tokens.fill !== undefined) {
      meaningful._type = 'shape';
      Object.assign(meaningful, tokens);
    }
    return Object.keys(meaningful).length > 0 ? meaningful : null;
  }

  // 容器节点：递归处理子节点
  const result = {};
  if (hasTokens) {
    // 顶层容器属性
    for (const [k, v] of Object.entries(tokens)) {
      result[`_${k}`] = v;
    }
  }

  // 分组子节点
  const groups = {};
  for (const child of node.children) {
    if (!child || !child.name) continue;
    if (IGNORE_NAMES.test(child.name)) continue;

    const semName = semanticName(child);
    const childData = extractComponentTree(child, depth + 1, maxDepth);

    if (!childData) continue;

    // 相同语义的节点合并为数组或按变体区分
    if (groups[semName]) {
      // 已有同名 → 用具体名称区分
      const specificName = child.name.replace(/[^\w一-鿿]/g, '_').substring(0, 20);
      groups[`${semName}_${specificName}`] = childData;
    } else {
      groups[semName] = childData;
    }
  }

  // 合并 groups 到 result
  for (const [k, v] of Object.entries(groups)) {
    result[k] = v;
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * 从 MCP 原始输出中提取帧级别的 childComponents
 *
 * @param {Array} mcpOutput - batch_get 返回的数组
 * @returns {Object} 帧 ID → { name, childComponents }
 */
function extractFrames(mcpOutput) {
  const frames = {};

  for (const frameNode of mcpOutput) {
    if (!frameNode || frameNode.type !== 'frame') continue;

    const frameId = frameNode.id;
    const frameData = {
      name: frameNode.name || frameId,
      width: frameNode.width,
      height: frameNode.height,
    };

    // 提取顶层样式
    if (frameNode.fill) frameData.fill = typeof frameNode.fill === 'string' ? frameNode.fill : frameNode.fill[0]?.color;
    if (frameNode.cornerRadius) frameData.cornerRadius = frameNode.cornerRadius;

    // 提取子组件
    if (frameNode.children && frameNode.children.length > 0) {
      const components = {};
      for (const child of frameNode.children) {
        if (!child || !child.name || IGNORE_NAMES.test(child.name)) continue;
        const childData = extractComponentTree(child, 0, 3);
        if (childData && Object.keys(childData).length > 0) {
          const key = semanticName(child).replace(/[^\w]/g, '');
          // camelCase 转换
          const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
          components[camelKey] = childData;
        }
      }
      if (Object.keys(components).length > 0) {
        frameData.childComponents = components;
      }
    }

    frames[frameId] = frameData;
  }

  return frames;
}

/**
 * 合并到已有的 layout-values.json 文件
 */
function mergeFrames(existingData, newFrames) {
  const merged = JSON.parse(JSON.stringify(existingData));

  if (!merged.frames) merged.frames = {};

  for (const [frameId, frameData] of Object.entries(newFrames)) {
    if (merged.frames[frameId]) {
      // 保留已有字段，更新 childComponents
      if (frameData.childComponents) {
        merged.frames[frameId].childComponents = frameData.childComponents;
      }
      // 更新顶层数值
      if (frameData.width) merged.frames[frameId].width = frameData.width;
      if (frameData.height) merged.frames[frameId].height = frameData.height;
    } else {
      merged.frames[frameId] = frameData;
    }
  }

  merged._note = `MCP resolveVariables=true 自动提取。${new Date().toISOString()}`;
  return merged;
}

/**
 * 对比新旧数据，输出差异报告
 */
function diffFrames(existingData, newFrames) {
  const diffs = [];

  for (const [frameId, newFrame] of Object.entries(newFrames)) {
    const oldFrame = existingData.frames?.[frameId];
    if (!oldFrame) {
      diffs.push({ frame: frameId, name: newFrame.name, type: 'NEW', detail: '新增帧' });
      continue;
    }

    // 对比顶层数值
    for (const key of ['width', 'height', 'fill', 'cornerRadius']) {
      const oldVal = oldFrame[key];
      const newVal = newFrame[key];
      if (newVal !== undefined && JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diffs.push({
          frame: frameId,
          name: newFrame.name,
          type: 'CHANGE',
          path: key,
          old: oldVal,
          new: newVal,
        });
      }
    }

    // 对比子组件 (deep compare)
    if (newFrame.childComponents && oldFrame.childComponents) {
      const cDiffs = diffComponents(oldFrame.childComponents, newFrame.childComponents, frameId, 'childComponents');
      diffs.push(...cDiffs);
    } else if (newFrame.childComponents && !oldFrame.childComponents) {
      diffs.push({ frame: frameId, name: newFrame.name, type: 'NEW', path: 'childComponents', detail: '新增子组件数据' });
    }
  }

  return diffs;
}

function diffComponents(oldComp, newComp, frameId, basePath) {
  const diffs = [];
  for (const [key, newVal] of Object.entries(newComp)) {
    const oldVal = oldComp[key];
    const currentPath = `${basePath}.${key}`;

    if (oldVal === undefined) {
      diffs.push({ frame: frameId, type: 'NEW', path: currentPath, detail: '新增属性' });
      continue;
    }

    if (typeof newVal === 'object' && newVal !== null && !Array.isArray(newVal)) {
      if (typeof oldVal === 'object' && oldVal !== null) {
        diffs.push(...diffComponents(oldVal, newVal, frameId, currentPath));
      } else {
        diffs.push({ frame: frameId, type: 'CHANGE', path: currentPath, old: oldVal, new: newVal });
      }
      continue;
    }

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diffs.push({ frame: frameId, type: 'CHANGE', path: currentPath, old: oldVal, new: newVal });
    }
  }
  return diffs;
}

// ── 主入口 ──

function main() {
  const args = process.argv.slice(2);
  let inputFile = null;
  let existingFile = null;
  let diffMode = false;
  let mergeMode = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--merge' && args[i + 1]) { mergeMode = true; existingFile = args[++i]; }
    else if (args[i] === '--diff' && args[i + 1]) { diffMode = true; existingFile = args[++i]; }
    else if (!args[i].startsWith('--')) inputFile = args[i];
  }

  // 读取 MCP 原始数据
  let rawData;
  if (inputFile) {
    rawData = fs.readFileSync(inputFile, 'utf-8');
  } else {
    // stdin 模式
    rawData = fs.readFileSync(0, 'utf-8');
  }

  const mcpOutput = JSON.parse(rawData);
  const mcpArray = Array.isArray(mcpOutput) ? mcpOutput : [mcpOutput];

  // 提取帧数据
  const newFrames = extractFrames(mcpArray);

  if (diffMode && existingFile) {
    // 差异检测模式
    const existing = JSON.parse(fs.readFileSync(existingFile, 'utf-8'));
    const diffs = diffFrames(existing, newFrames);
    console.log(JSON.stringify({ diffs, count: diffs.length }, null, 2));
    if (diffs.length > 0) {
      console.error(`\n⚠ 检测到 ${diffs.length} 处设计变更`);
      process.exit(1);
    }
  } else if (mergeMode && existingFile) {
    // 合并模式
    const existing = JSON.parse(fs.readFileSync(existingFile, 'utf-8'));
    const merged = mergeFrames(existing, newFrames);
    fs.writeFileSync(existingFile, JSON.stringify(merged, null, 2));
    console.log(`✅ 已合并 ${Object.keys(newFrames).length} 帧到 ${existingFile}`);
  } else {
    // 纯提取模式
    const output = {
      _note: `MCP resolveVariables=true 自动提取。${new Date().toISOString()}`,
      frames: newFrames,
    };
    console.log(JSON.stringify(output, null, 2));
  }
}

module.exports = { extractFrames, mergeFrames, diffFrames, extractComponentTree, extractNodeTokens };

if (require.main === module) {
  main();
}
