/**
 * D1 可追溯性 — Spec 行为关键词 → 代码实现
 */
const SPEC_BEHAVIOR_PATTERNS = [
  { key: 'collapsible', pattern: /可折叠|折叠|展开|收起/g, desc: '折叠/展开交互' },
  { key: 'draggable', pattern: /可拖拽|拖拽|拖动|调整.*宽/g, desc: '拖拽交互' },
  { key: 'resizable', pattern: /可.*调整|resize|分隔线|分栏/g, desc: '面板尺寸调整' },
  { key: 'contextMenu', pattern: /右键菜单|右键|context\s*menu/g, desc: '右键菜单' },
  { key: 'doubleClick', pattern: /双击|double\s*click/g, desc: '双击交互' },
  { key: 'animation', pattern: /动画|过渡|transition|动效/g, desc: '动画效果' },
  { key: 'keyboard', pattern: /快捷键|键盘|Ctrl\+|Cmd\+|热键/g, desc: '键盘操作' },
  { key: 'autosave', pattern: /自动保存|auto.*save/g, desc: '自动保存' },
  { key: 'tooltip', pattern: /提示|tooltip|悬停.*提示/g, desc: '悬停提示' },
  { key: 'loading', pattern: /加载中|loading|加载态/g, desc: '加载状态' },
  { key: 'empty', pattern: /空状态|空.*态|无数据|暂无/g, desc: '空状态' },
  { key: 'error', pattern: /错误态|错误.*提示|失败.*提示|error.*state/g, desc: '错误状态' },
  { key: 'toast', pattern: /toast|通知|提示.*条|snackbar/g, desc: 'Toast 通知' },
  { key: 'modal', pattern: /弹窗|对话框|modal|dialog|确认.*框/g, desc: '弹窗/对话框' },
  { key: 'tabNavigation', pattern: /标签.*切换|tab.*切换|标签页/g, desc: '标签页切换' },
  { key: 'dragAndDrop', pattern: /拖拽.*排序|drag.*drop|拖放/g, desc: '拖拽排序' },
  { key: 'scrollbar', pattern: /滚动条|scrollbar|overflow.*scroll/g, desc: '滚动条' },
  { key: 'darkMode', pattern: /深色.*主题|dark.*mode|浅色.*主题|主题.*切换/g, desc: '双主题' },
  { key: 'focusRing', pattern: /focus.*ring|聚焦.*环|焦点.*样式/g, desc: '焦点指示器' },
  { key: 'responsive', pattern: /响应式|responsive|断点|小屏|适配/g, desc: '响应式适配' },
];

function check(ctx) {
  const { specContent, codeScan, utils } = ctx;
  const results = [];

  if (!specContent) return results;

  const specLines = specContent.split('\n');
  const specBehaviors = [];

  for (const bp of SPEC_BEHAVIOR_PATTERNS) {
    bp.pattern.lastIndex = 0;
    for (let i = 0; i < specLines.length; i++) {
      bp.pattern.lastIndex = 0;
      if (bp.pattern.test(specLines[i])) {
        specBehaviors.push({ keyword: bp.key, description: bp.desc, line: i + 1, text: specLines[i].trim() });
      }
    }
  }

  const specKeywords = new Set(specBehaviors.map(b => b.keyword));
  for (const keyword of specKeywords) {
    const specItems = specBehaviors.filter(b => b.keyword === keyword);
    const codeItems = codeScan.behaviorResults.filter(b => b.keyword === keyword);
    const anyFound = codeItems.some(c => c.found);

    let status = '🟢';
    if (!anyFound && codeItems.length > 0) status = '🔴';
    else if (!anyFound && codeItems.length === 0) status = '🟡';

    results.push({
      keyword, description: specItems[0]?.description || keyword,
      specMentions: specItems.map(s => ({ line: s.line, text: s.text.substring(0, 80) })),
      codeChecks: codeItems.map(c => ({ check: c.check, found: c.found, files: c.matches.map(m => m.file) })),
      status,
    });
  }
  return results;
}

module.exports = { check, SPEC_BEHAVIOR_PATTERNS };
