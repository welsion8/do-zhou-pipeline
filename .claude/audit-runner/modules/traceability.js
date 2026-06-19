/**
 * traceability.js — Spec→代码 可追溯矩阵引擎
 *
 * 从 Product-Spec.md 自动提取所有功能条目，交叉引用：
 *   DEV-PLAN.md → codeFiles + phase
 *   .pen-frames.json → designFrames
 *   e2e/ 目录 → e2eTests
 *
 * 输出 traceability.json → audit-pipeline D1 可追溯性检查消费
 *
 * 用法:
 *   node traceability.js                            # 生成 traceability.json
 *   node traceability.js --check                    # CI 模式：验证覆盖率
 *   node traceability.js --missing                  # 列出未覆盖的 Spec 条目
 *
 * 通用性: 仅依赖 Spec 的 Markdown 结构（### 功能名 + 编号列表 + 表格）。
 *         换产品 → 换 Spec → 自动提取。不绑定产品内容。
 */

const fs = require('fs');
const path = require('path');

// ── Spec 解析器 ──

/**
 * 从 Product-Spec.md 提取功能需求条目
 */
function parseSpec(specContent) {
  const items = [];
  const lines = specContent.split('\n');
  let currentSection = '';
  let currentSubsection = '';
  let itemCounter = 0;

  // 匹配模式
  const sectionRx = /^##\s+(.+)/;
  const subSectionRx = /^###\s+(.+)/;
  const listItemRx = /^(?:\d+[\.\)]\s*|[-*]\s+)(.+)/;
  const tableRowRx = /^\|\s*(.+?)\s*\|/;
  const featurePhraseRx = /(可|应|必须|需要|提供|支持|允许|能够|点击|显示|触发|打开|切换|展开|折叠|保存|加载|生成|导出|导入|删除|新建|创建|编辑|输入|输出|发送|接收|拖拽|滚动|响应|自动)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // 二级标题 — 大功能分类
    const sMatch = line.match(sectionRx);
    if (sMatch) {
      currentSection = sMatch[1].trim();
      continue;
    }

    // 三级标题 — 具体功能/子功能
    const ssMatch = line.match(subSectionRx);
    if (ssMatch) {
      currentSubsection = ssMatch[1].trim();
      continue;
    }

    // 列表项 — 功能点
    const liMatch = line.match(listItemRx);
    if (liMatch && featurePhraseRx.test(liMatch[1])) {
      itemCounter++;
      const desc = liMatch[1].trim().substring(0, 120);
      items.push({
        id: `S-${itemCounter}`,
        section: currentSection,
        subsection: currentSubsection,
        description: desc,
        specLine: lineNum,
      });
      continue;
    }

    // 表格行 — 可能是功能描述
    const trMatch = line.match(tableRowRx);
    if (trMatch && featurePhraseRx.test(trMatch[1]) && !trMatch[1].includes('---') && !trMatch[1].includes('术语')) {
      const cols = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 2 && featurePhraseRx.test(cols[0])) {
        itemCounter++;
        items.push({
          id: `S-${itemCounter}`,
          section: currentSection,
          subsection: currentSubsection,
          description: cols[0].substring(0, 120),
          detail: cols[1] || '',
          specLine: lineNum,
        });
      }
    }
  }

  return items;
}

// ── DEV-PLAN 解析器 ──

/**
 * 从 DEV-PLAN.md 提取 Phase → 文件映射
 */
