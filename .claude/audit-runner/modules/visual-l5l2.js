/**
 * L5↔L2 视觉一致性 — 设计数值 ↔ 代码实现（增强版）
 *
 * 检查维度: width/height/padding/gap/borderRadius/fontSize/borderWidth/dimensions
 * Pass 1: Tailwind class 匹配  →  Pass 2: inline style  →  Pass 3: 常量定义
 */

const path = require('path');

// 按类型生成代码匹配正则
function buildCodeRx(type, value) {
  const v = String(value);
  switch (type) {
    case 'width':       return new RegExp(`w-\\[?${v}px?\\]?|w-${v}\\b|width\\s*:\\s*${v}px`, 'i');
    case 'height':      return new RegExp(`h-\\[?${v}px?\\]?|h-${v}\\b|height\\s*:\\s*${v}px`, 'i');
    case 'padding':     return new RegExp(`p-?[xy]?-\\[?${v}px?\\]?|padding\\s*:\\s*${v}px|p-${v}\\b`, 'i');
    case 'gap':         return new RegExp(`gap-\\[?${v}px?\\]?|gap-${v}\\b|gap\\s*:\\s*${v}px`, 'i');
    case 'borderRadius':return new RegExp(`rounded-\\[?${v}px?\\]?|rounded-${v}\\b|border-radius\\s*:\\s*${v}px|cornerRadius\\s*[=:：]\\s*${v}\\b`, 'i');
    case 'fontSize':    return new RegExp(`text-\\[?${v}px?\\]?|fontSize\\s*:\\s*${v}px|font-size\\s*:\\s*${v}px|text-${v}\\b`, 'i');
    case 'borderWidth': return new RegExp(`border-\\[?${v}px?\\]?|border-width\\s*:\\s*${v}px`, 'i');
    case 'dimensions':  return new RegExp(`(?:w|width)-\\[?${v}px?\\]?|(?:h|height)-\\[?${v}px?\\]?`, 'i');
    case 'generic':
      // 匹配常见 Tailwind/CSS 数值模式：p-N, px-N, gap-N, text-N, rounded-N, etc.
      return new RegExp(`(?:[a-z]+-\\[?${v}px?\\]?|\\b${v}px\\b|:\\s*${v}px)`, 'i');
    default:            return new RegExp(`\\b${v}\\b`, 'i');
  }
}

function buildInlineRx(value) {
  const v = String(value);
  return new RegExp(`style=\\{\\{\\s*[^}]*\\b${v}\\b`, 'i');
}

function buildConstRx(value) {
  const v = String(value);
  return new RegExp(`(const|let)\\s+\\w*(?:${v}|WIDTH|HEIGHT|DEF|PX|_W|_H|SIZE|RADIUS|GAP)\\w*\\s*=\\s*${v}\\b`, 'i');
}

function check(ctx) {
  const { codeDir, planContent, CONFIG, utils } = ctx;
  const results = [];
  if (!codeDir) return results;

  const allFiles = utils.findFiles(codeDir, ['.tsx', '.ts', '.css'], CONFIG.ignoreDirs);
  const codeText = allFiles.map(f => ({ p: path.relative(codeDir, f), content: utils.readFile(f) || '' }));

  // ── 从 DEV-PLAN 提取所有设计维度 ──
  const DESIGN_LINE = /\b(?:px|padding|gap|font|size|radius|border|width|height|color|\$|#[0-9a-fA-F]{3,6}|corner)\b/i;
  const designPatterns = [];
  if (planContent) {
    const planLines = planContent.split('\n');
    for (const line of planLines) {
      if (!line.includes('px') && !DESIGN_LINE.test(line)) continue; // 只处理设计相关行
      for (const dvDef of CONFIG.devPlan.designValuePatterns) {
        const [type, patternStr] = Array.isArray(dvDef) ? dvDef : ['generic', dvDef];
        const m = line.match(new RegExp(patternStr, 'i'));
        if (m) {
          const name = m[1];
          const val1 = m[2];
          const val2 = m[3]; // dimensions 类型有第二个数值

          if (type === 'dimensions' && val2) {
            // 同时检查宽和高
            for (const [dimType, dimVal] of [['width', val1], ['height', val2]]) {
              designPatterns.push({
                name, label: `${name} ${dimType}=${dimVal}px`, type: dimType,
                expectedValue: parseInt(dimVal),
                designValue: buildCodeRx(dimType, dimVal),
              });
            }
          } else {
            designPatterns.push({
              name, label: `${name} ${type}=${val1}px`, type,
              expectedValue: parseInt(val1),
              designValue: buildCodeRx(type, val1),
            });
          }
          break; // 一行只匹配第一个命中 pattern
        }
      }
    }
  }

  // 回退
  if (designPatterns.length === 0) {
    designPatterns.push(
      { name: '通用宽度', label: '通用宽度检查', type: 'width', expectedValue: null, designValue: /\b(width|w)\s*[:=]\s*\d+px?/gi },
      { name: '通用高度', label: '通用高度检查', type: 'height', expectedValue: null, designValue: /\b(height|h)\s*[:=]\s*\d+px?/gi },
    );
  }
  designPatterns.push(
    { name: '自定义滚动条', label: '自定义滚动条样式', type: 'scrollbar', expectedValue: null, designValue: /::-webkit-scrollbar/gi },
  );

  // ── 三级匹配 ──
  for (const dp of designPatterns) {
    let found = false, foundIn = '';

    // Pass 1: 代码正则匹配
    for (const f of codeText) {
      if (dp.designValue) {
        dp.designValue.lastIndex = 0;
        if (dp.designValue.test(f.content)) { found = true; foundIn = f.p; break; }
      }
    }

    // Pass 2: inline style
    if (!found && dp.expectedValue) {
      const irx = buildInlineRx(dp.expectedValue);
      for (const f of codeText) {
        irx.lastIndex = 0;
        if (irx.test(f.content)) { found = true; foundIn = f.p + ' (inline)'; break; }
      }
    }

    // Pass 3: 常量定义
    if (!found && dp.expectedValue) {
      const crx = buildConstRx(dp.expectedValue);
      for (const f of codeText) {
        crx.lastIndex = 0;
        if (crx.test(f.content)) { found = true; foundIn = f.p + ' (常量)'; break; }
      }
    }

    results.push({ check: dp.label, found, file: foundIn, status: found ? '✅' : '🔴' });
  }

  // ── 状态变体 ──
  const stateChecks = [
    { pattern: /expanded|isExpanded|setExpanded/gi, label: '展开/收缩状态' },
    { pattern: /collapsed|isCollapsed/gi, label: '折叠状态' },
    { pattern: /enabled|disabled|readOnly/gi, label: '启用/禁用状态' },
    { pattern: /loading|isLoading|fetching/gi, label: '加载中状态' },
    { pattern: /error|catch|try.*catch/gi, label: '错误处理' },
  ];
  for (const sc of stateChecks) {
    let count = 0;
    for (const f of codeText) { sc.pattern.lastIndex = 0; if (sc.pattern.test(f.content)) count++; }
    results.push({ check: `状态: ${sc.label}`, found: count > 0, file: `${count} 文件`, status: count > 0 ? '✅' : '🟡' });
  }

  return results;
}

module.exports = { check };
