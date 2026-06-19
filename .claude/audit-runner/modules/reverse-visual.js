/**
 * 反向视觉检测 — 代码中有但 Spec/设计帧中未提及的交互元素
 */
const EXTRA_PATTERNS = [
  { codePattern: /type=["']password["']|showKey|setShowKey|eye.*toggle|👁|🙈/gi, specPattern: /密码|Key.*显示|eye.*toggle|showKey|显示.*密钥/gi, label: 'Key 输入框 eye toggle', check: 'Agent 需确认：设计帧中 Key 行是否有显示/隐藏切换按钮' },
  { codePattern: /onClick.*handleFetch|拉取|fetchModels/gi, specPattern: /拉取|fetch.*model|获取.*模型/gi, label: 'API 地址行拉取按钮', check: 'Agent 需确认：设计帧 API 地址行是否仅包含"检查"按钮，无"拉取"按钮' },
  { codePattern: /Copy|copyToClipboard|clipboard|复制|📋/gi, specPattern: /复制|clipboard|右键菜单/gi, label: '复制到剪贴板', check: 'Agent 需确认：此交互元素在设计帧中是否有对应' },
  { codePattern: /onDoubleClick/gi, specPattern: /双击|double\s*click/gi, label: '双击交互', check: 'Agent 需确认：Spec 中是否明确要求双击行为' },
  { codePattern: /tooltip|Tooltip|title=/gi, specPattern: /提示|tooltip|悬停.*提示/gi, label: 'Tooltip 提示', check: 'Agent 需确认：此 tooltip 是否在 Spec 或设计帧中定义' },
];

function check(ctx) {
  const { codeDir, specContent, utils, CONFIG } = ctx;
  const results = [];
  if (!codeDir) return results;

  const path = require('path');
  const fs = require('fs');
  const allFiles = utils.findFiles(codeDir, ['.tsx', '.ts'], CONFIG.ignoreDirs);
  const codeText = allFiles.map(f => ({ p: path.relative(codeDir, f), content: utils.readFile(f) || '' }));

  for (const ep of EXTRA_PATTERNS) {
    let foundIn = '';
    for (const f of codeText) {
      ep.codePattern.lastIndex = 0;
      if (ep.codePattern.test(f.content)) { foundIn = f.p; break; }
    }
    if (foundIn) {
      ep.specPattern.lastIndex = 0;
      const specHas = ep.specPattern.test(specContent || '');
      results.push({
        label: ep.label, codeFile: foundIn, specMentions: specHas,
        instruction: ep.check, status: specHas ? '🟡' : '🔴',
      });
    }
  }

  // 🆕 系统性反向审计：代码交互元素 vs 设计帧 allElements
  const projectRoot = ctx.PROJECT_ROOT || '.';
  const framesPath = path.join(projectRoot, '.claude', '.pen-frames.json');
  try {
    const framesRaw = fs.readFileSync(framesPath, 'utf-8');
    const frames = JSON.parse(framesRaw);

    // 构建设计帧元素全集
    const designElements = new Set();
    for (const frame of frames) {
      if (frame.structure?.allElements) {
        for (const elem of frame.structure.allElements) {
          designElements.add(elem);
          // 也加核心关键词（2字以上的中文）
          const cn = elem.match(/[一-鿿]{2,}/g) || [];
          cn.forEach(c => designElements.add(c));
        }
      }
    }

    // 逐代码文件提取交互元素，与设计帧比对
    for (const f of codeText) {
      // 提取按钮文本 (>text< 之间的内容)
      const btnTexts = f.content.match(/(?:content|children)?[=:]\s*["'`]([^"'`]{2,15})["'`]/g) || [];
      const extraElements = [];
      for (const m of btnTexts) {
        const text = m.replace(/.*["'`]/, '').replace(/["'`].*$/, '');
        if (text.length < 2 || /^[a-zA-Z0-9_\-\.\/]+$/.test(text)) continue;
        if (!designElements.has(text) && !/import|export|const|function|return|class/.test(text)) {
          // 避免重复
          if (!extraElements.includes(text)) extraElements.push(text);
        }
      }

      // 提取 button 标签间的文本
      const btnContent = f.content.match(/>([^<]{2,10})<\/button>/g) || [];
      for (const m of btnContent) {
        const text = m.replace(/^>/, '').replace(/<\/button>$/, '').trim();
        if (text.length < 2) continue;
        if (!designElements.has(text) && !extraElements.includes(text)) {
          extraElements.push(text);
        }
      }

      if (extraElements.length > 0) {
        results.push({
          check: `${path.basename(f.p)}: ${extraElements.length}个代码独有元素`,
          status: '🟡',
          detail: `设计帧未找到: ${extraElements.slice(0, 8).join(', ')}${extraElements.length > 8 ? '等' + extraElements.length + '项' : ''}。请确认是 Spec 要求增加还是设计帧遗漏。`,
        });
      }
    }
  } catch (_) { /* 无 .pen-frames.json 时跳过 */ }

  return results;
}

module.exports = { check };
