/**
 * D2 内部一致性 — Spec ↔ Plan 数值冲突检测 + L1 需求自洽程序化
 *
 * L1 自洽检查（程序化，补 Agent 手工确认的盲区）：
 *   A. 章节编号连续性 — 检测 §1→§3 跳号
 *   B. 术语统一 — 同一概念在 Spec 不同位置的用词差异
 *   C. 总述与例外一致性 — 总述是否标注例外引用
 *   D. 矩阵入度 — 状态转移矩阵行数 vs 专项交互描述数
 */
function check(ctx) {
  const { specContent, planContent } = ctx;
  const results = [];
  if (!specContent) return results;

  // ── L1 自洽 A: 章节编号连续性 ──
  const sectionNums = [];
  const sectionRe = /^####\s+(\d+)\.\s/gm;
  let sm;
  while ((sm = sectionRe.exec(specContent)) !== null) {
    sectionNums.push(parseInt(sm[1]));
  }
  if (sectionNums.length >= 2) {
    for (let i = 1; i < sectionNums.length; i++) {
      if (sectionNums[i] !== sectionNums[i - 1] + 1) {
        results.push({
          check: 'L1 自洽: 章节编号',
          status: '🟠',
          detail: `§${sectionNums[i-1]} → §${sectionNums[i]} 编号不连续（期望 §${sectionNums[i-1]+1}）`,
        });
      }
    }
    if (!results.some(r => r.check === 'L1 自洽: 章节编号')) {
      results.push({ check: 'L1 自洽: 章节编号', status: '✅', found: true, detail: `${sectionNums.length} 个编号章节连续` });
    }
  }

  // ── L1 自洽 B: 术语统一（读术语表，区分"混用"和"合理区分"）──
  // 提取 Spec 中的术语表（如果有）
  const glossarySection = specContent.match(/##\s*术语表[\s\S]*?(?=## )/)?.[0] || '';
  const glossaryPairs = [];
  if (glossarySection) {
    const rows = glossarySection.match(/^\|.+\|.+\|.+\|$/gm) || [];
    for (const row of rows) {
      const cols = row.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 3 && !/术语|------/.test(row)) {
        // cols[0]=术语, cols[1]=定义, cols[2]=区别于(可选)
        const term = cols[0].replace(/[*`]/g, '');
        const diffFrom = cols[2] ? cols[2].replace(/[*`]/g, '') : '';
        if (diffFrom) glossaryPairs.push({ term, diffFrom });
      }
    }
  }

  const termPairs = [
    ['阶段卡片', '阶段流程卡片'],
    ['Skill', '技能包'],
    ['编辑区', '编辑器'],
    ['标签页', '标签'],
    ['面板', '区域'],
  ];
  let termIssues = 0;
  for (const [a, b] of termPairs) {
    const countA = (specContent.match(new RegExp(a, 'g')) || []).length;
    const countB = (specContent.match(new RegExp(b, 'g')) || []).length;
    if (countA > 0 && countB > 0) {
      // 检查术语表是否已定义这对术语为"合理区分"
      const isDistinct = glossaryPairs.some(p =>
        (p.term.includes(a) && p.diffFrom.includes(b)) ||
        (p.term.includes(b) && p.diffFrom.includes(a))
      );
      if (isDistinct) {
        results.push({
          check: `L1 自洽: 术语 "${a}" vs "${b}"`,
          status: '✅',
          found: true,
          detail: `"${a}"${countA}次, "${b}"${countB}次 — 术语表已定义区分，非混用`,
        });
      } else {
        results.push({
          check: `L1 自洽: 术语 "${a}" vs "${b}"`,
          status: '🟡',
          detail: `"${a}" 出现 ${countA} 次, "${b}" 出现 ${countB} 次 — 建议统一`,
        });
        termIssues++;
      }
    }
  }
  if (termIssues === 0) {
    results.push({ check: 'L1 自洽: 术语统一', status: '✅', found: true, detail: '未检测到术语混用（术语表已定义的区分除外）' });
  }

  // ── L1 自洽 C: 总述是否标注例外引用 ──
  const absoluteStatements = specContent.match(/所有\s*\S+\s*都/g) || [];
  const exceptionRefs = specContent.match(/除外|例外|不适用|详见\s*§\d/g) || [];
  if (absoluteStatements.length > 0 && exceptionRefs.length === 0) {
    results.push({
      check: 'L1 自洽: 总述例外标注',
      status: '🟡',
      detail: `检测到 ${absoluteStatements.length} 处"所有...都"的总述表述，但未找到例外引用标注`,
    });
  } else if (absoluteStatements.length > 0) {
    results.push({
      check: 'L1 自洽: 总述例外标注',
      status: '✅',
      found: true,
      detail: `${absoluteStatements.length} 处总述, ${exceptionRefs.length} 处例外引用`,
    });
  }

  // ── L1 自洽 D: 状态转移矩阵入度 vs 专项交互描述数 ──
  const matrixRows = (specContent.match(/点击阶段卡片/g) || []).length;
  const specialCases = (specContent.match(/阶段③|章节目录|专用|不适用.*矩阵/g) || []).length;
  if (matrixRows > 0) {
    results.push({
      check: 'L1 自洽: 状态矩阵覆盖',
      status: specialCases > 0 ? '✅' : '🟡',
      found: specialCases > 0,
      detail: specialCases > 0
        ? `矩阵含 ${matrixRows} 条交互描述, ${specialCases} 处专项例外标注`
        : `矩阵含 ${matrixRows} 条交互描述, 但未检测到专项例外标注 — 检查阶段③是否被覆盖`,
    });
  }

  // ── 原有 D2: Spec ↔ Plan 数值冲突 ──
  if (!planContent) return results;

  const DESIGN_DOMAINS = /宽度|width|高度|height|左边|left|右边|right|面板|panel|字体|font|字号|圆角|radius|间距|gap|padding|margin|边框|border|px|拖拽|drag/gi;

  function extractNums(text, source) {
    const items = [];
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!DESIGN_DOMAINS.test(line)) continue;
      if (/版本|version|^\|/.test(line)) continue;
      const m = line.match(/(\w+)\s*[=:：]\s*(\d+)\s*(px|ms|rem)?/);
      if (m && m[1] && m[2]) {
        items.push({
          key: m[1].toLowerCase(), value: m[2], unit: m[3] || '',
          line: i + 1, text: line.trim().substring(0, 80), source,
        });
      }
    }
    return items;
  }

  const specNums = extractNums(specContent, 'Spec');
  const planNums = extractNums(planContent, 'Plan');

  for (const sn of specNums) {
    for (const pn of planNums) {
      const sk = sn.key.toLowerCase(), pk = pn.key.toLowerCase();
      const isMatch = sk === pk || sk.includes(pk) || pk.includes(sk) ||
        (sk.includes('width') && pk.includes('width')) ||
        (sk.includes('height') && pk.includes('height')) ||
        (sk.includes('padding') && pk.includes('padding')) ||
        (sk.includes('gap') && pk.includes('gap'));
      if (isMatch && sn.value !== pn.value) {
        results.push({
          type: 'numeric_conflict',
          label: `${sn.key}=${sn.value}${sn.unit} ≠ ${pn.key}=${pn.value}${pn.unit}`,
          specLine: sn.line, planLine: pn.line,
          specText: sn.text, planText: pn.text,
          status: '🟡',
        });
      }
    }
  }

  const seen = new Set();
  return results.filter(r => { const k = r.label || r.check; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 25);
}

module.exports = { check };
