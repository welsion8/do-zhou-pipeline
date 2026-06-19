/**
 * figma-adapter.js — Figma → 设计数据中间层转换器
 *
 * 从 Figma API 或本地 JSON 导出读取设计数据，转换为 design-data-schema 标准格式。
 * 转换后的数据可直接被 pen-extract、token-gen、design-diff 等全管线模块消费。
 *
 * 输入: Figma REST API JSON 或本地 .figma.json 导出文件
 * 输出: design-data-schema.json + .pen-layout-values.json 兼容格式
 *
 * 用法:
 *   node figma-adapter.js <figma-file.json>                    # 本地 JSON
 *   node figma-adapter.js --token <token> --file <key>         # Figma API
 *   node figma-adapter.js --token <token> --file <key> --output .claude/
 *
 * Figma API 获取方式:
 *   1. https://www.figma.com/developers/api#access-tokens
 *   2. 生成 Personal Access Token
 *   3. File Key 从 Figma URL 中获取: figma.com/file/<FILE_KEY>/...
 *
 * 通用性: 不绑定任何产品。任何 Figma 文件 → 标准设计数据。
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Figma API ──

function fetchFigmaFile(token, fileKey) {
  return new Promise((resolve, reject) => {
    const url = `https://api.figma.com/v1/files/${fileKey}?geometry=paths`;
    https.get(url, { headers: { 'X-Figma-Token': token } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) resolve(JSON.parse(data));
        else reject(new Error(`Figma API ${res.statusCode}: ${data.substring(0, 200)}`));
      });
    }).on('error', reject);
  });
}

function fetchFigmaStyles(token, fileKey) {
  return new Promise((resolve, reject) => {
    const url = `https://api.figma.com/v1/files/${fileKey}/styles`;
    https.get(url, { headers: { 'X-Figma-Token': token } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) resolve(JSON.parse(data));
        else resolve(null); // styles 端点不一定可用
      });
    }).on('error', () => resolve(null));
  });
}

// ── 转换引擎 ──

/**
 * Figma 节点 → design-data-schema Frame
 */
function convertFigmaNode(node, depth = 0) {
  if (!node || node.visible === false) return null;

  const frame = {
    id: node.id,
    name: node.name,
    type: mapFigmaType(node.type),
    width: Math.round(node.absoluteBoundingBox?.width || 0),
    height: Math.round(node.absoluteBoundingBox?.height || 0),
  };

  // 提取填充色
  if (node.fills && node.fills.length > 0) {
    const solidFill = node.fills.find(f => f.type === 'SOLID' && f.visible !== false);
    if (solidFill && solidFill.color) {
      frame.fill = rgbaToHex(solidFill.color);
    }
  }

  // 提取描边
  if (node.strokes && node.strokes.length > 0) {
    const solidStroke = node.strokes.find(s => s.type === 'SOLID');
    if (solidStroke && solidStroke.color) {
      frame.stroke = rgbaToHex(solidStroke.color);
      frame.strokeWeight = node.strokeWeight || 1;
    }
  }

  // 圆角
  if (node.cornerRadius) frame.cornerRadius = node.cornerRadius;

  // 布局
  if (node.layoutMode && node.layoutMode !== 'NONE') {
    frame.layout = node.layoutMode === 'HORIZONTAL' ? 'horizontal' : 'vertical';
    if (node.itemSpacing > 0) frame.gap = node.itemSpacing;
    if (node.paddingLeft || node.paddingRight || node.paddingTop || node.paddingBottom) {
      frame.padding = [
        node.paddingTop || 0,
        node.paddingRight || 0,
        node.paddingBottom || 0,
        node.paddingLeft || 0,
      ];
    }
  }

  // 子组件
  if (node.children && node.children.length > 0 && depth < 4) {
    const components = {};
    for (const child of node.children) {
      const childFrame = convertFigmaNode(child, depth + 1);
      if (childFrame && childFrame.name) {
        const key = sanitizeName(child.name);
        if (!components[key]) components[key] = childFrame;
      }
    }
    if (Object.keys(components).length > 0) {
      frame.childComponents = components;
    }
  }

  return frame;
}

function mapFigmaType(figmaType) {
  const map = {
    FRAME: '主页面',
    COMPONENT: '组件',
    COMPONENT_SET: '组件库',
    INSTANCE: '组件实例',
    GROUP: '视图',
    RECTANGLE: 'shape',
    TEXT: 'text',
  };
  return map[figmaType] || figmaType.toLowerCase();
}

/**
 * 提取Fig颜色样式为 design tokens
 */
function extractFigmaTokens(document) {
  const tokens = { colors: {}, typography: {}, spacing: {} };
  const colorMap = {};

  function walk(node) {
    if (!node) return;
    // 提取文本样式
    if (node.type === 'TEXT' && node.style) {
      const s = node.style;
      if (s.fontFamily && !tokens.typography[s.fontFamily]) {
        tokens.typography[s.fontFamily] = {
          fontFamily: s.fontFamily,
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          lineHeight: s.lineHeightPx ? s.lineHeightPx / s.fontSize : undefined,
        };
      }
    }
    // 提取填充色
    if (node.fills) {
      for (const fill of node.fills) {
        if (fill.type === 'SOLID' && fill.color) {
          const hex = rgbaToHex(fill.color);
          if (hex !== '#000000' && hex !== '#FFFFFF' && !colorMap[hex]) {
            const name = (node.name || 'color').toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20);
            colorMap[hex] = true;
            tokens.colors[name] = { value: hex, cssVar: `--${name}`, source: node.name };
          }
        }
      }
    }
    if (node.children) node.children.forEach(walk);
  }

  walk(document);
  return tokens;
}

// ── 工具函数 ──

