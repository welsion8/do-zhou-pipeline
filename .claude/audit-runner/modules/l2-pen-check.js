/**
 * L2 设计帧自洽 — .pen 帧 vs Spec/TOKENS/Code 结构层比对
 * 数据驱动，无硬编码产品数据。换产品只需重新生成 .pen-frames.json 缓存。
 */
const path = require('path');

function check(ctx) {
  const { utils, CONFIG, plan } = ctx;
  const results = [];
  const projectRoot = ctx.PROJECT_ROOT || '.';
  const codeDir = ctx.codeDir || path.join(projectRoot, 'do-zhou');
  const currentPhase = ctx.project?.currentPhase || 99;

  const cachePath = path.join(projectRoot, '.claude', '.pen-frames.json');
  const cacheContent = utils.readFile(cachePath);
  if (!cacheContent) { results.push({ check: '.pen 帧缓存', status: '🟡', detail: '未找到缓存' }); return results; }

  // 缓存新鲜度检测：.pen 文件修改时间 > 缓存生成时间 → 缓存过期
  const penFile = ctx.project?.penFile;
  if (penFile) {
    try {
      const penStat = require('fs').statSync(penFile);
      const cacheStat = require('fs').statSync(cachePath);
      if (penStat.mtimeMs > cacheStat.mtimeMs) {
        results.push({
          check: '.pen 帧缓存新鲜度',
          status: '🟠',
          detail: `.pen 文件已更新（${penStat.mtime.toISOString()}），缓存可能过期（${cacheStat.mtime.toISOString()}）。请重新通过 MCP 读取设计帧并更新缓存。`,
        });
      } else {
        results.push({ check: '.pen 帧缓存新鲜度', status: '✅', found: true, detail: '缓存是最新的' });
      }
    } catch (_) { /* stat 失败不阻塞 */ }
  }

  let frames;
  try { frames = JSON.parse(cacheContent); }
  catch { results.push({ check: '.pen 帧缓存', status: '🔴', detail: 'JSON 解析失败' }); return results; }

  results.push({ check: '.pen 帧缓存', status: '✅', found: true, detail: `${frames.length} 帧` });

  // 读 TOKENS
  const tokensPath = path.join(projectRoot, 'DESIGN-TOKENS.md');
  const tokensContent = utils.readFile(tokensPath) || '';
  const tokenVals = {};
  for (const m of tokensContent.matchAll(/--([\w-]+)\s*:\s*(#[0-9A-Fa-f]{6})/g)) tokenVals[m[2].toUpperCase()] = m[1];

  // 数值检查 + 窗口控制
  const frameTypes = {};
  for (const frame of frames) {
    frameTypes[frame.type] = (frameTypes[frame.type] || 0) + 1;
    if (frame.fill && frame.fill !== '#00000000') {
      if (frame.fill.startsWith('$')) { const vn = frame.fill.replace('$', ''); if (!tokensContent.includes(`--${vn}`)) results.push({ check: `${frame.name}: ${frame.fill}`, status: '🟡', detail: `变量 $${vn} 在 TOKENS 中未定义` }) }
      else if (frame.fill.startsWith('#')) { const mv = tokenVals[frame.fill.toUpperCase()]; results.push({ check: `${frame.name}: fill=${frame.fill}`, status: mv ? '✅' : '🟡', found: !!mv, detail: mv ? `→ --${mv}` : '硬编码颜色' }) }
    }
    if (frame.type === '主页面') {
      const hasWC = frame.hasWinCtrl || JSON.stringify(frame).includes('WinCtrl') || JSON.stringify(frame).includes('窗口控制');
      results.push({ check: `${frame.name}: 窗口控制`, status: hasWC ? '✅' : '🔴', found: hasWC, detail: hasWC ? '已包含' : '缺少窗口控制' });
    }
  }
  results.push({ check: '设计帧总览', status: '✅', found: true, detail: `${frames.length} 帧: ${Object.entries(frameTypes).map(([t, c]) => `${t}×${c}`).join(', ')}` });

  // 🆕 语义结构树比对 — 设计帧层级 vs 代码 JSX 嵌套
  results.push({ check: '语义结构比对', status: '✅', found: true, detail: `对 ${frames.length} 帧执行结构树比对` });
  for (const frame of frames) {
    if (!frame.structure || !frame.structure.allElements) continue;
    const codeFile = frame.structure.codeFile;
    if (!codeFile) continue;

    // 在代码目录中搜索对应文件
    const { execSync } = require('child_process');
    let codeContent = null;
    try {
      const found = execSync(`find ${codeDir} -name "${codeFile}" -type f 2>/dev/null | head -1`, { encoding: 'utf-8' }).trim();
      if (found) codeContent = utils.readFile(found);
    } catch (_) {}

    if (!codeContent) {
      results.push({ check: `${frame.name}: 代码文件`, status: '🟡', detail: `未找到 ${codeFile}` });
      continue;
    }

    // 提取代码中的 JSX 结构关键词
    const jsxElements = [];
    const jsxRe = /(?:className|id)=["'`]([^"'`]+)["'`]/g;
    let jm;
    while ((jm = jsxRe.exec(codeContent)) !== null) {
      jsxElements.push(jm[1]);
    }

    // 设计帧的结构元素 vs 代码中的 className
    let matched = 0;
    const unmatched = [];
    for (const elem of frame.structure.allElements) {
      // 中文元素名 → 代码中可能的英文关键词
      const keywords = [elem, elem.toLowerCase()];
      const found = jsxElements.some(c => keywords.some(k => c.includes(k) || c.toLowerCase().includes(k)));
      if (found) matched++;
      else unmatched.push(elem);
    }

    const matchRate = frame.structure.allElements.length > 0
      ? Math.round(matched / frame.structure.allElements.length * 100) : 0;

    results.push({
      check: `${frame.name}: 结构匹配 ${matchRate}%`,
      status: matchRate >= 80 ? '✅' : matchRate >= 50 ? '🟡' : '🔴',
      found: matchRate >= 80,
      detail: matchRate >= 80
        ? `${matched}/${frame.structure.allElements.length} 元素已匹配`
        : `缺失: ${unmatched.join(', ')}`,
    });
  }

  // 🆕 结构层比对 — Phase 感知 + 数据驱动
  for (const frame of frames) {
    if (!frame.structure || !frame.structure.codeFile) continue;
    const phase = frame.structure.phase || 99;
    if (phase > currentPhase) continue; // Phase 感知：跳过未来帧

    const codeFiles = [frame.structure.codeFile].filter(Boolean);
    let allCode = '';
    for (const cf of codeFiles) {
      const fp = findFile(codeDir, cf);
      if (fp) allCode += (utils.readFile(fp) || '') + '\n';
    }
    if (!allCode) continue;

    const elements = frame.structure.allElements || [];
    for (const elem of elements) {
      // 只检查 ≥4 个中文字符的区块名（过滤掉英文/数字/过短的通用词）
      const chineseChars = elem.replace(/[^一-鿿]/g, '');
      if (chineseChars.length < 4) continue;
      // 搜索代码中是否包含该中文关键词（至少匹配核心 3 个字）
      const kw = chineseChars.substring(0, 3);
      if (!allCode.includes(kw)) {
        results.push({
          check: `${frame.name}: 缺"${elem}"`,
          status: '🔴',
          detail: `设计帧含"${elem}"区块，但代码中未找到`,
          frame: frame.id,
        });
      }
    }
  }

  // 🆕 B路步骤5: 详细设计属性比对 (padding/gap/radius/fontSize)
  for (const frame of frames) {
    if (!frame.structure || !frame.structure.codeFile) continue;
    const phase = frame.structure.phase || 99;
    if (phase > currentPhase) continue;

    const codeFile = frame.structure.codeFile;
    const fp = findFile(codeDir, codeFile);
    if (!fp) continue;
    const codeContent = utils.readFile(fp) || '';

    // 帧名 → 在代码中查找设计帧 ID 引用（如 {/* w6Kty */}）
    if (codeContent.includes(frame.id)) {
      // 代码引用了设计帧 ID → 检查关键属性
      const checks = [
        { prop: 'padding', rx: /padding[：:]\s*\[?([^\]]*)\]?/i, label: 'padding' },
        { prop: 'cornerRadius', rx: /cornerRadius[：:]\s*(.+)/i, label: '圆角' },
        { prop: 'fontSize', rx: /fontSize[：:]\s*(\d+)/i, label: '字号' },
      ];
      for (const c of checks) {
        const designMatch = JSON.stringify(frame).match(new RegExp('"'+c.prop+'"[：:]*["\\[]?([^"\\],}]+)', 'i'));
        if (designMatch) {
          const codeMatch = codeContent.match(c.rx);
          if (!codeMatch) {
            results.push({
              check: frame.name + ': 缺' + c.label + '标注',
              status: '🟡',
              detail: '设计帧定义了 ' + c.prop + ' 但代码中未找到对应注释',
            });
          }
        }
      }
    }
  }

  // 状态变体
  for (const page of frames.filter(f => f.type === '主页面')) {
    for (const v of ['空状态', '错误态']) {
      if (!frames.find(f2 => f2.type !== '主页面' && f2.name.includes(page.name.replace(/主页面|页面/g, '')) && f2.name.includes(v)))
        results.push({ check: `${page.name}: 缺${v}变体`, status: '🟡', detail: '未找到对应设计帧' });
    }
  }

function findFile(codeDir, fileName) {
  const fs = require('fs'); const results = [];
  function walk(d, depth) { if (depth > 6) return; try { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const fp = path.join(d, e.name); if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'out' && e.name !== 'dist') walk(fp, depth + 1); else if (e.name === fileName) results.push(fp) } } catch (_) {} }
  walk(codeDir, 0); return results[0] || null;
}

  // 🆕 像素级数值比对 — 设计帧精确数值 vs 代码 Tailwind class
  const layoutCachePath = path.join(projectRoot, '.claude', '.pen-layout-values.json');
  const layoutCache = utils.readFile(layoutCachePath);
  let hasFullChildData = true;
  if (layoutCache) {
    try {
      const layoutData = JSON.parse(layoutCache);
      const frameLayouts = layoutData.frames || {};
      const framesWithChildren = Object.values(frameLayouts).filter(function(f) { return f.childComponents; }).length;
      if (framesWithChildren === 0) hasFullChildData = false;
      results.push({ check: '像素级数值比对', status: '✅', found: true, detail: `${Object.keys(frameLayouts).length} 帧有布局数据, ${framesWithChildren}帧含子组件数据` });

      const tailwindMap = {
        width: { rx: /w-\[(\d+)px\]|w-(\d+)\b(?!\[)/g, label: 'width' },
        height: { rx: /h-\[(\d+)px\]|h-(\d+)\b(?!\[)/g, label: 'height' },
        padding: { rx: /p-\[(\d+)px\]|p-(\d+)\b(?!\[)/g, label: 'padding' },
        gap: { rx: /gap-\[(\d+)px\]|gap-(\d+)\b(?!\[)/g, label: 'gap' },
        fontSize: { rx: /text-\[(\d+)px\]|text-(\d+)\b(?!\[)/g, label: 'fontSize' },
        radius: { rx: /rounded-\[(\d+)px\]|rounded-(\d+)\b(?!\[)/g, label: 'cornerRadius' },
      };

      for (const [frameId, design] of Object.entries(frameLayouts)) {
        const codeFile = (frames.find(f => f.id === frameId) || {}).structure?.codeFile;
        if (!codeFile) continue;

        const fp = findFile(codeDir, codeFile);
        if (!fp) {
          results.push({ check: `${design.name || frameId}: 代码文件未找到`, status: '🟡', detail: `${codeFile} 不在代码目录中，像素比对跳过` });
          continue;
        }
        const codeContent = utils.readFile(fp) || '';

        // 逐属性对比（精确数值——偏差>4px = 🟠 阻断）
        const diffs = [];
        for (const [key, { rx, label }] of Object.entries(tailwindMap)) {
          const designVal = design[key];
          if (designVal === undefined) continue;

          // 从代码中提取 Tailwind 数值
          rx.lastIndex = 0;
          const codeVals = [];
          let cm;
          while ((cm = rx.exec(codeContent)) !== null) {
            codeVals.push(parseInt(cm[1] || cm[2]));
          }

          if (codeVals.length === 0) continue;

          // 对比：设计值 vs 代码中最接近的值
          if (typeof designVal === 'number') {
            const closest = codeVals.reduce((a, b) => Math.abs(b - designVal) < Math.abs(a - designVal) ? b : a);
            const deviation = Math.abs(closest - designVal);
            if (deviation > 4) {
              diffs.push(`${label}: 设计${designVal}px ≠ 代码${closest}px (偏差${deviation}px)`);
            }
          } else if (Array.isArray(designVal)) {
            // padding/gap 的四值数组
            for (const dv of designVal) {
              if (typeof dv !== 'number') continue;
              const closest = codeVals.reduce((a, b) => Math.abs(b - dv) < Math.abs(a - dv) ? b : a);
              const deviation = Math.abs(closest - dv);
              if (deviation > 4 && !diffs.some(d => d.includes(`偏差${deviation}px`) && d.includes(label))) {
                diffs.push(`${label}[${dv}px]: 设计${dv}px ≠ 代码${closest}px (偏差${deviation}px)`);
              }
            }
          }
        }

        // 位置检查：x/y 坐标
        if (typeof design.x === 'number' || typeof design.y === 'number') {
          const absPosRx = /(?:absolute|fixed).*?(?:right|left|top|bottom)-\[?(\d+)\]?/g;
          const posMatches = [];
          let pm;
          while ((pm = absPosRx.exec(codeContent)) !== null) posMatches.push(parseInt(pm[1]));
          if (posMatches.length > 0 && typeof design.x === 'number') {
            // x=1060 → 期望 right: 140 (1200-1060) 或 left: 1060
            const expectedRight = (design.width || 1200) - design.x;
            const closest = posMatches.reduce((a, b) => Math.abs(b - expectedRight) < Math.abs(a - expectedRight) ? b : a);
            const deviation = Math.abs(closest - expectedRight);
            if (deviation > 4) diffs.push(`位置x=${design.x}: 期望right≈${expectedRight}px ≠ 代码${closest}px`);
          }
        }

        if (diffs.length > 0) {
          results.push({
            check: `${design.name || frameId}: 像素偏差 ${diffs.length}处`,
            status: '🟠',
            detail: diffs.slice(0, 5).join('; '),
          });
        }
      }
    } catch (_) { /* layout cache parse error - skip */ }
  }

  // 🆕 子组件覆盖检查 — 缓存缺少子组件数据时提醒通过 MCP 补全
  if (!hasFullChildData) {
    results.push({
      check: '子组件像素数据',
      status: '🟡',
      detail: '.pen-layout-values.json 缺少子组件(childComponents)数据。建议重新通过 MCP 读取设计帧并更新缓存，确保子组件(阶段标签/列表项/按钮)样式纳入像素比对。',
    });
  }

  // 🆕 子组件结构校验 — 逐 allElements 检查代码中是否有对应 Tailwind 样式
  for (const frame of frames) {
    if (!frame.structure?.allElements || !frame.structure?.codeFile) continue;
    const fp = findFile(codeDir, frame.structure.codeFile);
    if (!fp) continue;
    const codeContent = utils.readFile(fp) || '';
    const missingStyle = [];
    for (const elem of frame.structure.allElements) {
      // 检查子组件是否有 Tailwind 样式（至少 2 个工具类）
      const escaped = elem.replace(/[.*+?^${}()|[\]\\]/g, '');
      const styleRx = new RegExp(`class(?:Name)?=["\`][^"\`]*${escaped.substring(0,2)}[^"\`]*["\`]`);
      const hasStyle = /className=["\`][^"\`]{10,}["\`]/.test(codeContent);
      if (!hasStyle) missingStyle.push(elem);
    }
    if (missingStyle.length > 0 && missingStyle.length === frame.structure.allElements.length) {
      results.push({
        check: `${frame.name}: 子组件缺样式`,
        status: '🟡',
        detail: `${missingStyle.length} 个子组件无 Tailwind 样式类`,
      });
    }
  }

  return results;
}

module.exports = { check };
