#!/usr/bin/env node
/**
 * pr-comment.js — PR 自动标注
 *
 * 读取设计变更检测结果，自动在 GitHub PR 上 Comment。
 * design-diff → CI → PR Comment → 开发者一眼看到影响范围。
 *
 * 用法（CI 中自动调用）:
 *   node .claude/hooks/pr-comment.js
 *
 * 环境变量:
 *   GITHUB_TOKEN  — GitHub Actions 自动注入
 *   GITHUB_REPOSITORY — owner/repo
 *   PR_NUMBER    — 或从 GITHUB_REF 提取
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_ROOT = process.env.GITHUB_WORKSPACE || process.env.CLAUDE_PROJECT_DIR || process.cwd();
const DESIGN_DIFF = path.join(PROJECT_ROOT, '.claude', '.design-diff.json');
const AUDIT_REPORT = path.join(PROJECT_ROOT, '.claude', '.audit-report.json');

function getPRNumber() {
  if (process.env.PR_NUMBER) return process.env.PR_NUMBER;
  const ref = process.env.GITHUB_REF || '';
  const m = ref.match(/refs\/pull\/(\d+)\/merge/);
  if (m) return m[1];
  try {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (eventPath && fs.existsSync(eventPath)) {
      const event = JSON.parse(fs.readFileSync(eventPath, 'utf-8'));
      if (event.pull_request?.number) return event.pull_request.number;
      if (event.number) return event.number;
    }
  } catch (_) {}
  return null;
}

function getRepo() {
  return process.env.GITHUB_REPOSITORY || null;
}

async function postComment(repo, prNumber, body) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.log('⚠ 无 GITHUB_TOKEN，跳过 PR Comment。本地运行时不发 Comment。');
    console.log(body);
    return;
  }

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ body });
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${repo}/issues/${prNumber}/comments`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'feicai-pipeline',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, res => {
      let response = '';
      res.on('data', chunk => response += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          console.log('✅ PR Comment 已发布');
          resolve();
        } else {
          console.log(`⚠ PR Comment 发布失败 (${res.statusCode}): ${response.substring(0, 200)}`);
          resolve();
        }
      });
    });
    req.on('error', e => { console.log('⚠ PR Comment 网络错误:', e.message); resolve(); });
    req.write(data);
    req.end();
  });
}

function buildCommentBody() {
  let body = '## 📐 设计变更影响分析\n\n';

  // 设计变更
  if (fs.existsSync(DESIGN_DIFF)) {
    try {
      const diff = JSON.parse(fs.readFileSync(DESIGN_DIFF, 'utf-8'));
      const s = diff.summary || {};

      body += '### 🎨 设计数据变更\n\n';
      body += `| 类型 | 数量 |\n|------|------|\n`;
      body += `| 🔴 高影响 | ${s.high || 0} |\n`;
      body += `| 🟠 中影响 | ${s.medium || 0} |\n`;
      body += `| 🟡 低影响 | ${s.low || 0} |\n`;
      body += `| 📁 影响文件 | ${s.affectedFiles || 0} |\n\n`;

      if (diff.fileImpact && Object.keys(diff.fileImpact).length > 0) {
        body += '**受影响文件:**\n';
        for (const [file, changes] of Object.entries(diff.fileImpact).slice(0, 10)) {
          body += `- \`${file}\`: ${changes.length} 处变更\n`;
        }
        body += '\n';
      }
    } catch (_) {}
  }

  // 审计概要
  if (fs.existsSync(AUDIT_REPORT)) {
    try {
      const audit = JSON.parse(fs.readFileSync(AUDIT_REPORT, 'utf-8'));
      const s = audit.summary || {};
      body += '### 📋 审计结果\n\n';
      body += `🔴 ${s.red || 0} · 🟠 ${s.orange || 0} · 🟡 ${s.yellow || 0} · 🟢 ${s.green || 0}\n\n`;
      if (s.red > 0) body += '⚠ **存在阻断项，请修复后合并。**\n\n';
    } catch (_) {}
  }

  body += '---\n';
  body += '🤖 *由 FeiCai Pipeline 自动生成 · design-diff + audit-pipeline*';
  return body;
}

async function main() {
  const prNumber = getPRNumber();
  const repo = getRepo();

  if (!prNumber || !repo) {
    console.log('⚠ 非 PR 环境或无 GITHUB_TOKEN，跳过 Comment。');
    console.log(buildCommentBody());
    return;
  }

  const body = buildCommentBody();
  await postComment(repo, prNumber, body);
}

module.exports = { buildCommentBody, postComment };

if (require.main === module) {
  main().catch(e => { console.error('❌', e.message); process.exit(0); });
}
