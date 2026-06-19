/**
 * Design Token 强制 — 代码不得使用 DESIGN-TOKENS.md 之外的任意数值
 *
 * 检查项:
 *   颜色: 必须使用设计变量($xxx)或Tailwind预设, 禁止硬编码hex
 *   间距: padding/gap/margin 必须在 tokens 定义的 spacing scale 内
 *   字号: fontSize 必须在 tokens 定义的 font scale 内
 *
 * 降级: DESIGN-TOKENS.md 不存在 → 🟡 跳过
 */
const path = require('path');
const fs = require('fs');

// Tailwind 默认 spacing scale (px) — 产品可覆写
const DEFAULT_SPACING = [0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96];
const DEFAULT_FONT_SIZES = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32, 36, 48];

function check(ctx) {
  const results = [];
  const projectRoot = ctx.PROJECT_ROOT || '.';
  const codeDir = ctx.codeDir || 'do-zhou';
  const utils = ctx.utils;

  // 读取 DESIGN-TOKENS.md
  const tokensPath = path.join(projectRoot, 'DESIGN-TOKENS.md');
  const tokensContent = utils.readFile(tokensPath);
  if (!tokensContent) {
    results.push({ check: 'Token强制', status: '🟡', detail: 'DESIGN-TOKENS.md 不存在。跳过' });
    return results;
  }

  // 提取 tokens 中定义的合法值
  const spacingRx = /(\d+)px|spacing[-:]\s*(\d+)/gi;
  const tokenSpacing = new Set(DEFAULT_SPACING);
  let m;
  while ((m = spacingRx.exec(tokensContent)) !== null) {
    tokenSpacing.add(parseInt(m[1] || m[2]));
  }

  const fontSizeRx = /font[-:]size[-:]\s*(\d+)|(\d+)px.*font/gi;
  const tokenFontSizes = new Set(DEFAULT_FONT_SIZES);

  // 扫描代码中的硬编码值
  const srcDir = path.join(projectRoot, codeDir, 'src');
  if (!fs.existsSync(srcDir)) return results;

  const allFiles = utils.findFiles(srcDir, ['.tsx', '.ts'], ctx.CONFIG?.ignoreDirs || ['node_modules', 'out', 'dist', '.git']);
  if (!allFiles?.length) return results;

  let hardcodedColors = 0;
  let suspiciousSpacing = 0;
  let suspiciousFontSize = 0;
  const colorViolations = [];
  const spacingViolations = [];
  const fontSizeViolations = [];

  for (const f of allFiles) {
    const content = utils.readFile(f) || '';
    const relPath = path.relative(path.join(projectRoot, codeDir), f);

    // 检测硬编码 hex 颜色（非 Tailwind 预设、非设计变量引用）
    const hexColors = content.match(/#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/g) || [];
    for (const hex of hexColors) {
      if (!tokensContent.includes(hex.toUpperCase())) {
        hardcodedColors++;
        if (colorViolations.length < 5) colorViolations.push(`${relPath}: ${hex}`);
      }
    }

    // 检测不在 spacing scale 内的 Tailwind 数值
    const tailwindSizes = content.match(/(?:p|m|gap|w|h|top|right|bottom|left)-\[(\d+)px\]/g) || [];
    for (const s of tailwindSizes) {
      const num = parseInt(s.match(/\d+/)[0]);
      if (!tokenSpacing.has(num)) {
        suspiciousSpacing++;
        if (spacingViolations.length < 5) spacingViolations.push(`${relPath}: ${s}`);
      }
    }

    // 检测不在 font scale 内的字号
    const tailwindFonts = content.match(/text-\[(\d+)px\]/g) || [];
    for (const s of tailwindFonts) {
      const num = parseInt(s.match(/\d+/)[0]);
      if (!tokenFontSizes.has(num)) {
        suspiciousFontSize++;
        if (fontSizeViolations.length < 5) fontSizeViolations.push(`${relPath}: ${s}`);
      }
    }
  }

  if (hardcodedColors > 0) {
    results.push({
      check: `Token强制: ${hardcodedColors}处硬编码颜色`,
      status: '🟠',
      detail: `禁止使用 DESIGN-TOKENS.md 未定义的 hex 颜色。示例: ${colorViolations.join(', ')}`,
    });
  } else {
    results.push({ check: 'Token强制: 颜色', status: '✅', found: true, detail: '无硬编码颜色' });
  }

  if (suspiciousSpacing > 0) {
    results.push({
      check: `Token强制: ${suspiciousSpacing}处非标准间距`,
      status: suspiciousSpacing > 10 ? '🟠' : '🟡',
      detail: `间距值不在 spacing scale 内。示例: ${spacingViolations.join(', ')}`,
    });
  }

  if (suspiciousFontSize > 0) {
    results.push({
      check: `Token强制: ${suspiciousFontSize}处非标准字号`,
      status: suspiciousFontSize > 10 ? '🟠' : '🟡',
      detail: `字号不在 font scale 内。示例: ${fontSizeViolations.join(', ')}`,
    });
  }

  return results;
}

module.exports = { check };
