/**
 * D3 完整性 — 状态覆盖 / 导航闭环 / 交互行为确认
 */
function checkStateCoverage(ctx) {
  const { specContent, codeDir, utils } = ctx;
  const results = [];
  if (!codeDir) return results;

  const allFiles = utils.findFiles(codeDir, ['.tsx', '.ts', '.jsx', '.js'], ctx.CONFIG.ignoreDirs);
  const fileContents = {};
  for (const f of allFiles) {
    fileContents[require('path').relative(codeDir, f)] = utils.readFile(f) || '';
  }

  const stateChecks = [
    { label: '空状态处理', pattern: /empty|isEmpty|暂无|\(空\)/gi, specPattern: /空状态|empty.*state|无数据/gi },
    { label: '加载状态', pattern: /loading|isLoading|spinner/gi, specPattern: /加载|loading/gi },
    { label: '错误状态', pattern: /error|catch|try.*catch|错误/gi, specPattern: /错误.*态|error.*state/gi },
    { label: '无障碍属性', pattern: /aria-|role=|tabIndex|onKeyDown/gi, specPattern: /无障碍|键盘操作|keyboard/gi },
  ];

  for (const sc of stateChecks) {
    const specHas = sc.specPattern.test(specContent || '');
    const codeFiles = [];
    for (const [relPath, content] of Object.entries(fileContents)) {
      sc.specPattern.lastIndex = 0;
      if (sc.pattern.test(content)) codeFiles.push(relPath);
    }
    results.push({
      label: sc.label, specMentions: specHas, codeFiles,
      status: specHas && codeFiles.length === 0 ? '🔴' : specHas && codeFiles.length > 0 ? '🟢' : '🟡',
    });
  }

  // 溢出防护
  const overflowFiles = [];
  for (const f of allFiles) {
    const content = utils.readFile(f) || '';
    if (content.includes('overflow') || content.includes('scroll')) {
      overflowFiles.push(require('path').relative(codeDir, f));
    }
  }
  results.push({
    label: '溢出防护 (overflow/scroll)', specMentions: true, codeFiles: overflowFiles,
    status: overflowFiles.length > 0 ? '🟢' : '🟡',
  });
  return results;
}

function checkNavigationClosure(ctx) {
  const { specContent } = ctx;
  const results = [];
  const pagePatterns = [
    { name: 'API 配置页面', pattern: /API.*配置|api.*config|模型.*配置/gi },
    { name: '设置页面', pattern: /设置.*页面|settings.*page/gi },
    { name: 'Skill 编辑器', pattern: /Skill.*编辑|skill.*editor/gi },
    { name: '新建项目弹窗', pattern: /新建.*项目|new.*project/gi },
  ];
  for (const pp of pagePatterns) {
    pp.pattern.lastIndex = 0;
    if (pp.pattern.test(specContent || '')) {
      let hasBackPath = false;
      for (const line of (specContent || '').split('\n')) {
        if (/返回|←|关闭|back|close|退出/.test(line)) hasBackPath = true;
      }
      results.push({ page: pp.name, hasBackPath, status: hasBackPath ? '✅' : '🔴',
        detail: hasBackPath ? '存在返回路径' : '缺少返回路径' });
    }
  }
  return results;
}

function checkInteractionChecklist(ctx) {
  const { specContent } = ctx;
  const results = [];
  const triggers = [
    { pattern: /点击.*保存|保存.*按钮|保存.*点击/gi, label: '保存按钮行为: 点击后是否保持当前展开状态', instruction: 'Agent 需确认：点击保存后界面停留在展开态而非自动关闭' },
    { pattern: /点击.*取消|取消.*按钮/gi, label: '取消按钮行为: 是否回退到操作前状态', instruction: 'Agent 需确认：取消后恢复原状态，不留半截数据' },
    { pattern: /点击.*删除|删除.*确认/gi, label: '删除按钮行为: 是否有二次确认', instruction: 'Agent 需确认：破坏性操作有确认弹窗' },
    { pattern: /展开|折叠|toggle|切换/gi, label: '展开/折叠行为: 展开后是否可再次点击折叠', instruction: 'Agent 需确认：展开和折叠操作对称' },
    { pattern: /拖拽|drag|排序/gi, label: '拖拽行为: 拖拽后列表是否保持新顺序', instruction: 'Agent 需确认：拖拽后顺序保存，刷新不丢' },
    { pattern: /输入|键入|填写/gi, label: '输入行为: 输入框中是否有默认值/placeholder', instruction: 'Agent 需确认：所有输入框有明确的提示或初始值' },
  ];
  for (const t of triggers) {
    t.pattern.lastIndex = 0;
    if (t.pattern.test(specContent || '')) results.push({ label: t.label, instruction: t.instruction, status: '⏳' });
  }
  return results;
}

function check(ctx) {
  return [
    ...checkStateCoverage(ctx),
    ...checkNavigationClosure(ctx),
    ...checkInteractionChecklist(ctx),
    ...checkGlobalPatternConsistency(ctx),
    ...checkTokenPrecision(ctx),
  ];
}

