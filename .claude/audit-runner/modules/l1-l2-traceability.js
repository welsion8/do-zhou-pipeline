/**
 * L1↔L2 功能覆盖追溯 — Spec 每个功能域 → 设计帧是否有对应
 *
 * 桥梁：DEV-PLAN 的 "设计帧 → Phase 映射总表"
 * 不依赖 MCP 读取 .pen 文件，只读 DEV-PLAN 的映射关系
 *
 * 检查维度:
 *   D1 正向: Spec 功能 → 至少一帧覆盖？缺→🔴
 *   D1 反向: 设计帧 → Spec 功能对应？多余的→🟡
 *   D3 完整性: 帧是否覆盖了 Spec 要求的状态变体（空态/错误态/加载态）
 */

const path = require('path');

// Spec 功能域 → 帧覆盖映射（从 DEV-PLAN 的设计帧映射表提取）
function extractFrameMapping(planContent) {
  if (!planContent) return { frames: [], phaseMap: {} };

  const lines = planContent.split('\n');
  const frames = [];
  let inMapping = false;

  for (const line of lines) {
    // 检测映射表开始
    if (line.includes('设计帧 → Phase 映射总表')) { inMapping = true; continue; }
    if (inMapping && line.startsWith('##')) { inMapping = false; continue; }

    if (inMapping) {
      // 格式: | XJ3UP | Skill 主页面 | 主页面 | Phase 10 |
      const m = line.match(/\|\s*(\w+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/);
      if (m) {
        frames.push({
          id: m[1].trim(),
          name: m[2].trim(),
          type: m[3].trim(),
          phases: m[4].trim().split(',').map(p => p.trim()),
        });
      }
    }
  }
  return { frames };
}

// Spec 功能域定义（对齐 Product-Spec.md 章节结构）
const SPEC_FEATURES = [
  { id: 'skill-management', name: '技能包管理', section: '§1', keyElements: [
    'Skill 编辑器（6标签页）', '导入/导出 Skill', 'Skill 卡片拖拽排序', '删除 Skill 关联保护',
  ]},
  { id: 'project-management', name: '项目管理', section: '§2', keyElements: [
    '项目右键菜单（6项）', '新建项目', '三级删除机制', '回收站恢复冲突处理',
  ]},
  { id: 'workspace-layout', name: '写作工作台三栏布局', section: '§3', keyElements: [
    '左侧导航区（阶段卡片+文件树）', '中间编辑区（多标签页）', '右侧AI对话区',
    '面板独立滚动', '可拖拽分隔线', '响应式断点适配',
  ]},
  { id: 'stage-navigation', name: '阶段导航与文件映射', section: '§4', keyElements: [
    '4阶段卡片（⏹/⟳/✅三态）', '阶段→文件绑定', '状态转移矩阵',
  ]},
  { id: 'chapter-index', name: '章节目录智能映射', section: '§5', keyElements: [
    '章节索引竖列视图', '章节行（号+标题+箭头）', 'chapter_index空态', '一致性警告',
  ]},
  { id: 'editor', name: '编辑器', section: '§6', keyElements: [
    '多标签页管理', 'Markdown编辑/预览切换', '编辑器右键菜单', '编辑器快捷键',
  ]},
  { id: 'ai-chat', name: 'AI对话', section: '§7', keyElements: [
    '流式输出', '对话历史搜索', '内联操作按钮', '防重复点击', 'Token用量显示',
    'API失败重试', '输入框发送按钮状态',
  ]},
  { id: 'api-config', name: 'API模型配置', section: '§8', keyElements: [
    '提供商列表', '内联展开编辑', '一键拉取模型', 'API配置页返回工作台',
  ]},
  { id: 'dual-engine', name: '双引擎架构', section: '§9', keyElements: [
    '引擎切换中加载态', '桥接失败处理', '能力降级提示',
  ]},
  { id: 'window-adapt', name: '窗口适配规则', section: '§10', keyElements: [
    '4断点响应式', '面板收起/展开', '窗口关闭确认（AI生成中）',
  ]},
  { id: 'settings', name: '设置页面', section: '§11', keyElements: [
    '5标签页设置', '数据备份恢复',
  ]},
  { id: 'global-nav', name: '全局导航', section: '§12', keyElements: [
    '面包屑导航', 'Skill主页入口', '模型快速切换下拉',
  ]},
];

// 要求覆盖的状态变体
const REQUIRED_STATES = ['空状态', '错误态', '加载态', '确认弹窗'];

function check(ctx) {
  const { planContent, specContent } = ctx;
  const results = [];
  if (!planContent) return results;

  const { frames } = extractFrameMapping(planContent);
  if (frames.length === 0) return results;

  // ── 模糊匹配辅助 ──
  // 关键词别名：Spec 中文术语 → 设计帧英文/简写
function getAliases(featureName) {
  const aliasMap = {
    '技能包管理': ['skill', 'Skill'],
    '项目管理': ['项目', 'project'],
    '三栏布局': ['工作台', '工具栏', '布局'],
    '阶段导航': ['阶段', 'stage', '工作台', '卡片', '导航'],
    '章节目录': ['章节目录', '章节', 'chapter', '目录'],
    '编辑器': ['编辑', 'editor', '标签页', 'tab'],
    'ai对话': ['对话', 'chat', 'ai', 'AI', '消息', '引导', '发送', '提问'],
    'api模型配置': ['api', 'API', '模型', '配置', 'provider'],
    '双引擎架构': ['引擎', 'engine'],
    '窗口适配': ['小屏', '适配', '响应式', '窗口'],
    '设置页面': ['设置', 'setting'],
    '全局导航': ['导航', '面包屑', '模型切换', '下拉'],
  };
  const fnLower = featureName.toLowerCase();
  for (const [key, aliases] of Object.entries(aliasMap)) {
    if (fnLower.includes(key) || key.includes(fnLower)) return aliases;
  }
  return [];
}

function fuzzyMatch(frameName, featureName, featureId) {
  const fn = frameName.toLowerCase();
  const fsn = featureName.toLowerCase();
  const fid = featureId.toLowerCase();

  // 双向包含
  if (fn.includes(fsn) || fsn.includes(fn)) return true;

  // 关键词别名匹配
  const aliases = getAliases(featureName);
  if (aliases.some(a => fn.includes(a.toLowerCase()))) return true;

  // 核心词提取
  const coreWords = fsn.replace(/[（）()]/g, ' ').split(/\s+/).filter(w => w.length >= 2);
  return coreWords.some(w => fn.includes(w));
}

  // ── D1 正向: Spec 功能 → 帧覆盖 ──
  for (const feature of SPEC_FEATURES) {
    const matchedFrames = frames.filter(f => fuzzyMatch(f.name, feature.name, feature.id));

    if (matchedFrames.length === 0) {
      results.push({
        check: `[${feature.section}] ${feature.name} → 设计帧?`,
        status: '🔴',
        detail: `未找到覆盖该功能域的设计帧。DEV-PLAN 映射表中 ${frames.length} 帧无匹配`,
        feature: feature.id,
      });
    } else {
      results.push({
        check: `[${feature.section}] ${feature.name} → ${matchedFrames.length}帧`,
        status: '✅',
        found: true,
        detail: matchedFrames.map(f => f.id + ' ' + f.name).join(', '),
        feature: feature.id,
      });
    }
  }

  // ── D1 反向: 每个帧 → Spec 功能对应 ──
  for (const frame of frames) {
    const matched = SPEC_FEATURES.filter(f => fuzzyMatch(frame.name, f.name, f.id));
    if (matched.length === 0) {
      results.push({
        check: `帧 ${frame.id} "${frame.name}" → Spec 功能?`,
        status: '🟡',
        detail: '该设计帧未匹配到 Spec 中的功能域——可能是多余设计或 Spec 遗漏',
        frame: frame.id,
      });
    }
  }

  // ── D3 状态变体覆盖 ──
  const stateTypes = frames.filter(f => f.type.includes('状态') || f.type.includes('弹窗') || f.type.includes('变体'));
  const stateCoverage = SPEC_FEATURES.filter(f => {
    return REQUIRED_STATES.some(state => {
      const hasStateInSpec = (specContent || '').includes(state) &&
        (specContent || '').includes(f.name.substring(0, 2));
      return hasStateInSpec;
    });
  });

  const uncoveredStates = [];
  for (const feature of SPEC_FEATURES) {
    for (const state of REQUIRED_STATES) {
      const specText = (specContent || '');
      // 检查 Spec 是否提到了这个状态 + 功能
      const sectionIdx = specText.indexOf(feature.section);
      if (sectionIdx === -1) continue;
      const sectionText = specText.substring(sectionIdx, sectionIdx + 500);
      if (!sectionText.includes(state)) {
        uncoveredStates.push({ feature: feature.name, state });
      }
    }
  }

  if (uncoveredStates.length > 0) {
    const byFeature = {};
    for (const us of uncoveredStates) {
      if (!byFeature[us.feature]) byFeature[us.feature] = [];
      byFeature[us.feature].push(us.state);
    }
    for (const [feature, states] of Object.entries(byFeature).slice(0, 5)) {
      results.push({
        check: `${feature}: 缺少状态定义 → ${states.join(', ')}`,
        status: '🟡',
        detail: `Spec 中该功能域未定义以上状态变体`,
      });
    }
  }

  return results;
}

module.exports = { check };
