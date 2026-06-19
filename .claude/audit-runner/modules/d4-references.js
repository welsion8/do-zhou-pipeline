/**
 * D4 引用有效性 — DEV-PLAN 文件路径 → 磁盘存在性
 */
function filterPlanPathsByPhase(planFilePaths, currentPhase, fullMode) {
  if (!currentPhase || fullMode) return { filteredPaths: planFilePaths, skippedCount: 0 };
  const filteredPaths = [], skipped = [];
  for (const fp of planFilePaths) {
    if (fp.phase === null || fp.phase <= currentPhase) filteredPaths.push(fp);
    else skipped.push(fp);
  }
  return { filteredPaths, skippedCount: skipped.length };
}

function check(ctx) {
  const { plan, codeScan, codeDir } = ctx;
  const results = [];
  if (!plan || !codeDir) return results;

  const planFilePaths = plan.filePaths;
  for (const { path: filePath, line, phase } of planFilePaths) {
    const normalized = filePath.replace(/\\/g, '/');
    const exists = Object.keys(codeScan.fileMap).some(f => f === normalized || f.endsWith(normalized));
    results.push({ file: normalized, planLine: line, phase, exists, status: exists ? '✅' : '❌' });
  }
  return results;
}

module.exports = { check, filterPlanPathsByPhase };
