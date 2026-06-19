/**
 * L2 设计规范自洽 — Design-Brief.md / DESIGN-TOKENS.md / Spec 交叉比对
 *
 * 纯文本审计，不需要 MCP 读取 .pen 文件。
 *
 * 检查:
 *   D2: Design-Brief ↔ DESIGN-TOKENS 变量一致性
 *   D2: Design-Brief ↔ Spec 视觉概念覆盖
 *   D3: 双主题/状态变体/focus-ring/reduced-motion 是否定义
 */

const path = require('path');

// Spec 中提出的视觉概念——Design-Brief 应该覆盖
const SPEC_VISUAL_CONCEPTS = [
  { concept: '深色/浅色双主题', specKey: /深色|浅色|dark|light|主题|theme/i, briefKey: /深色|浅色|dark|light|主题切换/i, required: true },
  { concept: 'accent 强调色', specKey: /accent|强调色|\$accent/i, briefKey: /\$accent|accent|强调色/i, required: true },
  { concept: '面板背景色', specKey: /bg-panel|面板|背景/i, briefKey: /bg-panel|panel|面板.*色/i, required: true },
  { concept: '字体层级（标题/正文/辅助）', specKey: /font|字体|字号/i, briefKey: /font|字体|字号|typography/i, required: true },
  { concept: '间距体系', specKey: /padding|gap|间距|spacing/i, briefKey: /spacing|间距|padding|gap/i, required: false },
  { concept: '圆角规范', specKey: /radius|圆角|rounded/i, briefKey: /radius|圆角|rounded/i, required: false },
  { concept: 'focus-ring 样式', specKey: /focus.*ring|聚焦|焦点/i, briefKey: /focus.*ring|聚焦|焦点样式/i, required: true },
  { concept: 'reduced-motion 降级', specKey: /reduced.*motion|动效|动画.*降级/i, briefKey: /reduced.*motion|prefers.*reduced/i, required: true },
  { concept: '边框规范', specKey: /border|边框\b/i, briefKey: /border|边框|stroke/i, required: false },
  { concept: '滚动条样式', specKey: /scrollbar|滚动条/i, briefKey: /scrollbar|滚动条/i, required: true },
  { concept: '全局错误态颜色', specKey: /错误.*态|error.*state|#E573|#3D20/i, briefKey: /错误.*色|error.*color|danger/i, required: false },
  { concept: '全局空态设计', specKey: /空状态|empty.*state/i, briefKey: /空.*态|empty.*state|空.*设计/i, required: false },
];

function check(ctx) {
  const { CONFIG, utils } = ctx;
  const results = [];

  const projectRoot = ctx.PROJECT_ROOT || '.';
  const designBriefPath = path.join(projectRoot, 'Design-Brief.md');
  const tokensPath = path.join(projectRoot, 'DESIGN-TOKENS.md');
  const specContent = ctx.specContent || '';

  const briefContent = utils.readFile(designBriefPath);
  const tokensContent = utils.readFile(tokensPath);

  // ── L2 层存在性检测 ──
  if (!briefContent) {
    results.push({ check: 'Design-Brief.md 存在', status: '🔴', detail: '设计规范文件不存在。跳过 L2 审计。' });
    return results;
  }
  results.push({ check: 'Design-Brief.md 存在', status: '✅', found: true });

  if (!tokensContent) {
    results.push({ check: 'DESIGN-TOKENS.md 存在', status: '🟡', detail: '设计变量文件不存在。跳过变量一致性检查。' });
  }

  // ── D2: Spec 视觉概念 → Design-Brief 覆盖 ──
  for (const vc of SPEC_VISUAL_CONCEPTS) {
    // 检查 Spec 是否提到了这个概念
    if (!vc.specKey.test(specContent)) continue;

    // 检查 Design-Brief 是否覆盖
    const covered = vc.briefKey.test(briefContent);
    results.push({
      check: `Spec→Brief: ${vc.concept}`,
      status: covered ? '✅' : (vc.required ? '🔴' : '🟡'),
      detail: covered ? '已覆盖' : `Design-Brief 未定义该概念${vc.required ? '（必需）' : ''}`,
    });
  }

  // ── D2: Design-Brief ↔ DESIGN-TOKENS 变量名一致性 ──
  if (tokensContent) {
    // 从 Brief 提取变量引用（$xxx 格式）
    const briefVars = new Set();
    for (const m of briefContent.matchAll(/\$([a-zA-Z][\w-]*)/g)) {
      briefVars.add(m[1]);
    }
    // 从 TOKENS 提取变量定义
    const tokensVars = new Set();
    for (const m of tokensContent.matchAll(/--([a-zA-Z][\w-]*)/g)) {
      tokensVars.add(m[1]);
    }

    // Brief 引用了但 TOKENS 没定义的变量
    const undefinedVars = [...briefVars].filter(v => !tokensVars.has(v));
    if (undefinedVars.length > 0) {
      results.push({
        check: `Brief→TOKENS: 未定义变量`,
        status: '🔴',
        detail: `Design-Brief 引用了但 DESIGN-TOKENS 未定义: ${undefinedVars.join(', ')}`,
      });
    } else {
      results.push({ check: 'Brief→TOKENS: 变量一致性', status: '✅', found: true });
    }

    // TOKENS 定义了但 Brief 没引用的变量（可能有冗余）
    const unusedVars = [...tokensVars].filter(v => !briefVars.has(v));
    if (unusedVars.length > 0 && unusedVars.length > 5) {
      results.push({
        check: `TOKENS→Brief: 未引用变量`,
        status: '🟡',
        detail: `TOKENS 定义了 ${unusedVars.length} 个变量但 Brief 未引用，可能有冗余`,
      });
    }
  }

  // ── D3: 双主题覆盖 ──
  const hasDark = /深色|dark|\.dark|\:root.*dark/i.test(briefContent);
  const hasLight = /浅色|light|\.light|\:root.*light/i.test(briefContent);
  const hasThemeSwitch = /主题.*切换|theme.*switch|跟随系统/i.test(briefContent);
  results.push({
    check: '双主题覆盖',
    status: hasDark && hasLight ? '✅' : (hasDark || hasLight ? '🟡' : '🔴'),
    detail: hasDark && hasLight ? '深色+浅色已定义' :
            hasDark ? '仅定义深色，缺浅色' :
            hasLight ? '仅定义浅色，缺深色' : '双主题均未定义',
  });
  if (!hasThemeSwitch) {
    results.push({ check: '主题切换机制', status: '🟡', detail: 'Design-Brief 未描述主题切换方式' });
  }

  // ── D3: Focus-ring ──
  const hasFocusRing = /focus.*ring|:focus-visible|outline.*颜色|outline.*color/i.test(briefContent);
  results.push({
    check: 'Focus-ring 定义',
    status: hasFocusRing ? '✅' : '🔴',
    detail: hasFocusRing ? '已定义' : '未定义 focus-ring 样式——键盘导航用户无法感知焦点位置',
  });

  // ── D3: Reduced-motion ──
  const hasReducedMotion = /reduced.*motion|prefers-reduced|动效.*禁用|动画.*关闭/i.test(briefContent);
  results.push({
    check: 'Reduced-motion 降级',
    status: hasReducedMotion ? '✅' : '🟠',
    detail: hasReducedMotion ? '已定义' : '未定义 reduced-motion——无障碍合规要求',
  });

  return results;
}

module.exports = { check };
