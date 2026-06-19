# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: spec-generated.spec.ts >> Spec 用户场景验证 (自动生成) >> [28] 关闭应用
- Location: spec-generated.spec.ts:472:7

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 20
Received:   0
```

# Test source

```ts
  382 | 
  383 |     // 验证弹窗出现
  384 |     const modal = page.locator('[data-testid="modal-overlay"]').first();
  385 |     const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);
  386 |     if (modalVisible) {
  387 |       await expect(page.locator('[data-testid="modal-title"]').first()).toBeVisible();
  388 |       const confirmBtn = page.locator('[data-testid="modal-confirm"]').first();
  389 |       await expect(confirmBtn).toBeVisible();
  390 |     }
  391 |   });
  392 | 
  393 |   // ═══ Spec: 用户行为: 发起重命名 → IPC 调用 `project:rename` → 成功 → 更新 UI（乐观更新先行，失败时回退）→ 失败（权限不足/文件名冲突）→ 显示内联错误提示，恢复原 [🟢🟢] ═══
  394 |   test('[23] 发起重命名', async () => {
  395 |     // 触发: 发起重命名
  396 |     // 预期: IPC 调用 `project:rename` → 成功 → 更新 UI（乐观更新先行，失败时回退）→ 失败（权限不足/文件名冲突）→ 显示内联错误提示，恢复原
  397 |     
  398 |     // 通用操作: 尝试匹配 data-testid 元素
  399 |     await page.waitForTimeout(800);
  400 | 
  401 |     // 验证 Toast 消息
  402 |     const toast = page.locator('[data-testid="toast-message"]').first();
  403 |     const toastVisible = await toast.isVisible({ timeout: 3000 }).catch(() => false);
  404 |     if (toastVisible) await expect(toast).toBeVisible();
  405 |   });
  406 | 
  407 |   // ═══ Spec: 用户行为: 可双击标签名重命名。新文件纳入文件树显示。若项目目录已存在 `未命名.md` → 自动命名为 `未命名-1.md`、`未命名-2.md`... [🟢🟢] ═══
  408 |   test('[24] 可双击标签名重命名。新文件纳入文件树显示。若项目目录已存在 `未命名.md`', async () => {
  409 |     // 触发: 可双击标签名重命名。新文件纳入文件树显示。若项目目录已存在 `未命名.md`
  410 |     // 预期: 自动命名为 `未命名-1.md`、`未命名-2.md`...
  411 |     
  412 |     // 通用操作: 尝试匹配 data-testid 元素
  413 |     await page.waitForTimeout(800);
  414 | 
  415 |     // 验证标签页
  416 |     const tabs = page.locator('[data-testid="tab"]');
  417 |     const tabCount = await tabs.count();
  418 |     expect(tabCount).toBeGreaterThanOrEqual(0);
  419 |     if (tabCount > 0) await expect(tabs.first()).toBeVisible();
  420 |   });
  421 | 
  422 |   // ═══ Spec: 用户行为: 点击应用 → 替换编辑区中的原选中文本 [🟡] ═══
  423 |   test('[25] 点击应用', async () => {
  424 |     // 触发: 点击应用
  425 |     // 预期: 替换编辑区中的原选中文本
  426 |     
  427 |     const btn = page.locator('[data-testid="stage-card"], [data-testid="chapter-row"], [data-testid="tab"]').filter({ hasText: /应用/ }).first();
  428 |     if (await btn.isVisible().catch(() => false)) await btn.click();
  429 | 
  430 |     // 验证页面有基本内容
  431 |     await page.waitForTimeout(500);
  432 |     const bodyText = await page.locator('body').innerText().catch(() => '');
  433 |     expect(bodyText.length).toBeGreaterThan(10);
  434 |   });
  435 | 
  436 |   // ═══ Spec: 用户行为: 在预览期间修改了编辑区内容 → 点击应用时提示"编辑区内容已变更，应用预览将覆盖当前选中的文本" [🟢🟢] ═══
  437 |   test('[26] 在预览期间修改了编辑区内容', async () => {
  438 |     // 触发: 在预览期间修改了编辑区内容
  439 |     // 预期: 点击应用时提示"编辑区内容已变更，应用预览将覆盖当前选中的文本"
  440 |     
  441 |     // 通用操作: 尝试匹配 data-testid 元素
  442 |     await page.waitForTimeout(800);
  443 | 
  444 |     // 验证输入区域可用
  445 |     const inputArea = page.locator('[data-testid="chat-input"], input:not([type="hidden"]), textarea, [contenteditable="true"]').first();
  446 |     const iaVisible = await inputArea.isVisible({ timeout: 3000 }).catch(() => false);
  447 |     if (iaVisible) {
  448 |       await expect(inputArea).toBeVisible();
  449 |       await expect(inputArea).toBeEnabled();
  450 |     }
  451 |   });
  452 | 
  453 |   // ═══ Spec: 用户行为: 点击 [✏️ 手动接管] 中断 AI 后 → 阶段状态从 ⟳ 回退到 ⏹（文件保留已生成的半成品内容） [🟢🟢] ═══
  454 |   test('[27] 点击 [✏️ 手动接管] 中断 AI 后', async () => {
  455 |     // 触发: 点击 [✏️ 手动接管] 中断 AI 后
  456 |     // 预期: 阶段状态从 ⟳ 回退到 ⏹（文件保留已生成的半成品内容）
  457 |     
  458 |     const btn = page.locator('[data-testid="stage-card"], [data-testid="chapter-row"], [data-testid="tab"]').filter({ hasText: /[✏️ 手动接管] 中断 AI/ }).first();
  459 |     if (await btn.isVisible().catch(() => false)) await btn.click();
  460 | 
  461 |     // 验证 AI 对话区
  462 |     const chatBody = page.locator('[data-testid="chat-body"]').first();
  463 |     const chatVisible = await chatBody.isVisible({ timeout: 3000 }).catch(() => false);
  464 |     if (chatVisible) {
  465 |       await expect(chatBody).toBeVisible();
  466 |       const msgs = page.locator('[data-testid="ai-message"], [data-testid="user-message"]');
  467 |       expect(await msgs.count()).toBeGreaterThanOrEqual(0);
  468 |     }
  469 |   });
  470 | 
  471 |   // ═══ Spec: 用户行为: 关闭应用 → 重启后阶段状态根据文件内容重新判定（文件有内容→✅，文件为空→⏹，不会卡在 ⟳） [🟢] ═══
  472 |   test('[28] 关闭应用', async () => {
  473 |     // 触发: 关闭应用
  474 |     // 预期: 重启后阶段状态根据文件内容重新判定（文件有内容→✅，文件为空→⏹，不会卡在 ⟳）
  475 |     
  476 |     // 通用操作: 尝试匹配 data-testid 元素
  477 |     await page.waitForTimeout(800);
  478 | 
  479 |     // 验证状态变化
  480 |     await page.waitForTimeout(500);
  481 |     const bodyText = await page.locator('body').innerText().catch(() => '');
> 482 |     expect(bodyText.length).toBeGreaterThan(20);
      |                             ^ Error: expect(received).toBeGreaterThan(expected)
  483 |   });
  484 | 
  485 |   // ═══ Spec: 用户行为: 点击关闭 → 弹出确认"AI 正在生成内容，关闭应用将中断生成 [🟢🟢] ═══
  486 |   test('[29] 点击关闭', async () => {
  487 |     // 触发: 点击关闭
  488 |     // 预期: 弹出确认"AI 正在生成内容，关闭应用将中断生成
  489 |     
  490 |     const btn = page.locator('[data-testid="stage-card"], [data-testid="chapter-row"], [data-testid="tab"]').filter({ hasText: /关闭/ }).first();
  491 |     if (await btn.isVisible().catch(() => false)) await btn.click();
  492 | 
  493 |     // 验证弹窗出现
  494 |     const modal = page.locator('[data-testid="modal-overlay"]').first();
  495 |     const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);
  496 |     if (modalVisible) {
  497 |       await expect(page.locator('[data-testid="modal-title"]').first()).toBeVisible();
  498 |       const confirmBtn = page.locator('[data-testid="modal-confirm"]').first();
  499 |       await expect(confirmBtn).toBeVisible();
  500 |     }
  501 |   });
  502 | 
  503 |   // ═══ Spec: 用户行为: 手动清空文件内容 | → ⏹（保持） | → ⏹（AI 被中断时回退） | → ⏹ | [🟢🟢] ═══
  504 |   test('[30] 手动清空文件内容 |', async () => {
  505 |     // 触发: 手动清空文件内容 |
  506 |     // 预期: ⏹（保持） | → ⏹（AI 被中断时回退） | → ⏹ |
  507 |     
  508 |     // 通用操作: 尝试匹配 data-testid 元素
  509 |     await page.waitForTimeout(800);
  510 | 
  511 |     // 验证弹窗出现
  512 |     const modal = page.locator('[data-testid="modal-overlay"]').first();
  513 |     const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);
  514 |     if (modalVisible) {
  515 |       await expect(page.locator('[data-testid="modal-title"]').first()).toBeVisible();
  516 |       const confirmBtn = page.locator('[data-testid="modal-confirm"]').first();
  517 |       await expect(confirmBtn).toBeVisible();
  518 |     }
  519 |   });
  520 | 
  521 |   // ═══ Spec: 用户行为: 从文件树手动编辑并保存 | → ✅（若内容非空） | → ✅（AI 完成后自动判定） | → ✅（保持） | [🟢🟢] ═══
  522 |   test('[31] 从文件树手动编辑并保存 |', async () => {
  523 |     // 触发: 从文件树手动编辑并保存 |
  524 |     // 预期: ✅（若内容非空） | → ✅（AI 完成后自动判定） | → ✅（保持） |
  525 |     
  526 |     // 通用操作: 尝试匹配 data-testid 元素
  527 |     await page.waitForTimeout(800);
  528 | 
  529 |     // 验证 AI 对话区
  530 |     const chatBody = page.locator('[data-testid="chat-body"]').first();
  531 |     const chatVisible = await chatBody.isVisible({ timeout: 3000 }).catch(() => false);
  532 |     if (chatVisible) {
  533 |       await expect(chatBody).toBeVisible();
  534 |       const msgs = page.locator('[data-testid="ai-message"], [data-testid="user-message"]');
  535 |       expect(await msgs.count()).toBeGreaterThanOrEqual(0);
  536 |     }
  537 |   });
  538 | 
  539 |   // ═══ Spec: 用户行为: 切换模型 → 检测引擎是否变化 [🟡] ═══
  540 |   test('[32] 切换模型', async () => {
  541 |     // 触发: 切换模型
  542 |     // 预期: 检测引擎是否变化
  543 |     
  544 |     const btn = page.locator('[data-testid="stage-card"], [data-testid="chapter-row"], [data-testid="tab"]').filter({ hasText: /模型/ }).first();
  545 |     if (await btn.isVisible().catch(() => false)) await btn.click();
  546 | 
  547 |     // 验证页面有基本内容
  548 |     await page.waitForTimeout(500);
  549 |     const bodyText = await page.locator('body').innerText().catch(() => '');
  550 |     expect(bodyText.length).toBeGreaterThan(10);
  551 |   });
  552 | 
  553 |   // ═══ 场景: 导出 Skill 分享给同行: 导出 Skill 分享给同行 → 导出操作成功执行 [🟢🟢] ═══
  554 |   test('[33] 导出 Skill 分享给同行', async () => {
  555 |     // 触发: 导出 Skill 分享给同行
  556 |     // 预期: 导出操作成功执行
  557 |     
  558 |     // 通用操作: 尝试匹配 data-testid 元素
  559 |     await page.waitForTimeout(800);
  560 | 
  561 |     // 验证 Skill 卡片/项目列表
  562 |     const cards = page.locator('[data-testid="skill-card"], [data-testid="project-row"]');
  563 |     const cardCount = await cards.count();
  564 |     expect(cardCount).toBeGreaterThanOrEqual(0);
  565 |     if (cardCount > 0) await expect(cards.first()).toBeVisible();
  566 |   });
  567 | 
  568 |   // ═══ Spec: 条件分支: 若 检测到同名 Skill 已存在 → 弹出三选一对话框：① 覆盖现有（保留同名 Skill 的项目关联）② 保留两者（自动重命名新 Skill 为"名称 (1)"）③ 取消导入 [🟢🟢] ═══
  569 |   test('[34] 若 检测到同名 Skill 已存在', async () => {
  570 |     // 触发: 若 检测到同名 Skill 已存在
  571 |     // 预期: 弹出三选一对话框：① 覆盖现有（保留同名 Skill 的项目关联）② 保留两者（自动重命名新 Skill 为"名称 (1)"）③ 取消导入
  572 |     
  573 |     // 通用操作: 尝试匹配 data-testid 元素
  574 |     await page.waitForTimeout(800);
  575 | 
  576 |     // 验证弹窗出现
  577 |     const modal = page.locator('[data-testid="modal-overlay"]').first();
  578 |     const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);
  579 |     if (modalVisible) {
  580 |       await expect(page.locator('[data-testid="modal-title"]').first()).toBeVisible();
  581 |       const confirmBtn = page.locator('[data-testid="modal-confirm"]').first();
  582 |       await expect(confirmBtn).toBeVisible();
```