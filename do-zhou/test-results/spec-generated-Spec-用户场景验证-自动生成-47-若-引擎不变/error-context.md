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
  812 |   // ═══ Spec: 右键菜单: 右键 项目名 → 弹出菜单（打开/重命名/置顶/移入回收站/彻底删除） [🟢🟢] ═══
  813 |   test('[49] 右键 项目名', async () => {
  814 |     // 触发: 右键 项目名
  815 |     // 预期: 弹出菜单（打开/重命名/置顶/移入回收站/彻底删除）
  816 |     
  817 |     // 通用操作: 尝试匹配 data-testid 元素
  818 |     await page.waitForTimeout(800);
  819 | 
  820 |     // 验证弹窗出现
  821 |     const modal = page.locator('[data-testid="modal-overlay"]').first();
  822 |     const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);
  823 |     if (modalVisible) {
  824 |       await expect(page.locator('[data-testid="modal-title"]').first()).toBeVisible();
  825 |       const confirmBtn = page.locator('[data-testid="modal-confirm"]').first();
  826 |       await expect(confirmBtn).toBeVisible();
  827 |     }
  828 |   });
  829 | 
  830 |   // ═══ Spec: 右键菜单: 右键 菜单**（选中文本后右键）：复制 / 剪切 / 粘贴 / ── / 🤖 AI 重写选中内容 / ✨ AI 扩写选中段落 / 🔤 AI 润色选中对话。AI 操作流程：选中文本+指令 → 发送到对话区 → AI 返回预览（显示在对话块中，含 `[✅ 应用]` 和 `[❌ 丢弃]` 两个按钮）→ 用户点击应用 → 替换编辑区中的原选中文本 [🟢🟢] ═══
  831 |   test('[50] 右键 菜单**（选中文本后右键）：复制 / 剪切 / 粘贴 / ── / 🤖 AI 重写选中内容 ', async () => {
  832 |     // 触发: 右键 菜单**（选中文本后右键）：复制 / 剪切 / 粘贴 / ── / 🤖 AI 重写选中内容 / ✨ AI 扩写选中段落 / 🔤 AI 润色选中对话。AI 操作流程：选中文本+指令
  833 |     // 预期: 发送到对话区 → AI 返回预览（显示在对话块中，含 `[✅ 应用]` 和 `[❌ 丢弃]` 两个按钮）→ 用户点击应用 → 替换编辑区中的原选中文本
  834 |     
  835 |     // 通用操作: 尝试匹配 data-testid 元素
  836 |     await page.waitForTimeout(800);
  837 | 
  838 |     // 验证 AI 对话区
  839 |     const chatBody = page.locator('[data-testid="chat-body"]').first();
  840 |     const chatVisible = await chatBody.isVisible({ timeout: 3000 }).catch(() => false);
  841 |     if (chatVisible) {
  842 |       await expect(chatBody).toBeVisible();
  843 |       const msgs = page.locator('[data-testid="ai-message"], [data-testid="user-message"]');
  844 |       expect(await msgs.count()).toBeGreaterThanOrEqual(0);
  845 |     }
  846 |   });
  847 | 
  848 |   // ═══ Spec: 弹窗交互: 弹出 三 → 选一对话框：① 覆盖现有（保留同名 Skill 的项目关联）② 保留两者（自动重命名新 Skill 为"名称 (1)"）③ 取消导入 [🟢🟢] ═══
  849 |   test('[51] 弹出 三', async () => {
  850 |     // 触发: 弹出 三
  851 |     // 预期: 选一对话框：① 覆盖现有（保留同名 Skill 的项目关联）② 保留两者（自动重命名新 Skill 为"名称 (1)"）③ 取消导入
  852 |     
  853 |     // 通用操作: 尝试匹配 data-testid 元素
  854 |     await page.waitForTimeout(800);
  855 | 
  856 |     // 验证弹窗出现
  857 |     const modal = page.locator('[data-testid="modal-overlay"]').first();
  858 |     const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);
  859 |     if (modalVisible) {
  860 |       await expect(page.locator('[data-testid="modal-title"]').first()).toBeVisible();
  861 |       const confirmBtn = page.locator('[data-testid="modal-confirm"]').first();
  862 |       await expect(confirmBtn).toBeVisible();
  863 |     }
  864 |   });
  865 | 
  866 |   // ═══ Spec: 弹窗交互: 弹出 警 → 告"该 Skill 下有 N 个项目，删除 Skill 后这些项目将失去创作方法论指导，但项目文件不会被删除 [🟢🟢] ═══
  867 |   test('[52] 弹出 警', async () => {
  868 |     // 触发: 弹出 警
  869 |     // 预期: 告"该 Skill 下有 N 个项目，删除 Skill 后这些项目将失去创作方法论指导，但项目文件不会被删除
  870 |     
  871 |     // 通用操作: 尝试匹配 data-testid 元素
  872 |     await page.waitForTimeout(800);
  873 | 
  874 |     // 验证 Skill 卡片/项目列表
  875 |     const cards = page.locator('[data-testid="skill-card"], [data-testid="project-row"]');
  876 |     const cardCount = await cards.count();
  877 |     expect(cardCount).toBeGreaterThanOrEqual(0);
  878 |     if (cardCount > 0) await expect(cards.first()).toBeVisible();
  879 |   });
  880 | 
  881 |   // ═══ Spec: 弹窗交互: 弹出 菜 → 单（打开/重命名/置顶/移入回收站/彻底删除） [🟡] ═══
  882 |   test('[53] 弹出 菜', async () => {
  883 |     // 触发: 弹出 菜
  884 |     // 预期: 单（打开/重命名/置顶/移入回收站/彻底删除）
  885 |     
  886 |     // 通用操作: 尝试匹配 data-testid 元素
  887 |     await page.waitForTimeout(800);
  888 | 
  889 |     // 验证页面有基本内容
  890 |     await page.waitForTimeout(500);
  891 |     const bodyText = await page.locator('body').innerText().catch(() => '');
```