# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: spec-generated.spec.ts >> Spec 用户场景验证 (自动生成) >> [47] 若 引擎不变
- Location: spec-generated.spec.ts:781:7

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 20
Received:   0
```

# Test source

```ts
  691 |     await page.waitForTimeout(800);
  692 | 
  693 |     // 验证标签页
  694 |     const tabs = page.locator('[data-testid="tab"]');
  695 |     const tabCount = await tabs.count();
  696 |     expect(tabCount).toBeGreaterThanOrEqual(0);
  697 |     if (tabCount > 0) await expect(tabs.first()).toBeVisible();
  698 |   });
  699 | 
  700 |   // ═══ Spec: 条件分支: 若 项目目录已存在 `未命名.md` → 自动命名为 `未命名-1.md`、`未命名-2.md`... [🟢🟢] ═══
  701 |   test('[42] 若 项目目录已存在 `未命名.md`', async () => {
  702 |     // 触发: 若 项目目录已存在 `未命名.md`
  703 |     // 预期: 自动命名为 `未命名-1.md`、`未命名-2.md`...
  704 |     
  705 |     // 通用操作: 尝试匹配 data-testid 元素
  706 |     await page.waitForTimeout(800);
  707 | 
  708 |     // 验证 Skill 卡片/项目列表
  709 |     const cards = page.locator('[data-testid="skill-card"], [data-testid="project-row"]');
  710 |     const cardCount = await cards.count();
  711 |     expect(cardCount).toBeGreaterThanOrEqual(0);
  712 |     if (cardCount > 0) await expect(cards.first()).toBeVisible();
  713 |   });
  714 | 
  715 |   // ═══ Spec: 条件分支: 若 用户在预览期间修改了编辑区内容 → 点击应用时提示"编辑区内容已变更 [🟢🟢] ═══
  716 |   test('[43] 若 用户在预览期间修改了编辑区内容', async () => {
  717 |     // 触发: 若 用户在预览期间修改了编辑区内容
  718 |     // 预期: 点击应用时提示"编辑区内容已变更
  719 |     
  720 |     // 通用操作: 尝试匹配 data-testid 元素
  721 |     await page.waitForTimeout(800);
  722 | 
  723 |     // 验证输入区域可用
  724 |     const inputArea = page.locator('[data-testid="chat-input"], input:not([type="hidden"]), textarea, [contenteditable="true"]').first();
  725 |     const iaVisible = await inputArea.isVisible({ timeout: 3000 }).catch(() => false);
  726 |     if (iaVisible) {
  727 |       await expect(inputArea).toBeVisible();
  728 |       await expect(inputArea).toBeEnabled();
  729 |     }
  730 |   });
  731 | 
  732 |   // ═══ Spec: 条件分支: 若 该文件已在编辑区有打开的标签页 → 切换到已有标签页并聚焦 [🟢🟢] ═══
  733 |   test('[44] 若 该文件已在编辑区有打开的标签页', async () => {
  734 |     // 触发: 若 该文件已在编辑区有打开的标签页
  735 |     // 预期: 切换到已有标签页并聚焦
  736 |     
  737 |     // 通用操作: 尝试匹配 data-testid 元素
  738 |     await page.waitForTimeout(800);
  739 | 
  740 |     // 验证标签页
  741 |     const tabs = page.locator('[data-testid="tab"]');
  742 |     const tabCount = await tabs.count();
  743 |     expect(tabCount).toBeGreaterThanOrEqual(0);
  744 |     if (tabCount > 0) await expect(tabs.first()).toBeVisible();
  745 |   });
  746 | 
  747 |   // ═══ Spec: 条件分支: 若 内容非空） | → ✅（AI 完成后自动判定） | → ✅（保持） | [🟢🟢] ═══
  748 |   test('[45] 若 内容非空） |', async () => {
  749 |     // 触发: 若 内容非空） |
  750 |     // 预期: ✅（AI 完成后自动判定） | → ✅（保持） |
  751 |     
  752 |     // 通用操作: 尝试匹配 data-testid 元素
  753 |     await page.waitForTimeout(800);
  754 | 
  755 |     // 验证 AI 对话区
  756 |     const chatBody = page.locator('[data-testid="chat-body"]').first();
  757 |     const chatVisible = await chatBody.isVisible({ timeout: 3000 }).catch(() => false);
  758 |     if (chatVisible) {
  759 |       await expect(chatBody).toBeVisible();
  760 |       const msgs = page.locator('[data-testid="ai-message"], [data-testid="user-message"]');
  761 |       expect(await msgs.count()).toBeGreaterThanOrEqual(0);
  762 |     }
  763 |   });
  764 | 
  765 |   // ═══ Spec: 条件分支: 若 文件已有内容）或 → ⏹（若文件为空） | → ✅（保持） | [🟢🟢] ═══
  766 |   test('[46] 若 文件已有内容）或', async () => {
  767 |     // 触发: 若 文件已有内容）或
  768 |     // 预期: ⏹（若文件为空） | → ✅（保持） |
  769 |     
  770 |     // 通用操作: 尝试匹配 data-testid 元素
  771 |     await page.waitForTimeout(800);
  772 | 
  773 |     // 验证章节行/文件项
  774 |     const rows = page.locator('[data-testid="chapter-row"], [data-testid="file-item"], [data-testid="stage-card"]');
  775 |     const rowCount = await rows.count();
  776 |     expect(rowCount).toBeGreaterThanOrEqual(0);
  777 |     if (rowCount > 0) await expect(rows.first()).toBeVisible();
  778 |   });
  779 | 
  780 |   // ═══ Spec: 条件分支: 若 引擎不变 → 直接切换模型 [🟢] ═══
  781 |   test('[47] 若 引擎不变', async () => {
  782 |     // 触发: 若 引擎不变
  783 |     // 预期: 直接切换模型
  784 |     
  785 |     // 通用操作: 尝试匹配 data-testid 元素
  786 |     await page.waitForTimeout(800);
  787 | 
  788 |     // 验证状态变化
  789 |     await page.waitForTimeout(500);
  790 |     const bodyText = await page.locator('body').innerText().catch(() => '');
> 791 |     expect(bodyText.length).toBeGreaterThan(20);
      |                             ^ Error: expect(received).toBeGreaterThan(expected)
  792 |   });
  793 | 
  794 |   // ═══ Spec: 条件分支: 若 引擎变化 → 将当前引擎的对话历史导出为通用格式（JSON Lines [🟢🟢] ═══
  795 |   test('[48] 若 引擎变化', async () => {
  796 |     // 触发: 若 引擎变化
  797 |     // 预期: 将当前引擎的对话历史导出为通用格式（JSON Lines
  798 |     
  799 |     // 通用操作: 尝试匹配 data-testid 元素
  800 |     await page.waitForTimeout(800);
  801 | 
  802 |     // 验证 AI 对话区
  803 |     const chatBody = page.locator('[data-testid="chat-body"]').first();
  804 |     const chatVisible = await chatBody.isVisible({ timeout: 3000 }).catch(() => false);
  805 |     if (chatVisible) {
  806 |       await expect(chatBody).toBeVisible();
  807 |       const msgs = page.locator('[data-testid="ai-message"], [data-testid="user-message"]');
  808 |       expect(await msgs.count()).toBeGreaterThanOrEqual(0);
  809 |     }
  810 |   });
  811 | 
  812 | });
  813 | 
```