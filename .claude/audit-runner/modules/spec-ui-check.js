/**
 * Spec→UI 存在性检查 — 从 Spec 提取功能关键词，验证是否在应用中渲染
 *
 * 通用：换产品只需换 Product-Spec.md，关键词自动提取。
 * 降级：Playwright/Electron 不可用时 🟡 跳过。
 */
const path = require('path');
const { execSync } = require('child_process');

// Spec 关键词提取规则：从 Spec 的功能描述中提取 UI 元素名
function extractKeywords(specContent) {
  if (!specContent) return [];
  const keywords = new Set();
  // 提取模式：按钮名、页面名、区块名、菜单项名
  const patterns = [
    /\[([^\]]+)\]\s*按钮/g,           // [✏️ 手动调整] 按钮
    /"([^"]+)"\s*(?:页面|视图|面板)/g, // "Skill 主页面"
    /点击\s*"([^"]+)"/g,               // 点击"章节目录"
    /弹出\s*"([^"]+)"/g,               // 弹出"确认"
    /打开\s*"([^"]+)"/g,               // 打开"设置"
    /显示\s*"([^"]+)"/g,               // 显示"加载中"
  ];
  for (const p of patterns) {
    for (const m of specContent.matchAll(p)) {
      if (m[1] && m[1].length >= 2 && m[1].length <= 20) keywords.add(m[1]);
    }
  }
  // 补充 Spec 中明确的功能区块名
  const sectionPatterns = [
    /####\s+\d+\.\s+(.+)/g,          // #### 1. 技能包管理
    /\*\*(.+?)\*\*/g,                 // **粗体文本**
  ];
  for (const p of sectionPatterns) {
    for (const m of specContent.matchAll(p)) {
      const t = m[1].trim();
      if (t.length >= 3 && t.length <= 30 && !t.includes('|') && !t.startsWith('§')) keywords.add(t);
    }
  }
  return [...keywords].slice(0, 50);
}

function check(ctx) {
  const results = [];
  const specContent = ctx.specContent;
  if (!specContent) { results.push({ check: 'Spec→UI: Spec', status: '🟡', detail: 'Product-Spec.md 不存在' }); return results; }

  const keywords = extractKeywords(specContent);
  if (keywords.length === 0) { results.push({ check: 'Spec→UI: 关键词', status: '🟡', detail: '未提取到关键词' }); return results; }

  // 尝试通过 Playwright 检查应用
  const codeDir = ctx.codeDir || path.join(ctx.PROJECT_ROOT || '.', 'do-zhou');
  const outDir = path.join(codeDir, 'out', 'main', 'index.js');
  const utils = ctx.utils || require('./_utils.js');

  if (!utils.fileExists(outDir)) {
    results.push({ check: 'Spec→UI: 构建产物', status: '🟡', detail: 'Electron 未构建。运行 pnpm build 后重试。' });
    return results;
  }

  try {
    // 构建快速检查脚本
    const checkScript = `
      const { _electron: electron } = require('@playwright/test');
      (async () => {
        const app = await electron.launch({ executablePath: '${path.join(codeDir, 'node_modules', 'electron', 'dist', 'electron.exe').replace(/\\/g, '\\\\')}', args: ['${outDir.replace(/\\/g, '\\\\')}'] });
        const page = await app.firstWindow();
        await page.waitForTimeout(5000);
        // 等 body 有内容
        for (let i = 0; i < 10; i++) {
          const txt = await page.locator('body').innerText().catch(() => '');
          if (txt.length > 100) break;
          await page.waitForTimeout(2000);
        }
        const bodyText = await page.locator('body').innerText().catch(() => '');

        // 点 Home 按钮进入 Skill 主页
        const homeBtn = page.locator('header button[aria-label="主页"]');
        if (await homeBtn.isVisible().catch(() => false)) { await homeBtn.click(); await page.waitForTimeout(2000); }
        const skillPageText = await page.locator('body').innerText().catch(() => '');

        const allText = bodyText + ' ' + skillPageText;
        const keywords = ${JSON.stringify(keywords)};
        const found = keywords.filter(kw => allText.includes(kw));
        const missing = keywords.filter(kw => !allText.includes(kw));
        console.log(JSON.stringify({ found, missing, total: keywords.length }));
        await app.close();
      })().catch(e => console.log(JSON.stringify({ error: e.message })));
    `;

    const output = execSync(`node -e "${checkScript.replace(/"/g, '\\"')}"`, {
      cwd: codeDir, timeout: 60000, stdio: 'pipe'
    }).toString().trim();

    const report = JSON.parse(output);
    if (report.error) {
      results.push({ check: 'Spec→UI: 运行', status: '🟡', detail: report.error.substring(0, 80) });
      return results;
    }

    results.push({
      check: `Spec→UI: ${report.found.length}/${report.total} 关键词存在`,
      status: report.missing.length === 0 ? '✅' : '🟠',
      found: report.missing.length === 0,
      detail: report.missing.length > 0 ? `缺失: ${report.missing.slice(0, 5).join(', ')}` : '全部匹配',
    });

    for (const m of report.missing.slice(0, 8)) {
      results.push({ check: `Spec→UI: 缺"${m}"`, status: '🔴', detail: 'Spec 提及但应用页面中未找到此关键词' });
    }

  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).substring(0, 100);
    results.push({ check: 'Spec→UI: 检查失败', status: '🟡', detail: msg });
  }

  return results;
}

module.exports = { check };
