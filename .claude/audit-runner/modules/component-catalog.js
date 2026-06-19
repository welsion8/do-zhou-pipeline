#!/usr/bin/env node
/**
 * component-catalog.js — 组件目录生成器
 *
 * 扫描 React 组件源码 → 提取接口/props/data-testid/设计帧引用 → 生成静态 HTML 目录。
 * 轻量化替代 Storybook。开发者不用翻代码看组件。
 *
 * 用法:
 *   node component-catalog.js                        # 扫描默认目录
 *   node component-catalog.js --dir src/renderer     # 指定目录
 *   node component-catalog.js --watch                 # 监听变更自动刷新
 *
 * 通用性: 扫描 .tsx 文件 → 提取接口+testid+设计引用。不绑定任何产品。
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();

function findComponents(srcDir) {
  const components = [];
  if (!fs.existsSync(srcDir)) return components;

  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
        walk(full);
      } else if (e.name.endsWith('.tsx') && !e.name.includes('.test.') && !e.name.includes('.spec.')) {
        try {
          const content = fs.readFileSync(full, 'utf-8');
          const comp = extractComponent(full, content);
          if (comp) components.push(comp);
        } catch (_) {}
      }
    }
  }

  walk(srcDir);
  return components;
}

function extractComponent(filePath, content) {
  // 提取组件名
  const nameMatch = content.match(/export\s+(?:default\s+)?function\s+(\w+)/);
  if (!nameMatch) return null;
  const name = nameMatch[1];

  // 提取 Props 接口
  const propsMatch = content.match(/interface\s+(\w*Props\w*)\s*\{([^}]+)\}/s);
  const props = propsMatch ? propsMatch[2].split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('//') && !l.startsWith('/*'))
    .map(l => l.replace(/[?;]/g, '').trim())
    .slice(0, 10) : [];

  // 提取 data-testid
  const testIds = [...content.matchAll(/data-testid="([^"]+)"/g)].map(m => m[1]);

  // 提取设计帧引用
  const designRefs = [...content.matchAll(/设计帧\s+(\w+):/g)].map(m => m[1]);

  // 提取 aria 属性
  const ariaAttrs = [...content.matchAll(/aria-(\w+)="([^"]*)"/g)].map(m => `${m[1]}="${m[2]}"`);

  const relPath = path.relative(path.join(PROJECT_ROOT, 'do-zhou', 'src'), filePath);

  return {
    name,
    path: relPath,
    props,
    testIds,
    designRefs,
    ariaAttrs,
    lines: content.split('\n').length,
  };
}

function generateHTML(components) {
  const byDir = {};
  for (const c of components) {
    const dir = path.dirname(c.path);
    if (!byDir[dir]) byDir[dir] = [];
    byDir[dir].push(c);
  }

  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>组件目录 · Do舟</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Inter,sans-serif;background:#0F0F11;color:#F0EEE8;padding:24px}
h1{font-size:20px;margin-bottom:8px}
h2{font-size:14px;color:#8B8A8E;margin:24px 0 12px;border-bottom:1px solid #FFFFFF14;padding-bottom:8px}
.comp{background:#161618;border:1px solid #FFFFFF14;border-radius:8px;padding:16px;margin-bottom:12px}
.comp h3{font-size:15px;margin-bottom:4px}
.comp .path{font-size:11px;color:#5C5B60;margin-bottom:8px}
.comp .meta{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.tag{font-size:10px;padding:2px 6px;border-radius:3px;background:#252528;color:#8B8A8E}
.tag.a11y{background:#1A2A1A;color:#A5D6A7}
.tag.design{background:#2A2520;color:#F0A060}
.comp .props{font-size:11px;color:#5C5B60;margin-top:8px}
.comp .props span{color:#8B8A8E}
.stats{font-size:12px;color:#8B8A8E;margin-bottom:16px}
</style></head>
<body>
<h1>📦 组件目录</h1>
<div class="stats">${components.length} 个组件 · ${Object.keys(byDir).length} 个目录 · ${components.reduce((s,c)=>s+c.lines,0)} 行代码</div>
`;

  for (const [dir, comps] of Object.entries(byDir).sort()) {
    html += `<h2>📁 ${dir}</h2>`;
    for (const c of comps) {
      html += `<div class="comp">
  <h3>${c.name}</h3>
  <div class="path">${c.path} · ${c.lines} 行</div>
  <div class="meta">`;
      if (c.testIds.length > 0) c.testIds.forEach(id => html += `<span class="tag">🧪 ${id}</span>`);
      if (c.ariaAttrs.length > 0) c.ariaAttrs.forEach(a => html += `<span class="tag a11y">♿ ${a}</span>`);
      if (c.designRefs.length > 0) c.designRefs.forEach(d => html += `<span class="tag design">🎨 帧:${d}</span>`);
      if (c.testIds.length === 0) html += `<span class="tag" style="color:#E57373">⚠ 缺 testid</span>`;
      html += `</div>`;
      if (c.props.length > 0) {
        html += `<div class="props">Props: <span>${c.props.slice(0, 6).join('; ')}</span></div>`;
      }
      html += `</div>`;
    }
  }

  html += `</body></html>`;
  return html;
}

function main() {
  const args = process.argv.slice(2);
  const dirIdx = args.indexOf('--dir');
  const srcDir = dirIdx >= 0 ? path.resolve(args[dirIdx + 1]) : path.join(PROJECT_ROOT, 'do-zhou', 'src', 'renderer', 'components');

  const components = findComponents(srcDir);
  console.log(`📦 扫描到 ${components.length} 个组件`);

  const withoutTestId = components.filter(c => c.testIds.length === 0);
  const withA11y = components.filter(c => c.ariaAttrs.length > 0);

  console.log(`   🧪 有 data-testid: ${components.length - withoutTestId.length}/${components.length}`);
  console.log(`   ♿ 有 aria 属性: ${withA11y.length}/${components.length}`);
  if (withoutTestId.length > 0) {
    console.log(`   ⚠ 缺 testid: ${withoutTestId.map(c => c.name).join(', ')}`);
  }

  const html = generateHTML(components);
  const outPath = path.join(PROJECT_ROOT, '.claude', 'component-catalog.html');
  fs.writeFileSync(outPath, html);
  console.log(`✅ 组件目录: ${outPath}`);
}

module.exports = { findComponents, extractComponent, generateHTML };

if (require.main === module) {
  main();
}
