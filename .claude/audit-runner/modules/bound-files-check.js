/**
 * 绑定文件结构完整性检查
 *
 * 从 Spec 的 "绑定文件结构清单" 表提取预期结构，
 * 与实际项目数据文件比对。通用——换产品只需填表。
 *
 * 触发条件: Spec 包含 "## 绑定文件结构清单" 且表中有非空行
 * 降级: Spec 无此章节 / 表为"不适用" → 自动跳过
 */
const path = require('path');

function check(ctx) {
  const results = [];
  const { specContent, utils, CONFIG } = ctx;
  if (!specContent) return results;

  // 检查是否存在绑定文件结构清单
  if (!/绑定文件结构清单/.test(specContent)) {
    return results; // 无此章节 → 产品无绑定文件概念, 跳过
  }

  if (/不适用/.test(specContent.match(/绑定文件结构清单[\s\S]*?(?=## |$)/)?.[0] || '')) {
    results.push({ check: '绑定文件检查', status: '🟡', detail: '产品声明"不适用"' });
    return results;
  }

  // 提取表行
  const section = specContent.match(/绑定文件结构清单[\s\S]*?(?=## )/)?.[0] || '';
  const rows = section.match(/^\|.+\|.+\|.+\|.+\|$/gm) || [];
  const dataRows = rows.filter(r => !/绑定文件|------|文件名/.test(r));

  if (dataRows.length === 0) {
    results.push({ check: '绑定文件检查', status: '🟡', detail: '清单表为空，请填写绑定文件信息' });
    return results;
  }

  // 解析每行
  const bindings = [];
  for (const row of dataRows) {
    const cols = row.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length < 2) continue;
    const fileName = cols[0].replace(/[`]/g, '').trim();
    const isGlob = fileName.includes('*');
    const purpose = cols[1] || '';
    const keywords = (cols[2] || '').split(/[,，]/).map(k => k.trim()).filter(Boolean);
    const firstLineMatch = (cols[3] || '').replace(/[`]/g, '').trim();
    if (fileName && (keywords.length > 0 || isGlob)) {
      bindings.push({ fileName, purpose, keywords, firstLineMatch, isGlob });
    }
  }

  if (bindings.length === 0) return results;

  // 查找项目数据目录中的绑定文件
  const codeDir = ctx.codeDir || 'do-zhou';
  const projectRoot = ctx.PROJECT_ROOT || '.';
  const dataRoot = utils.readFile(path.join(projectRoot, '.claude', 'project.config.json'));
  let projectDataDir = null;

  // 尝试常见数据目录
  const possibleDirs = [
    path.join(projectRoot, codeDir, 'projects'),
    path.join(process.env.APPDATA || '', 'do-zhou', 'do-zhou-data', 'projects'),
    path.join(require('os').homedir(), 'AppData', 'Roaming', 'do-zhou', 'do-zhou-data', 'projects'),
  ];

  for (const dir of possibleDirs) {
    if (utils.dirExists && utils.dirExists(dir)) { projectDataDir = dir; break; }
    try { require('fs').accessSync(dir); projectDataDir = dir; break; } catch (_) {}
  }

  if (!projectDataDir) {
    results.push({ check: '绑定文件检查', status: '🟡', detail: '无法定位项目数据目录' });
    return results;
  }

  // 递归搜索绑定文件/目录
  const fs = require('fs');
  function findFiles(dir, fileName, depth = 0) {
    if (depth > 5) return [];
    const found = [];
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const fp = path.join(dir, entry.name);
        if (entry.isDirectory()) found.push(...findFiles(fp, fileName, depth + 1));
        if (entry.name === fileName) found.push(fp); // 文件和目录都匹配
      }
    } catch (_) {}
    return found;
  }

  // 逐个绑定文件检查
  let totalKeywords = 0;
  let matchedKeywords = 0;

  for (const b of bindings) {
    if (b.isGlob) continue; // glob 模式在后面单独处理
    const found = findFiles(projectDataDir, b.fileName);
    if (found.length === 0) {
      results.push({
        check: `${b.fileName}: 不存在`,
        status: '🟡',
        detail: `绑定文件 "${b.fileName}"（${b.purpose}）未在项目数据中找到`,
      });
      continue;
    }

    // 检查所有找到的文件（同一文件名可能在多个项目中），
    // 任何一个不符就报警
    let allPassed = true;
    for (const filePath of found) {
      const content = utils.readFile ? utils.readFile(filePath) : fs.readFileSync(filePath, 'utf-8');
      if (!content || content.trim().length === 0) continue;

      // 首行检查
      const firstLine = content.split('\n')[0];
      const firstLineOk = !b.firstLineMatch || firstLine.includes(b.firstLineMatch);

      // 结构关键词检查（只在第一个文件中统计覆盖率）
      const isPrimary = filePath === found[0];
      const keywordResults = b.keywords.map(k => ({
        keyword: k,
        found: content.includes(k),
      }));

      if (isPrimary) {
        const keywordsFound = keywordResults.filter(k => k.found).length;
        totalKeywords += b.keywords.length;
        matchedKeywords += keywordsFound;
      }

      if (!firstLineOk) {
        results.push({
          check: `${b.fileName}: 首行不匹配 (${path.basename(path.dirname(filePath))})`,
          status: '🔴',
          detail: `首行 "${firstLine.substring(0, 50)}" 不含 "${b.firstLineMatch}"——文件内容可能放错了`,
        });
        allPassed = false;
      }

      const missing = keywordResults.filter(k => !k.found).map(k => k.keyword);
      if (missing.length > 0 && isPrimary) {
        results.push({
          check: `${b.fileName}: 缺 ${missing.length}/${b.keywords.length} 关键词 (${path.basename(path.dirname(filePath))})`,
          status: missing.length >= b.keywords.length / 2 ? '🟠' : '🟡',
          detail: `缺失: ${missing.join(', ')}`,
        });
        allPassed = false;
      }
    }

    if (allPassed) {
      results.push({
        check: `${b.fileName}: ${b.keywords.length}/${b.keywords.length} 关键词`,
        status: '✅',
        found: true,
        detail: `结构完整 (${found.length}个文件, ${b.purpose})`,
      });
    }
  }

  // 目录/Glob 绑定检查（如 chapters/Chapter-*.md）
  for (const b of bindings) {
    if (!b.isGlob && !b.fileName.endsWith('/')) continue;
    const dirPath = b.fileName.replace(/\/[^*]*\*.*$/, '').replace(/\/$/, '');
    const globPart = b.fileName.split('/').pop() || b.fileName;
    const filePattern = b.fileName.includes('*') ? new RegExp('^' + globPart.replace(/\*/g, '.+') + '$') : null;

    const foundDirs = findFiles(projectDataDir, dirPath.split('/').pop() || dirPath);
    const dirFound = foundDirs.filter(f => {
      try { return fs.statSync(f).isDirectory(); } catch(_) { return false; }
    });

    if (dirFound.length === 0) {
      results.push({ check: `${dirPath}/: 目录不存在`, status: '🟡', detail: `绑定目录 "${dirPath}" 未找到` });
      continue;
    }

    let totalFiles = 0, totalOK = 0, totalFail = 0, emptyDirs = 0;
    for (const d of dirFound) {
      try {
        const files = fs.readdirSync(d).filter(f => (filePattern ? filePattern.test(f) : f.endsWith('.md')));
        if (files.length === 0) { emptyDirs++; continue; }

        for (const f of files) {
          totalFiles++;
          const content = fs.readFileSync(path.join(d, f), 'utf-8');
          const firstLine = content.split('\n')[0];
          const firstOk = !b.firstLineMatch || new RegExp(b.firstLineMatch).test(firstLine);

          // 章节号一致性校验：Chapter-06.md → 标题应含"第六章"
          let numOk = true;
          // 阿拉伯数字 → 中文数字（支持任意大数，如 100→一百, 1024→一千零二十四）
          function toChineseNum(n) {
            if (n <= 15) return ['零','一','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四','十五'][n];
            const digits = ['零','一','二','三','四','五','六','七','八','九'];
            const units = ['','十','百','千'];
            const bigUnits = ['','万','亿'];
            if (n < 10000) {
              let s = ''; const str = n.toString();
              for (let i = 0; i < str.length; i++) {
                const d = parseInt(str[i]); const u = str.length - i - 1;
                if (d === 0) { if (s && s[s.length-1] !== '零') s += '零'; }
                else s += digits[d] + units[u];
              }
              return s.replace(/零$/, '').replace(/一十/g, '十');
            }
            return n + ''; // 万以上暂时用数字
          }
          const numMatch = f.match(/Chapter-0*(\d+)/i);
          if (numMatch) {
            const n = parseInt(numMatch[1]);
            const expectedCN = toChineseNum(n);
            numOk = firstLine.includes('第' + expectedCN + '章');
          }

          if (firstOk && numOk) totalOK++; else {
            totalFail++;
            if (!firstOk) {
              results.push({
                check: `${f}: 首行不匹配`,
                status: '🟡',
                detail: `"${firstLine.substring(0, 40)}" 不匹配 "${b.firstLineMatch}"`,
              });
            }
            if (!numOk) {
              const n = parseInt(numMatch?.[1] || '0');
              results.push({
                check: `${f}: 章节号不匹配`,
                status: '🟠',
                detail: `${f} 标题 "${firstLine.substring(0, 40)}" 应含 "第${cnNums[Math.min(n,15)]}章"`,
              });
            }
          }
        }
      } catch(_) {}
    }

    if (totalFiles > 0) {
      results.push({
        check: `${dirPath}/: ${totalOK}/${totalFiles} 文件`,
        status: totalFail === 0 ? '✅' : '🟠',
        found: totalFail === 0,
        detail: totalFail === 0 ? `${dirFound.length - emptyDirs} 个项目, 全部结构完整` : `${totalFail} 个文件结构异常`,
      });
    }
    if (emptyDirs > 0) {
      results.push({
        check: `${dirPath}/: ${emptyDirs} 个空目录`,
        status: '🟡',
        detail: '旧项目 chapters/ 目录为空，可忽略或清理',
      });
    }
  }

  const coverage = totalKeywords > 0 ? Math.round(matchedKeywords / totalKeywords * 100) : 0;
  if (totalKeywords > 0) {
    results.push({
      check: `绑定文件结构覆盖率: ${coverage}%`,
      status: coverage >= 80 ? '✅' : '🟠',
      found: coverage >= 80,
      detail: `${matchedKeywords}/${totalKeywords} 关键词匹配`,
    });
  }

  return results;
}

module.exports = { check };
