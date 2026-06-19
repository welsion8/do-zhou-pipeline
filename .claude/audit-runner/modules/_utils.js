/**
 * 共享工具函数 — 所有检查模块通过 ctx.utils 调用
 */
const fs = require('fs');
const path = require('path');

function readFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf-8'); }
  catch (_) { return null; }
}

function fileExists(filePath) {
  try { return fs.statSync(filePath).isFile(); }
  catch (_) { return false; }
}

function dirExists(dirPath) {
  try { return fs.statSync(dirPath).isDirectory(); }
  catch (_) { return false; }
}

function atomicWrite(filePath, content) {
  const tmp = filePath + '.tmp.' + Date.now();
  fs.writeFileSync(tmp, content, 'utf-8');
  fs.renameSync(tmp, filePath);
}

function findFiles(dir, exts, ignoreDirs) {
  const extensions = exts || ['.tsx', '.ts', '.jsx', '.js', '.css', '.json'];
  const results = [];
  function walk(d, depth) {
    if (!dirExists(d) || depth > 10) return;
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); }
    catch (_) { return; }
    for (const e of entries) {
      if (e.name.startsWith('.') || ignoreDirs.includes(e.name)) continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full, depth + 1);
      else if (extensions.some(ext => e.name.endsWith(ext))) results.push(full);
    }
  }
  walk(dir, 0);
  return results;
}

module.exports = { readFile, fileExists, dirExists, findFiles, atomicWrite, fs, path };
