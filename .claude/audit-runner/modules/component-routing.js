/**
 * 组件路由完整性 — pages/ 下所有页面组件是否已接入 App.tsx 路由
 *
 * 检查:
 *   D3: pages/ 目录下每个 .tsx 文件 → App.tsx 是否有 import + 路由分支
 *   D3: 反向 — App.tsx import 的页面组件 → 文件是否存在
 */

const path = require('path');

function check(ctx) {
  const { codeDir, utils } = ctx;
  const results = [];
  if (!codeDir) return results;

  // 1. 扫描 pages/ 目录
  const pagesDir = path.join(codeDir, 'src', 'renderer', 'pages');
  let pageFiles = [];
  if (utils.dirExists(pagesDir)) {
    pageFiles = require('fs').readdirSync(pagesDir)
      .filter(f => f.endsWith('.tsx'))
      .map(f => f.replace('.tsx', ''));
  }

  if (pageFiles.length === 0) return results;

  // 2. 读 App.tsx
  const appPath = path.join(codeDir, 'src', 'renderer', 'App.tsx');
  const appContent = utils.readFile(appPath);
  if (!appContent) {
    results.push({ check: '组件路由: App.tsx 存在', status: '🔴', detail: 'App.tsx 不可读' });
    return results;
  }

  // 3. 检查每个 page 是否有 import
  const importedPages = [];
  for (const pf of pageFiles) {
    const kebabName = pf.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    const importRx1 = new RegExp(`from\\s+['\"]\\.\\.?/.*${kebabName}['\"]`, 'i');
    const importRx2 = new RegExp(`from\\s+['\"]\\.\\.?/.*${pf}['\"]`, 'i');
    const importRx3 = new RegExp(`import\\s+\\{[^}]*${pf.replace(/-/g, '')}`, 'i');
    const importRx4 = new RegExp(`import\\s+${pf}`, 'i');

    const hasImport = importRx1.test(appContent) || importRx2.test(appContent) ||
                      importRx3.test(appContent) || importRx4.test(appContent);

    if (hasImport) {
      // 检查是否有路由分支
      const routeRx = new RegExp(`currentPage\\s*===\\s*['\"]${kebabName}['\"]|['\"]${pf.replace('Page','').toLowerCase()}['\"]`, 'i');
      const hasRoute = routeRx.test(appContent) ||
                       appContent.includes(pf) && /currentPage|setCurrentPage/.test(appContent);

      if (hasRoute) {
        importedPages.push(pf);
      } else {
        results.push({
          check: `组件路由: ${pf} → 路由?`,
          status: '🟠',
          detail: `${pf} 已被 import 但 App.tsx 中未找到对应路由分支`,
        });
      }
    } else {
      results.push({
        check: `组件路由: ${pf} → App.tsx?`,
        status: '🔴',
        detail: `pages/${pf}.tsx 存在但未被 App.tsx import——页面不可访问`,
      });
    }
  }

  // 4. 汇总
  const missing = results.filter(r => r.status === '🔴').length;
  if (missing === 0 && results.length === 0) {
    results.push({ check: '组件路由: 全部页面已接入', status: '✅', found: true,
      detail: `${importedPages.length}/${pageFiles.length} 个页面已接入路由` });
  } else if (importedPages.length > 0) {
    results.push({ check: `组件路由: ${importedPages.length}/${pageFiles.length} 已接入`,
      status: missing > 0 ? '🔴' : '✅', found: missing === 0,
      detail: `已接入: ${importedPages.join(', ')}` });
  }

  return results;
}

module.exports = { check };
