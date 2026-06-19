#!/usr/bin/env node
/**
 * spec-change-notify.js — Spec 变更 → 受影响 Phase 自动标注
 *
 * Product-Spec.md 变更时，检测受影响的功能区域，映射到 DEV-PLAN Phase，
 * 写 .spec-changed-phases 标记文件，Agent/CI 据此触发增量审计。
 *
 * 用法:
 *   node spec-change-notify.js                        # 检查 Spec 是否变更
 *   node spec-change-notify.js --base HEAD~1          # 对比指定 commit
 *
 * 通用性: 解析 Spec ## 功能需求 + DEV-PLAN ## Phase，不绑定任何产品内容。
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const MARKER_FILE = path.join(PROJECT_ROOT, '.claude', '.spec-changed-phases');

function isGitRepo() {
  try { execSync('git rev-parse --git-dir', { cwd: PROJECT_ROOT, stdio: 'pipe', timeout: 5000 }); return true; }
  catch (_) { return false; }
}

function getSpecChanges(baseRef) {
  if (!isGitRepo()) return null;
  try {
    const base = baseRef || 'HEAD~1';
    const diff = execSync(`git diff ${base} HEAD -- Product-Spec.md`, {
      cwd: PROJECT_ROOT, stdio: 'pipe', timeout: 10000
    }).toString().trim();
    return diff || null;
  } catch (_) { return null; }
}

function parseSpecSections(specContent) {
  const sections = [];
  const lines = specContent.split('\n');
  let currentSection = '';
  for (const line of lines) {
    const m = line.match(/^##\s+(.+)/);
    if (m) currentSection = m[1].trim();
    const sm = line.match(/^###\s+(.+)/);
    if (sm) sections.push({ section: currentSection, subsection: sm[1].trim() });
  }
  return sections;
}

function parsePlanPhases(planContent) {
  const phases = [];
  if (!planContent) return phases;
  const lines = planContent.split('\n');
  for (const line of lines) {
    const m = line.match(/^##\s*Phase\s*(\d+)\s*[-:]\s*(.+)/i);
    if (m) phases.push({ phase: parseInt(m[1]), name: m[2].trim(), keywords: extractKeywords(m[2]) });
  }
  return phases;
}

function extractKeywords(text) {
  const kwMap = {
    'Skill': 'skill', '项目': 'project', '写作': 'editor', '编辑': 'editor',
    'AI': 'ai', '对话': 'chat', 'API': 'api', '模型': 'model',
    '设置': 'settings', '导航': 'nav', '布局': 'layout', '章节': 'chapter',
    '大纲': 'outline', '人物': 'character', '文件': 'file',
  };
  const lower = text.toLowerCase();
  return Object.entries(kwMap).filter(([cn]) => lower.includes(cn)).map(([, en]) => en);
}

function findAffectedPhases(specDiff, specContent, planContent) {
  if (!specDiff) return [];

  const sections = parseSpecSections(specContent);
  const phases = parsePlanPhases(planContent);

  // 从 Spec diff 中提取变更的章节
  const changedLines = specDiff.split('\n').filter(l => l.startsWith('+') || l.startsWith('-'));
  const changedSections = new Set();
  let currentSection = '';
  for (const line of specDiff.split('\n')) {
    if (line.startsWith('## ')) currentSection = line.replace(/^[+-]\s*/, '').trim();
    if ((line.startsWith('+') || line.startsWith('-')) && line.length > 5 && currentSection) {
      changedSections.add(currentSection);
    }
  }

  // 映射到 Phase
  const affected = [];
  for (const section of changedSections) {
    const sectionLower = section.toLowerCase();
    for (const p of phases) {
      if (p.keywords.some(kw => sectionLower.includes(kw))) {
        if (!affected.find(a => a.phase === p.phase)) {
          affected.push(p);
        }
      }
    }
  }

  return affected;
}

function main() {
  const args = process.argv.slice(2);
  const baseIdx = args.indexOf('--base');
  const baseRef = baseIdx >= 0 ? args[baseIdx + 1] : null;

  const specPath = path.join(PROJECT_ROOT, 'Product-Spec.md');
  const planPath = path.join(PROJECT_ROOT, 'DEV-PLAN.md');

  if (!fs.existsSync(specPath)) {
    console.log('🟡 无 Product-Spec.md');
    process.exit(0);
  }

  const specDiff = getSpecChanges(baseRef);
  if (!specDiff) {
    if (fs.existsSync(MARKER_FILE)) fs.unlinkSync(MARKER_FILE);
    console.log('✅ Spec 无变更');
    process.exit(0);
  }

  const specContent = fs.readFileSync(specPath, 'utf-8');
  const planContent = fs.existsSync(planPath) ? fs.readFileSync(planPath, 'utf-8') : '';

  const affected = findAffectedPhases(specDiff, specContent, planContent);

  if (affected.length === 0) {
    console.log('✅ Spec 有变更但无 Phase 受影响');
    process.exit(0);
  }

  const marker = {
    timestamp: new Date().toISOString(),
    affectedPhases: affected.map(p => ({ phase: p.phase, name: p.name })),
    action: 'Agent: 对受影响 Phase 执行增量审计 + 代码对齐',
  };
  fs.writeFileSync(MARKER_FILE, JSON.stringify(marker, null, 2));

  console.log(`📋 Spec 变更影响 Phase: ${affected.map(p => `P${p.phase}-${p.name}`).join(', ')}`);
  console.log(`   标记文件: ${MARKER_FILE}`);
}

module.exports = { getSpecChanges, findAffectedPhases, parseSpecSections, parsePlanPhases };

if (require.main === module) {
  main();
}
