/**
 * 组件树完整性 — 相对路径 import 是否可解析
 */
function check(ctx) {
  const { codeDir, utils } = ctx;
  const results = [];
  if (!codeDir) return results;

  const path = require('path');
  const allFiles = utils.findFiles(codeDir, ['.tsx', '.ts'], ctx.CONFIG.ignoreDirs);

  for (const f of allFiles) {
    const dir = path.dirname(f);
    const rel = path.relative(codeDir, f);
    const content = utils.readFile(f) || '';

    const imports = content.matchAll(/import\s+\{?\s*(\w+)\s*\}?\s*from\s+['"]\.\/([^'"]+)['"]/g);
    for (const m of imports) {
      const importPath = m[2];
      const resolved = path.resolve(dir, importPath);
      const candidates = [
        resolved + '.tsx', resolved + '.ts', resolved + '.jsx', resolved + '.js',
        path.join(resolved, 'index.tsx'), path.join(resolved, 'index.ts'),
      ];
      let found = false;
      for (const c of candidates) { if (utils.fileExists(c)) { found = true; break; } }
      if (!found && importPath.startsWith('.')) {
        results.push({ file: rel, import: `{ ${m[1]} } from './${importPath}'`, status: '🔴' });
      }
    }
  }
  return results.slice(0, 20);
}

module.exports = { check };
