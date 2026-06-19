/**
 * safeStorage 安全审计 — API Key 加密存储检查（仅 desktop 平台）
 */
function check(ctx) {
  const { codeDir, utils } = ctx;
  const results = [];
  if (!codeDir) return results;

  const allFiles = utils.findFiles(codeDir, ['.ts', '.tsx'], ctx.CONFIG.ignoreDirs);
  const sensitivePatterns = [
    { pattern: /writeFileSync.*(apiKey|api_key|secret)|JSON\.stringify.*(key|secret)/gi, label: 'API Key 可能以明文写入文件' },
    { pattern: /console\.(log|error|warn).*(apiKey|api_key|secret)/gi, label: 'API Key 可能被打印到控制台' },
    { pattern: /safeStorage\.encryptString|encryptKey/gi, label: '已使用 safeStorage 加密' },
  ];

  for (const f of allFiles) {
    const rel = require('path').relative(codeDir, f);
    const content = utils.readFile(f) || '';
    for (const sp of sensitivePatterns) {
      sp.pattern.lastIndex = 0;
      if (sp.pattern.test(content)) {
        results.push({ file: rel, label: sp.label, status: sp.label.includes('safeStorage') ? '✅' : '🔴' });
      }
    }
  }

  const hasEncryption = results.some(r => r.status === '✅');
  const hasVulnerability = results.some(r => r.status === '🔴');
  if (!hasEncryption && hasVulnerability) {
    results.push({ file: '—', label: '未检测到 safeStorage.encryptString 调用', status: '🔴' });
  }
  return results;
}

module.exports = { check };