// 🆕 Token 用量精度 — 涉及 AI 的产品必须定义 4 项精度子项
function checkTokenPrecision(ctx) {
  const results = [];
  const specContent = ctx.specContent;
  if (!specContent) return results;

  // 检测 Spec 是否涉及 AI/LLM 调用
  const hasAI = /AI|LLM|模型|Claude|GPT|token|Token|流式/.test(specContent);
  if (!hasAI) return results; // 不涉及 AI 的产品豁免

  const checks = [
    { label: 'Token精度: 计费tokenizer', pattern: /tokenizer|tiktoken|claude.*token|char\s*\/\s*4|计费.*方式/gi },
    { label: 'Token精度: 统计范围', pattern: /system.*prompt|tool.*call|往返|统计.*范围|包含/gi },
    { label: 'Token精度: 舍入规则', pattern: /向上取整|四舍五入|截断|舍入|round/gi },
    { label: 'Token精度: 显示精度', pattern: /显示.*精度|K|token|实时|会话.*结束|刷新.*频率/gi },
  ];

  let missing = 0;
  for (const c of checks) {
    if (!c.pattern.test(specContent)) {
      missing++;
      results.push({ check: c.label, status: '🟡', detail: 'Spec 中未定义此项。参见 product-spec-template.md Token 用量精度要求。' });
    }
  }

  if (missing === 0) {
    results.push({ check: 'Token 用量精度', status: '✅', found: true, detail: '4 项精度子项均已定义' });
  } else if (missing > 0) {
    results.push({ check: `Token 用量精度: 缺 ${missing}/4 项`, status: missing >= 3 ? '🟠' : '🟡', detail: '开发者实现时会猜测，导致跨模型计费不一致' });
  }

  return results;
}

// 🆕 全局交互模式一致性 — 程序化检测所有页面是否遵循统一模板
function checkGlobalPatternConsistency(ctx) {
  const results = [];
  const codeDir = ctx.codeDir;
  if (!codeDir) return results;

  const utils = ctx.utils;
  const projectRoot = ctx.PROJECT_ROOT || '.';
  const patternTemplate = utils.readFile(
    require('path').join(projectRoot, '.claude', 'skills', 'design-brief-builder', 'templates', 'global-patterns-template.md')
  );

  // 模板不存在 → 尚未定义全局模式 → 🟡 提醒创建
  if (!patternTemplate) {
    results.push({
      check: '全局交互模式: 模板',
      status: '🟡',
      detail: 'global-patterns-template.md 未创建。建议在 Design-Brief 阶段生成。',
    });
    return results;
  }

  // 提取模板中定义的空态/错误态/加载态 className 关键词
  const emptyPattern = (patternTemplate.match(/空态[\s\S]*?(?=## )/) || [''])[0];
  const errorPattern = (patternTemplate.match(/错误态[\s\S]*?(?=## )/) || [''])[0];
  const loadingPattern = (patternTemplate.match(/加载态[\s\S]*?(?=## )/) || [''])[0];

  // 收集所有页面组件的空态/错误态实现
  const pageFiles = utils.findFiles(codeDir, ['.tsx'], ctx.CONFIG?.ignoreDirs || ['node_modules', 'out', 'dist', '.git'])
    .filter(f => f.includes('page') || f.includes('Page') || f.includes('view') || f.includes('View'));

  if (pageFiles.length === 0) {
    results.push({ check: '全局交互模式: 页面扫描', status: '🟡', detail: '未找到页面组件，跳过' });
    return results;
  }

  // 逐页面检查空态/错误态/加载态是否遵循模板的 className 模式
  const patternStats = { empty: [], error: [], loading: [] };
  for (const pf of pageFiles) {
    const content = utils.readFile(pf) || '';
    const pageName = require('path').basename(pf, '.tsx');

    // 检测空态实现
    const hasEmpty = /暂无|empty|isEmpty|空/.test(content);
    const hasEmptyLayout = /flex.*flex-col.*items-center.*justify-center/.test(content) ||
                           /flex.*items-center.*justify-center/.test(content);
    if (hasEmpty && !hasEmptyLayout) {
      patternStats.empty.push(pageName);
    }

    // 检测错误态实现
    const hasError = /错误|error|catch|失败/.test(content);
    const hasErrorStyle = /#2A2520|#F0A060|#E57373/.test(content);
    if (hasError && !hasErrorStyle) {
      patternStats.error.push(pageName);
    }

    // 检测加载态实现
    const hasLoading = /loading|spinner|skeleton|加载/.test(content);
    const hasSpinner = /spinner|animate-spin/.test(content);
    const hasSkeleton = /skeleton|animate-pulse/.test(content);
    const hasLoadingText = /加载中/.test(content);
    if (hasLoading && !hasSpinner && !hasSkeleton && !hasLoadingText) {
      patternStats.loading.push(pageName);
    }
  }

  // 输出一致性报告
  const totalPages = pageFiles.length;

  if (patternStats.empty.length > 0) {
    results.push({
      check: `全局空态一致性: ${patternStats.empty.length}页偏离`,
      status: '🟠',
      detail: `偏离页面: ${patternStats.empty.join(', ')}。模板要求 flex+items-center+justify-center 布局`,
    });
  } else {
    results.push({ check: '全局空态一致性', status: '✅', found: true, detail: `${totalPages} 页均符合空态模板` });
  }

  if (patternStats.error.length > 0) {
    results.push({
      check: `全局错误态一致性: ${patternStats.error.length}页偏离`,
      status: '🟡',
      detail: `偏离页面: ${patternStats.error.join(', ')}。模板要求 #2A2520/#F0A060 错误语义配色`,
    });
  }

  if (patternStats.loading.length > 0) {
    results.push({
      check: `全局加载态一致性: ${patternStats.loading.length}页偏离`,
      status: '🟡',
      detail: `偏离页面: ${patternStats.loading.join(', ')}。模板要求 spinner 或 skeleton 实现`,
    });
  }

  return results;
}

module.exports = { check };
