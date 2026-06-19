/**
 * IPC 桥接完整性 — preload 暴露的 channel ↔ 主进程 handler（仅 desktop 平台）
 */
function check(ctx) {
  const { codeDir, utils } = ctx;
  const results = [];
  if (!codeDir) return results;

  // 搜 preload
  let preloadContent = '';
  for (const f of utils.findFiles(codeDir, ['.ts', '.tsx', '.js'], ctx.CONFIG.ignoreDirs)) {
    const c = utils.readFile(f) || '';
    if (c.includes('contextBridge') || c.includes('electronAPI')) { preloadContent = c; break; }
  }
  const preloadCalls = new Set();
  for (const m of preloadContent.matchAll(/ipcRenderer\.(invoke|send)\s*\(\s*['"]([^'"]+)['"]/g)) {
    preloadCalls.add(m[2]);
  }

  // 搜主进程 handlers
  const mainHandlers = new Set();
  for (const f of utils.findFiles(codeDir, ['.ts', '.js'], ctx.CONFIG.ignoreDirs)) {
    const content = utils.readFile(f) || '';
    if (!content.includes('ipcMain')) continue;
    for (const m of content.matchAll(/ipcMain\.(handle|on)\s*\(\s*['"]([^'"]+)['"]/g)) {
      mainHandlers.add(m[2]);
    }
  }

  for (const ch of preloadCalls) {
    if (!mainHandlers.has(ch)) results.push({ channel: ch, issue: 'preload 调用了但主进程未注册 handler', status: '🔴' });
  }
  for (const ch of mainHandlers) {
    if (!preloadCalls.has(ch)) results.push({ channel: ch, issue: '主进程注册了但 preload 未暴露', status: '🟡' });
  }
  return results;
}

module.exports = { check };
