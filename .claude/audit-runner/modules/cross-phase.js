/**
 * 跨 Phase 接口消费 — 导出了但未被导入的函数/类型
 */
function check(ctx) {
  const { codeDir, utils } = ctx;
  const results = [];
  if (!codeDir) return results;

  const path = require('path');
  const allFiles = utils.findFiles(codeDir, ['.ts', '.tsx'], ctx.CONFIG.ignoreDirs);
  const exportsMap = new Map();
  const importsMap = new Map();

  for (const f of allFiles) {
    const rel = path.relative(codeDir, f);
    const content = utils.readFile(f) || '';

    for (const m of content.matchAll(/export\s+(const|class|function|interface|type)\s+(\w+)/g)) {
      const name = m[2];
      if (!exportsMap.has(name)) exportsMap.set(name, { file: rel, type: m[1] });
    }
    for (const m of content.matchAll(/import\s+\{([^}]+)\}\s+from\s+['"](.+)['"]/g)) {
      const names = m[1].split(',').map(n => n.trim().split(' as ')[0]).filter(Boolean);
      for (const n of names) {
        if (!importsMap.has(n)) importsMap.set(n, []);
        importsMap.get(n).push(rel);
      }
    }
  }

  for (const [name, exp] of exportsMap) {
    const importers = importsMap.get(name) || [];
    const externalImporters = importers.filter(f => f !== exp.file);
    if (externalImporters.length === 0 && !name.startsWith('_') && !name.endsWith('Props') && !name.endsWith('Return')) {
      results.push({ name, file: exp.file, type: exp.type, status: '🟡' });
    }
  }
  return results.slice(0, 20);
}

module.exports = { check };
