/**
 * test-fixtures.js — E2E 测试数据工厂
 *
 * 在 E2E 测试运行前预填充应用数据，让条件分支场景能真正触发。
 * 解决 4 条 BASIC 断言无法升级的根本问题。
 *
 * 用法:
 *   const { setupFixtures, cleanupFixtures } = require('./test-fixtures');
 *   test.beforeAll(async () => { await setupFixtures(__dirname); });
 *   test.afterAll(async () => { await cleanupFixtures(__dirname); });
 *
 * 通用性: 基于文件系统操作，不绑定任何产品内容。
 *         换产品 → 改 fixtures 数据结构 → 其余自动适配。
 */

const fs = require('fs');
const path = require('path');

// ── 默认测试数据 ──

const DEFAULT_FIXTURES = {
  // Skill: 测试技能包
  skills: [
    {
      name: 'test-skill-modern-romance',
      displayName: '🎬 测试-现代言情',
      version: '1.0.0',
      description: 'E2E 测试用现代言情写作技能包',
      stages: [
        { name: '故事大纲', file: 'outline.md', status: 'done' },
        { name: '人物小传', file: 'character.md', status: 'done' },
        { name: '章节目录', file: 'chapter-index.md', status: 'in_progress' },
        { name: '章节写作', file: 'chapters/', status: 'pending' },
      ],
    },
    {
      name: 'test-skill-suspense',
      displayName: '🔍 测试-悬疑推理',
      version: '1.0.0',
      description: 'E2E 测试用悬疑推理写作技能包',
      stages: [
        { name: '案件线索板', file: 'clues.md', status: 'done' },
        { name: '人物关系图', file: 'relations.md', status: 'done' },
        { name: '章节目录', file: 'chapter-index.md', status: 'pending' },
      ],
    },
  ],

  // 项目: 挂在 Skill 下
  projects: [
    {
      name: 'test-project-contract-wife',
      displayName: '霸总契约新娘',
      skillName: 'test-skill-modern-romance',
      chapters: [
        { number: 1, title: '婚礼上的陌生人', file: 'Chapter-01.md', status: 'done', wordCount: 3200 },
        { number: 2, title: '契约婚姻的开始', file: 'Chapter-02.md', status: 'done', wordCount: 2800 },
        { number: 3, title: '他吃醋了', file: 'Chapter-03.md', status: 'in_progress', wordCount: 1500 },
        { number: 4, title: '意外的温柔', file: 'Chapter-04.md', status: 'pending', wordCount: 0 },
        { number: 5, title: '真相逼近', file: 'Chapter-05.md', status: 'pending', wordCount: 0 },
      ],
    },
    {
      name: 'test-project-murder-mystery',
      displayName: '密室杀人案',
      skillName: 'test-skill-suspense',
      chapters: [
        { number: 1, title: '尸体被发现', file: 'Chapter-01.md', status: 'done', wordCount: 4100 },
        { number: 2, title: '第一个嫌疑人', file: 'Chapter-02.md', status: 'in_progress', wordCount: 1800 },
      ],
    },
    {
      name: 'test-project-empty',
      displayName: '空项目-无章节',
      skillName: 'test-skill-modern-romance',
      chapters: [],
    },
  ],

  // 回收站: 已删除的项目
  recycleBin: [
    {
      name: 'test-project-deleted-romance',
      displayName: '已删除-古风言情',
      skillName: 'test-skill-modern-romance',
      deletedAt: new Date().toISOString(),
    },
  ],

  // API 配置
  apiConfigs: [
    {
      provider: 'anthropic',
      displayName: '🧠 Anthropic Claude',
      models: [
        { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', default: true },
        { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
      ],
    },
    {
      provider: 'deepseek',
      displayName: '🔥 DeepSeek',
      models: [
        { id: 'deepseek-v3', name: 'DeepSeek V3', default: false },
      ],
    },
  ],
};

// ── 文件生成器 ──

function writeChapterFile(dir, chapter) {
  const content = `# 第${chapter.number}章 · ${chapter.title}

${'这是一段测试正文内容。'.repeat(Math.max(1, Math.floor((chapter.wordCount || 1000) / 15)))}

本章状态: ${chapter.status === 'done' ? '✅ 已完成' : chapter.status === 'in_progress' ? '⟳ 进行中' : '⏹ 未开始'}
`;
  fs.writeFileSync(path.join(dir, chapter.file), content);
}

function writeOutlineFile(dir, skillName) {
  fs.writeFileSync(path.join(dir, 'outline.md'), `# 故事大纲

## ${skillName} — E2E 测试大纲

### 核心梗概
这是一份 E2E 测试用的大纲文件。用于验证应用在大纲阶段的行为。

### 章节目录
- 第一章: 开端
- 第二章: 发展
- 第三章: 高潮
- 第四章: 结局
`);
}

function writeCharacterFile(dir) {
  fs.writeFileSync(path.join(dir, 'character.md'), `# 人物小传

## 主角
- 姓名: 测试角色 A
- 年龄: 28
- 职业: 小说家

## 配角
- 姓名: 测试角色 B
- 年龄: 32
- 职业: 编辑
`);
}

function writeChapterIndexFile(dir, chapters) {
  const chapterList = chapters
    .map((ch, i) => `${i + 1}. 第${ch.number}章 · ${ch.title} [${ch.status === 'done' ? '✅' : '⏹'}]`)
    .join('\n');

  fs.writeFileSync(path.join(dir, 'chapter-index.md'), `# 章节目录

> E2E 测试用章节目录

${chapterList}
`);
}

// ── 主函数 ──

function setupFixtures(baseDir, customFixtures) {
  const fixtures = customFixtures || DEFAULT_FIXTURES;
  const projectRoot = path.join(baseDir, '..'); // do-zhou/
  const dataDir = path.join(projectRoot, '写作项目-E2E-test-fixtures');

  console.log(`🧪 创建测试数据: ${dataDir}`);

  // 清理旧数据
  if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
  fs.mkdirSync(dataDir, { recursive: true });

  // 创建 Skills
  for (const skill of fixtures.skills) {
    const skillDir = path.join(dataDir, skill.name);
    fs.mkdirSync(skillDir, { recursive: true });

    // Skill 元数据
    const skillMeta = {
      name: skill.displayName,
      version: skill.version,
      description: skill.description,
      stages: skill.stages,
    };
    fs.writeFileSync(path.join(skillDir, 'skill.json'), JSON.stringify(skillMeta, null, 2));

    // 创建 CLAUDE.md (Skill 的核心文件)
    fs.writeFileSync(path.join(skillDir, 'CLAUDE.md'), `# ${skill.displayName}

## 角色
你是一位专业的${skill.description}

## 写作方法论
- 大纲先行，人物驱动
- 每章 3000-5000 字
- 对话与叙述比例 4:6
`);

    // 创建大纲模板
    writeOutlineFile(skillDir, skill.displayName);

    // 创建人物模板
    writeCharacterFile(skillDir);

    // 创建 templates 目录
    const templatesDir = path.join(skillDir, 'templates');
    fs.mkdirSync(templatesDir, { recursive: true });
    fs.writeFileSync(path.join(templatesDir, 'chapter-template.md'), `# 第{N}章 · {标题}

> {一句话摘要}

## 正文

{内容}

---
字数: {wordCount}
`);
  }

  // 创建项目目录
  for (const project of fixtures.projects) {
    const projectDir = path.join(dataDir, project.skillName, 'projects', project.name);
    fs.mkdirSync(projectDir, { recursive: true });

    // 项目元数据
    fs.writeFileSync(path.join(projectDir, 'project.json'), JSON.stringify({
      name: project.displayName,
      skillName: project.skillName,
      createdAt: new Date().toISOString(),
    }, null, 2));

    // 创建章节文件
    const chaptersDir = path.join(projectDir, 'chapters');
    fs.mkdirSync(chaptersDir, { recursive: true });

    for (const chapter of project.chapters) {
      if (chapter.status === 'pending' && chapter.wordCount === 0) {
        // 空章节: 创建空文件
        fs.writeFileSync(path.join(chaptersDir, chapter.file), '');
      } else {
        writeChapterFile(chaptersDir, chapter);
      }
    }

    // 创建章节目录
    if (project.chapters.length > 0) {
      writeChapterIndexFile(projectDir, project.chapters);
    }

    // 创建 outline.md 和 character.md
    writeOutlineFile(projectDir, project.skillName);
    writeCharacterFile(projectDir);
  }

  // 创建回收站数据
  if (fixtures.recycleBin && fixtures.recycleBin.length > 0) {
    const trashDir = path.join(dataDir, '.trash');
    fs.mkdirSync(trashDir, { recursive: true });
    for (const item of fixtures.recycleBin) {
      fs.writeFileSync(path.join(trashDir, `${item.name}.json`), JSON.stringify(item, null, 2));
    }
  }

  console.log(`✅ 测试数据就绪: ${fixtures.skills.length} Skills, ${fixtures.projects.length} 项目, ${fixtures.recycleBin?.length || 0} 回收站项`);
  return dataDir;
}

function cleanupFixtures(baseDir) {
  const projectRoot = path.join(baseDir, '..');
  const dataDir = path.join(projectRoot, '写作项目-E2E-test-fixtures');
  if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true, force: true });
    console.log('🧹 测试数据已清理');
  }
}

module.exports = { setupFixtures, cleanupFixtures, DEFAULT_FIXTURES };