function rgbaToHex(color) {
  const r = Math.round((color.r || 0) * 255);
  const g = Math.round((color.g || 0) * 255);
  const b = Math.round((color.b || 0) * 255);
  const a = color.a !== undefined && color.a < 1 ? Math.round(color.a * 255) : 0;
  if (a > 0) return `#${[r, g, b, a].map(c => c.toString(16).padStart(2, '0')).join('')}`;
  return `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9一-鿿]/g, '_').substring(0, 30);
}

// ── 主转换 ──

function convertFigmaToDesignData(figmaData) {
  const document = figmaData.document || figmaData;
  const frames = {};

  // 提取顶层 frames (页面)
  function findFrames(node) {
    if (!node) return;
    if ((node.type === 'FRAME' || node.type === 'COMPONENT') && node.absoluteBoundingBox) {
      const frame = convertFigmaNode(node);
      if (frame && frame.width > 0 && frame.height > 0) {
        frames[node.id] = frame;
      }
    }
    if (node.children) node.children.forEach(findFrames);
  }

  findFrames(document);

  // 提取 tokens
  const tokens = extractFigmaTokens(document);

  // 组装为标准格式
  const designData = {
    version: '1.0',
    source: {
      tool: 'figma',
      file: figmaData.name || 'unknown',
      extractedAt: new Date().toISOString(),
      adapterVersion: '1.0',
    },
    frames,
    tokens,
  };

  return designData;
}

// ── 输出适配 ──

function writeLayoutValues(designData, outputDir) {
  // 转换为 .pen-layout-values.json 兼容格式
  const layoutValues = {
    _note: `Figma 适配器自动提取。${designData.source.file} — ${designData.source.extractedAt}`,
    frames: {},
  };

  for (const [id, frame] of Object.entries(designData.frames)) {
    layoutValues.frames[id] = {
      name: frame.name,
      width: frame.width,
      height: frame.height,
      ...(frame.fill && { fill: frame.fill }),
      ...(frame.cornerRadius && { cornerRadius: frame.cornerRadius }),
      ...(frame.childComponents && { childComponents: frame.childComponents }),
    };
  }

  fs.writeFileSync(path.join(outputDir, '.pen-layout-values.json'), JSON.stringify(layoutValues, null, 2));
  console.log(`✅ .pen-layout-values.json: ${Object.keys(layoutValues.frames).length} 帧`);
}

function writeTokens(designData, outputDir) {
  const tokens = designData.tokens;
  let css = '/* AUTO-GENERATED by figma-adapter.js — DO NOT EDIT */\n';
  css += `/* 来源: Figma — ${designData.source.file} */\n\n:root {\n`;

  for (const [name, info] of Object.entries(tokens.colors)) {
    css += `  --${name}: ${info.value};  /* ${info.source} */\n`;
  }
  css += '}\n';

  const tokensPath = path.join(outputDir, '..', 'src', 'styles', 'tokens.css');
  const dir = path.dirname(tokensPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(tokensPath, css);
  console.log(`✅ tokens.css: ${Object.keys(tokens.colors).length} 颜色`);
}

// ── 主入口 ──

async function main() {
  const args = process.argv.slice(2);
  const tokenIdx = args.indexOf('--token');
  const fileIdx = args.indexOf('--file');
  const outputIdx = args.indexOf('--output');
  const outputDir = outputIdx >= 0 ? path.resolve(args[outputIdx + 1]) : path.join(process.cwd(), '.claude');
  const figmaJsonFile = args.find(a => a.endsWith('.json') && !a.startsWith('--'));

  let figmaData;

  if (tokenIdx >= 0 && fileIdx >= 0) {
    // Figma API 模式
    const token = args[tokenIdx + 1];
    const fileKey = args[fileIdx + 1];
    console.log(`📡 从 Figma API 获取文件: ${fileKey}...`);
    figmaData = await fetchFigmaFile(token, fileKey);
    console.log(`✅ 获取成功: ${figmaData.name}`);
  } else if (figmaJsonFile) {
    // 本地 JSON 模式
    console.log(`📄 读取本地文件: ${figmaJsonFile}`);
    figmaData = JSON.parse(fs.readFileSync(figmaJsonFile, 'utf-8'));
  } else {
    console.log('用法:');
    console.log('  node figma-adapter.js <file.json>                      # 本地 Figma 导出');
    console.log('  node figma-adapter.js --token <PAT> --file <key>        # Figma API');
    console.log('  node figma-adapter.js --token <PAT> --file <key> --output .claude/');
    process.exit(1);
  }

  const designData = convertFigmaToDesignData(figmaData);
  console.log(`\n📊 转换完成:`);
  console.log(`   帧: ${Object.keys(designData.frames).length}`);
  console.log(`   颜色 Token: ${Object.keys(designData.tokens.colors).length}`);
  console.log(`   字体 Token: ${Object.keys(designData.tokens.typography).length}`);

  // 写入标准格式
  const schemaPath = path.join(outputDir, '.figma-design-data.json');
  fs.writeFileSync(schemaPath, JSON.stringify(designData, null, 2));
  console.log(`✅ design-data-schema: ${schemaPath}`);

  // 写入 .pen-layout-values.json 兼容格式
  writeLayoutValues(designData, outputDir);

  // 写入 tokens.css
  writeTokens(designData, outputDir);

  console.log(`\n✅ Figma → 管线适配完成。下一步:`);
  console.log(`   node .claude/audit-runner/audit-pipeline.js  # 全管线自动消费新数据`);
}

module.exports = { convertFigmaToDesignData, convertFigmaNode, extractFigmaTokens };

if (require.main === module) {
  main().catch(e => { console.error('❌', e.message); process.exit(1); });
}
