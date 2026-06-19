/**
 * 设计 Token → 代码映射生成器
 *
 * 用法: node .claude/audit-runner/modules/token-mapper.js
 * 输入: DESIGN-TOKENS.md + tailwind.config (如有)
 * 输出: .claude/.token-map.json（供像素级比对使用）
 *
 * 维护方式: 设计 tokens 变更后 → 跑一次 → 映射自动更新
 * 通用性: 换产品 → 换 DESIGN-TOKENS.md → 自动提取新产品的 tokens
 */

const fs = require('fs');
const path = require('path');

function generate(projectRoot) {
  const root = projectRoot || '.';
  const tokensPath = path.join(root, 'DESIGN-TOKENS.md');
  const outputPath = path.join(root, '.claude', '.token-map.json');

  if (!fs.existsSync(tokensPath)) {
    console.log('🟡 DESIGN-TOKENS.md 不存在。颜色映射将仅依赖 Tailwind 默认值。');
    return null;
  }

  const content = fs.readFileSync(tokensPath, 'utf-8');
  const map = {};

  // 匹配模式: `$token-name: #HEX` 或 `--token-name: #HEX`
  const tokenRe = /^[-$]*(?:[\w-]+):\s*(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgba?\([^)]+\))/gm;
  let m;
  while ((m = tokenRe.exec(content)) !== null) {
    // 提取 token 名称和 hex 值
    const fullLine = m[0];
    const hexValue = m[1];
    const tokenName = fullLine.split(':')[0].trim().replace(/^[-$]+/, '');

    // 生成 Tailwind 到 hex 的映射
    // bg-bg-panel → $bg-panel → #1A1A2E
    const tailwindClass = tokenName.replace(/_/g, '-'); // snake_case → kebab-case
    map[tailwindClass] = {
      token: `$${tokenName}`,
      hex: hexValue,
      tailwindBg: `bg-${tailwindClass}`,
      tailwindText: `text-${tailwindClass}`,
      tailwindBorder: `border-${tailwindClass}`,
    };
  }

  fs.writeFileSync(outputPath, JSON.stringify(map, null, 2));
  console.log(`✅ .token-map.json 已生成: ${Object.keys(map).length} 个 token 映射`);
  return map;
}

// 直接运行时生成
if (require.main === module) {
  const projectRoot = process.argv[2] || '.';
  generate(projectRoot);
}

module.exports = { generate };