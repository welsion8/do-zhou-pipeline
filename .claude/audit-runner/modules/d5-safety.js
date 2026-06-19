/**
 * D5 交互安全性 — 并发/竞态策略检测
 *
 * 只检查 Spec 中的 "## 风险与应对策略" 结构化章节。
 * 不再全文正则匹配——避免将 UI 布局描述误判为风险。
 */
function check(ctx) {
  const { specContent } = ctx;
  const results = [];
  if (!specContent) return results;

  // 提取 "风险与应对策略" 章节
  const lines = specContent.split('\n');
  let riskStart = -1, riskEnd = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s*风险与应对策略/.test(lines[i])) riskStart = i;
    if (riskStart !== -1 && riskEnd === -1 && /^##\s(?!.*风险)/.test(lines[i]) && i > riskStart) riskEnd = i;
  }
  if (riskEnd === -1) riskEnd = lines.length;

  if (riskStart === -1) {
    results.push({
      check: 'D5 风险策略章节',
      status: '🟡',
      detail: 'Spec 中未找到 "## 风险与应对策略" 章节。建议在 Spec 中显式定义风险与应对策略表，供 D5 审计检查。',
    });
    return results;
  }

  const riskSection = lines.slice(riskStart, riskEnd).join('\n');

  // 检查该章节是否包含策略表
  const hasTable = /\|.*风险.*\|.*触发.*\|.*应对.*\|/i.test(riskSection);
  if (!hasTable) {
    results.push({
      check: 'D5 风险策略表',
      status: '🟡',
      detail: '"风险与应对策略" 章节存在但未包含策略表。请用 |风险|触发条件|应对策略|状态| 格式。',
    });
    return results;
  }

  // 提取表中的风险项
  const tableRows = riskSection.match(/^\|.+\|.+\|.+\|.+\|$/gm) || [];
  const riskRows = tableRows.filter(r => !/风险|------/.test(r));

  if (riskRows.length === 0) {
    results.push({
      check: 'D5 风险项',
      status: '🟡',
      detail: '策略表存在但无风险项。请逐项填写。',
    });
    return results;
  }

  results.push({
    check: `D5 风险策略: ${riskRows.length} 项`,
    status: '✅',
    found: true,
    detail: `${riskRows.length} 个风险项已定义`,
  });

  // 检查是否有状态为 ⏳ 的未完成项
  const pending = riskRows.filter(r => /⏳/.test(r) || /未实施/.test(r));
  if (pending.length > 0) {
    results.push({
      check: `D5 未实施策略: ${pending.length} 项`,
      status: '🟡',
      detail: `${pending.length} 个风险项标记为 ⏳，需在 Phase 开发中实施。`,
    });
  }

  return results;
}

module.exports = { check };