function parsePlan(planContent) {
  const mapping = [];
  const lines = planContent.split('\n');
  let currentPhase = null;

  for (const line of lines) {
    const pm = line.match(/^##\s*Phase\s*(\d+)/i);
    if (pm) { currentPhase = parseInt(pm[1]); continue; }

    const fm = line.match(/`(src\/[^`]+\.(tsx?|jsx?|css))`/);
    if (fm) {
      mapping.push({ phase: currentPhase, file: fm[1] });
    }
  }
  return mapping;
}

/**
 * 从 .pen-frames.json 提取帧→文件映射
 */
function parseFrames(framesContent) {
  const mapping = {};
  if (!framesContent) return mapping;
  let frames;
  try { frames = JSON.parse(framesContent); } catch (_) { return mapping; }

  for (const f of frames) {
    if (!f.id || !f.structure?.codeFile) continue;
    const codeFiles = Array.isArray(f.structure.codeFile) ? f.structure.codeFile : [f.structure.codeFile];
    mapping[f.id] = { name: f.name, codeFiles, phase: f.structure.phase };
  }
  return mapping;
}

/**
 * 从 e2e/ 目录扫描测试文件
 */
function scanE2ETests(codeDir) {
  const tests = [];
  // e2e 目录在代码目录内
  const e2eDir = path.join(codeDir, 'e2e');
  if (!fs.existsSync(e2eDir)) {
    // 回退: 尝试在 codeDir 父目录下查找
    const altDir = path.join(path.dirname(codeDir), 'e2e');
    if (fs.existsSync(altDir)) return scanE2ETestsAt(altDir);
    return tests;
  }
  return scanE2ETestsAt(e2eDir);
}

function scanE2ETestsAt(dir) {
  const tests = [];
  function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch (_) { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (e.name.endsWith('.spec.ts') || e.name.endsWith('.test.ts')) {
        let content;
        try { content = fs.readFileSync(full, 'utf-8'); } catch (_) { continue; }
        const testNames = [];
        const nameRx = /test\(['"](.+?)['"]/g;
        let nm;
        while ((nm = nameRx.exec(content)) !== null) testNames.push(nm[1]);
        tests.push({ file: path.relative(dir, full), tests: testNames });
      }
    }
  }
  walk(dir);
  return tests;
}

// ── 交叉引用引擎 ──

/**
 * 将 Spec 条目与代码/设计/测试交叉引用
 */
function crossReference(specItems, planFiles, frameMap, e2eTests, specContent) {
  const traceability = [];

  for (const item of specItems) {
    const entry = {
      id: item.id,
      section: item.section,
      subsection: item.subsection,
      description: item.description,
      specLine: item.specLine,
      codeFiles: [],
      designFrames: [],
      e2eTests: [],
      phase: null,
      status: 'unknown',
    };

    // 判断状态：从 Spec 上下文中检测标记
    const contextStart = Math.max(0, item.specLine - 5);
    const contextEnd = Math.min(specContent.split('\n').length, item.specLine + 3);
    const context = specContent.split('\n').slice(contextStart, contextEnd).join('\n');
    if (/✅|已完成|已实现/.test(context)) entry.status = 'implemented';
    else if (/🔄|进行中/.test(context)) entry.status = 'in_progress';
    else if (/📅|计划|待开发/.test(context)) entry.status = 'planned';

    // 关键词匹配：从描述中提取关键词匹配文件路径
    const keywords = extractKeywords(item.description);
    for (const pf of planFiles) {
      if (pf.file && keywords.some(kw => pf.file.toLowerCase().includes(kw.toLowerCase()))) {
        entry.codeFiles.push(pf.file);
        if (pf.phase && !entry.phase) entry.phase = pf.phase;
      }
    }

    // 关键词匹配设计帧
    const lowerDesc = item.description.toLowerCase();
    for (const [frameId, frameData] of Object.entries(frameMap)) {
      const frameLower = (frameData.name || '').toLowerCase();
      if (keywords.some(kw => frameLower.includes(kw.toLowerCase())) ||
          keywords.some(kw => lowerDesc.includes(frameLower.substring(0, 5)))) {
        entry.designFrames.push(frameId);
      }
    }

    // E2E 测试匹配
    for (const et of e2eTests) {
      const testLower = et.file.toLowerCase() + et.tests.join(' ').toLowerCase();
      if (keywords.some(kw => testLower.includes(kw.toLowerCase()))) {
        entry.e2eTests.push(et.file);
      }
    }

    // 去除重复
    entry.codeFiles = [...new Set(entry.codeFiles)];
    entry.designFrames = [...new Set(entry.designFrames)];
    entry.e2eTests = [...new Set(entry.e2eTests)];

    if (entry.codeFiles.length > 0) {
      entry.status = entry.status === 'unknown' ? 'implemented' : entry.status;
    }

    // 覆盖率判定
    entry.coverage = {
      hasCode: entry.codeFiles.length > 0,
      hasDesign: entry.designFrames.length > 0,
      hasTest: entry.e2eTests.length > 0,
      score: (entry.codeFiles.length > 0 ? 1 : 0) + (entry.designFrames.length > 0 ? 1 : 0) + (entry.e2eTests.length > 0 ? 1 : 0),
    };

    traceability.push(entry);
  }

  return traceability;
}

function extractKeywords(description) {
  const kwMap = {
    '大纲': ['outline'], '人物': ['character'], '章节': ['chapter'], '目录': ['chapter-index', 'chapter_index'],
    '编辑': ['editor'], '标签': ['tab'], '对话': ['chat', 'right-panel', 'ai'], 'AI': ['ai', 'chat', 'right-panel'],
    '工具栏': ['toolbar', 'app-layout'], '导航': ['left-panel', 'nav'], '导入': ['import', 'skill-home'],
    '导出': ['export', 'skill-home'], 'Skill': ['skill'], 'API': ['api'], '模型': ['model', 'api'],
    '设置': ['settings'], '项目': ['project', 'skill-home'], '回收站': ['recycle', 'skill-home'],
    '文件': ['file', 'left-panel'], '保存': ['save', 'editor'], '预览': ['preview', 'markdown'],
    '快捷键': ['shortcut', 'keybinding'], '搜索': ['search', 'find'], '替换': ['replace', 'find'],
    '切换': ['layout', 'app-layout'], '布局': ['layout', 'app-layout'], '小屏': ['layout', 'app-layout'],
    '响应式': ['layout', 'app-layout'], '右键': ['context-menu'], '菜单': ['context-menu', 'menu'],
    '弹窗': ['dialog', 'modal'], 'Toast': ['toast'], '错误': ['error', 'toast'],
    '撤销': ['undo', 'editor'], '重做': ['redo', 'editor'], '连接': ['api', 'connection'],
    '检查': ['api', 'check'], '发布': ['release', 'build'],
    // 新增映射
    '写作': ['editor', 'ai', 'chat'], '拖拽': ['left-panel', 'drag'], '滚动': ['scroll'],
    '面板': ['left-panel', 'right-panel'], '按钮': ['button', 'toolbar'], '启动': ['app-layout'],
    '阶段': ['left-panel', 'stage-card'], '引导': ['chat', 'ai'], '手动': ['editor', 'chat'],
    '输入框': ['chat-input', 'input'], '发送': ['chat-input', 'send'], '状态': ['status'],
    '提示': ['tooltip', 'toast'], '颜色': ['token'], '字体': ['token'], '间距': ['token'],
    '尺寸': ['layout', 'token'], '样式': ['token', 'globals'], '配置': ['settings', 'api-config'],
    '结构': ['app-layout', 'layout'], '标题': ['toolbar'], '卸载': ['app-layout'],
    '窗口': ['app-layout', 'window-controls'], '平台': ['app-layout'],
    '解析': ['chapter-index', 'parser'], '编号': ['chapter-index'], '重命名': ['file-tree'],
    '分割线': ['divider'], '选中': ['editor', 'selection'], '上下文': ['context'],
    '引擎': ['engine'], '桥接': ['bridge'], 'Session': ['session'],
    '策略': ['engine'], '回退': ['fallback'], '并发': ['engine'],
  };

  const keywords = [];
  const lower = description.toLowerCase();
  for (const [cn, ens] of Object.entries(kwMap)) {
    if (lower.includes(cn)) keywords.push(...ens);
  }
  return [...new Set(keywords)];
}

// ── 报告生成 ──

function generateReport(traceability) {
  const total = traceability.length;
  const implemented = traceability.filter(t => t.status === 'implemented').length;
  const withCode = traceability.filter(t => t.coverage.hasCode).length;
  const withDesign = traceability.filter(t => t.coverage.hasDesign).length;
  const withTest = traceability.filter(t => t.coverage.hasTest).length;
  const fullCoverage = traceability.filter(t => t.coverage.score === 3).length;
  const noCoverage = traceability.filter(t => t.coverage.score === 0).length;

  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalSpecItems: total,
      implemented,
      withCode: `${withCode}/${total} (${Math.round(withCode / total * 100)}%)`,
      withDesign: `${withDesign}/${total} (${Math.round(withDesign / total * 100)}%)`,
      withTest: `${withTest}/${total} (${Math.round(withTest / total * 100)}%)`,
      fullCoverage: `${fullCoverage}/${total}`,
      noCoverage,
    },
    items: traceability,
  };
}

// ── check() 接口（管线集成）──

function check(ctx) {
  const results = [];
  const projectRoot = ctx.PROJECT_ROOT || '.';

  const specFile = path.join(projectRoot, 'Product-Spec.md');
  const planFile = path.join(projectRoot, 'DEV-PLAN.md');
  const framesFile = path.join(projectRoot, '.claude', '.pen-frames.json');

  if (!fs.existsSync(specFile)) {
    results.push({ check: '可追溯性', status: '🟡', detail: 'Product-Spec.md 不存在' });
    return results;
  }

  const specContent = fs.readFileSync(specFile, 'utf-8');
  const planContent = fs.existsSync(planFile) ? fs.readFileSync(planFile, 'utf-8') : '';
  const framesContent = fs.existsSync(framesFile) ? fs.readFileSync(framesFile, 'utf-8') : null;

  const specItems = parseSpec(specContent);
  const planFiles = planContent ? parsePlan(planContent) : [];
  const frameMap = parseFrames(framesContent);
  const e2eTests = ctx.codeDir ? scanE2ETests(ctx.codeDir) : [];

  const trace = crossReference(specItems, planFiles, frameMap, e2eTests, specContent);
  const report = generateReport(trace);

  // 保存 traceability.json
  const outputPath = path.join(projectRoot, '.claude', '.traceability.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  // 判定
  // 从统一配置加载器读取阈值
  const cfg = require('./config-loader.js').load(projectRoot);
  const redThreshold = cfg.get('traceability.redThreshold');
  const yellowThreshold = cfg.get('traceability.yellowThreshold');

  // 排除非实现章节（产品概述/术语/场景/技术栈/依赖/安全要求）
  const nonImplSections = /产品概述|术语表|应用场景|技术栈|外部依赖|特殊要求|安全要求|项目目录|反功能/;
  const implItems = trace.filter(t => !nonImplSections.test(t.section));
  const noCoverageImpl = implItems.filter(t => t.coverage.score === 0);

  if (noCoverageImpl.length > 0) {
    results.push({
      check: '可追溯性-未覆盖',
      status: noCoverageImpl.length > redThreshold ? '🔴' : (noCoverageImpl.length > yellowThreshold ? '🟡' : '🟢'),
      detail: `${noCoverageImpl.length} 条可实现条目无代码/设计/测试覆盖 (阈值: 🔴>${redThreshold} 🟡>${yellowThreshold})`,
      items: noCoverageImpl.slice(0, 10).map(i => `${i.id}: ${i.description.substring(0, 60)}`),
    });
  }

  const noCodeItems = implItems.filter(t => !t.coverage.hasCode && t.status !== 'planned');
  if (noCodeItems.length > 0) {
    results.push({
      check: '可追溯性-缺代码',
      status: noCodeItems.length > 10 ? '🟡' : '🟢',
      detail: `${noCodeItems.length} 条可实现条目无对应代码文件`,
    });
  }

  const noTestItems = implItems.filter(t => !t.coverage.hasTest && t.status === 'implemented');
  if (noTestItems.length > 0) {
    results.push({
      check: '可追溯性-缺测试',
      status: noTestItems.length > 10 ? '🟡' : '🟢',
      detail: `${noTestItems.length} 条已实现条目缺 E2E 测试`,
    });
  }

  // Phase 感知阈值: 后期 Phase 要求更高覆盖率
  const currentPhase = ctx.currentPhase || 99;
  const codeCovPct = implItems.length > 0 ? Math.round((implItems.length - noCoverageImpl.length) / implItems.length * 100) : 0;
  let covThreshold = 60; // Phase 1-3
  if (currentPhase >= 8) covThreshold = 90;
  else if (currentPhase >= 4) covThreshold = 75;

  results.push({
    check: '可追溯性-概要',
    status: codeCovPct < covThreshold ? '🔴' : (codeCovPct < covThreshold + 10 ? '🟡' : '🟢'),
    detail: `${report.summary.totalSpecItems} 条 Spec → ${implItems.length} 条可实现 → ${codeCovPct}% 有代码 (Phase ${currentPhase} 阈值 ${covThreshold}%, 未覆盖 ${noCoverageImpl.length} 条)`,
  });

  // 功能完整性门禁
  results.push({
    check: '功能完整性门禁',
    status: codeCovPct >= covThreshold ? '🟢' : '🔴',
    detail: codeCovPct >= covThreshold
      ? `代码覆盖率 ${codeCovPct}% ≥ Phase ${currentPhase} 阈值 ${covThreshold}%`
      : `❌ 代码覆盖率 ${codeCovPct}% < Phase ${currentPhase} 阈值 ${covThreshold}%。缺失 ${noCoverageImpl.length} 条可实现的 Spec 条目未实现。`,
  });

  return results;
}

// ── 主入口 ──

function main() {
  const args = process.argv.slice(2);
  const projectRoot = process.env.CLAUDE_PROJECT_DIR || process.cwd();

  const specFile = path.join(projectRoot, 'Product-Spec.md');
  const planFile = path.join(projectRoot, 'DEV-PLAN.md');
  const framesFile = path.join(projectRoot, '.claude', '.pen-frames.json');

  if (!fs.existsSync(specFile)) {
    console.error('🔴 Product-Spec.md 不存在');
    process.exit(1);
  }

  const specContent = fs.readFileSync(specFile, 'utf-8');
  const planContent = fs.existsSync(planFile) ? fs.readFileSync(planFile, 'utf-8') : '';
  const framesContent = fs.existsSync(framesFile) ? fs.readFileSync(framesFile, 'utf-8') : null;

  const specItems = parseSpec(specContent);
  console.log(`📊 解析到 ${specItems.length} 条 Spec 功能需求`);

  const planFiles = parsePlan(planContent);
  console.log(`📁 DEV-PLAN: ${planFiles.length} 个文件引用`);

  const frameMap = parseFrames(framesContent);
  console.log(`🎨 设计帧: ${Object.keys(frameMap).length} 个映射`);

  const codeDir = path.join(projectRoot, 'do-zhou');
  const e2eTests = scanE2ETests(codeDir);
  console.log(`🧪 E2E 测试: ${e2eTests.length} 个文件`);

  const trace = crossReference(specItems, planFiles, frameMap, e2eTests, specContent);
  const report = generateReport(trace);

  const outputPath = path.join(projectRoot, '.claude', '.traceability.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`✅ .traceability.json 已生成: ${outputPath}`);

  // 打印摘要
  console.log(`\n📊 可追溯性矩阵:`);
  console.log(`   总计:     ${report.summary.totalSpecItems} 条`);
  console.log(`   有代码:   ${report.summary.withCode}`);
  console.log(`   有设计:   ${report.summary.withDesign}`);
  console.log(`   有测试:   ${report.summary.withTest}`);
  console.log(`   全覆盖:   ${report.summary.fullCoverage}`);
  console.log(`   未覆盖:   ${report.summary.noCoverage}`);

  if (args.includes('--missing')) {
    const noCoverage = trace.filter(t => t.coverage.score === 0);
    if (noCoverage.length > 0) {
      console.log(`\n⚠ 未覆盖条目:`);
      for (const item of noCoverage) {
        console.log(`  ${item.id}: ${item.description.substring(0, 100)}`);
      }
    }
  }
}

module.exports = { parseSpec, crossReference, generateReport, check };

if (require.main === module) {
  main();
}
