# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: spec-generated.spec.ts >> Spec 用户场景验证 (自动生成) >> [55] 弹出 `
- Location: spec-generated.spec.ts:911:7

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 10
Received:   0
```

# Test source

```ts
  821  |     const modal = page.locator('[data-testid="modal-overlay"]').first();
  822  |     const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);
  823  |     if (modalVisible) {
  824  |       await expect(page.locator('[data-testid="modal-title"]').first()).toBeVisible();
  825  |       const confirmBtn = page.locator('[data-testid="modal-confirm"]').first();
  826  |       await expect(confirmBtn).toBeVisible();
  827  |     }
  828  |   });
  829  | 
  830  |   // ═══ Spec: 右键菜单: 右键 菜单**（选中文本后右键）：复制 / 剪切 / 粘贴 / ── / 🤖 AI 重写选中内容 / ✨ AI 扩写选中段落 / 🔤 AI 润色选中对话。AI 操作流程：选中文本+指令 → 发送到对话区 → AI 返回预览（显示在对话块中，含 `[✅ 应用]` 和 `[❌ 丢弃]` 两个按钮）→ 用户点击应用 → 替换编辑区中的原选中文本 [🟢🟢] ═══
  831  |   test('[50] 右键 菜单**（选中文本后右键）：复制 / 剪切 / 粘贴 / ── / 🤖 AI 重写选中内容 ', async () => {
  832  |     // 触发: 右键 菜单**（选中文本后右键）：复制 / 剪切 / 粘贴 / ── / 🤖 AI 重写选中内容 / ✨ AI 扩写选中段落 / 🔤 AI 润色选中对话。AI 操作流程：选中文本+指令
  833  |     // 预期: 发送到对话区 → AI 返回预览（显示在对话块中，含 `[✅ 应用]` 和 `[❌ 丢弃]` 两个按钮）→ 用户点击应用 → 替换编辑区中的原选中文本
  834  |     
  835  |     // 通用操作: 尝试匹配 data-testid 元素
  836  |     await page.waitForTimeout(800);
  837  | 
  838  |     // 验证 AI 对话区
  839  |     const chatBody = page.locator('[data-testid="chat-body"]').first();
  840  |     const chatVisible = await chatBody.isVisible({ timeout: 3000 }).catch(() => false);
  841  |     if (chatVisible) {
  842  |       await expect(chatBody).toBeVisible();
  843  |       const msgs = page.locator('[data-testid="ai-message"], [data-testid="user-message"]');
  844  |       expect(await msgs.count()).toBeGreaterThanOrEqual(0);
  845  |     }
  846  |   });
  847  | 
  848  |   // ═══ Spec: 弹窗交互: 弹出 三 → 选一对话框：① 覆盖现有（保留同名 Skill 的项目关联）② 保留两者（自动重命名新 Skill 为"名称 (1)"）③ 取消导入 [🟢🟢] ═══
  849  |   test('[51] 弹出 三', async () => {
  850  |     // 触发: 弹出 三
  851  |     // 预期: 选一对话框：① 覆盖现有（保留同名 Skill 的项目关联）② 保留两者（自动重命名新 Skill 为"名称 (1)"）③ 取消导入
  852  |     
  853  |     // 通用操作: 尝试匹配 data-testid 元素
  854  |     await page.waitForTimeout(800);
  855  | 
  856  |     // 验证弹窗出现
  857  |     const modal = page.locator('[data-testid="modal-overlay"]').first();
  858  |     const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);
  859  |     if (modalVisible) {
  860  |       await expect(page.locator('[data-testid="modal-title"]').first()).toBeVisible();
  861  |       const confirmBtn = page.locator('[data-testid="modal-confirm"]').first();
  862  |       await expect(confirmBtn).toBeVisible();
  863  |     }
  864  |   });
  865  | 
  866  |   // ═══ Spec: 弹窗交互: 弹出 警 → 告"该 Skill 下有 N 个项目，删除 Skill 后这些项目将失去创作方法论指导，但项目文件不会被删除 [🟢🟢] ═══
  867  |   test('[52] 弹出 警', async () => {
  868  |     // 触发: 弹出 警
  869  |     // 预期: 告"该 Skill 下有 N 个项目，删除 Skill 后这些项目将失去创作方法论指导，但项目文件不会被删除
  870  |     
  871  |     // 通用操作: 尝试匹配 data-testid 元素
  872  |     await page.waitForTimeout(800);
  873  | 
  874  |     // 验证 Skill 卡片/项目列表
  875  |     const cards = page.locator('[data-testid="skill-card"], [data-testid="project-row"]');
  876  |     const cardCount = await cards.count();
  877  |     expect(cardCount).toBeGreaterThanOrEqual(0);
  878  |     if (cardCount > 0) await expect(cards.first()).toBeVisible();
  879  |   });
  880  | 
  881  |   // ═══ Spec: 弹窗交互: 弹出 菜 → 单（打开/重命名/置顶/移入回收站/彻底删除） [🟡] ═══
  882  |   test('[53] 弹出 菜', async () => {
  883  |     // 触发: 弹出 菜
  884  |     // 预期: 单（打开/重命名/置顶/移入回收站/彻底删除）
  885  |     
  886  |     // 通用操作: 尝试匹配 data-testid 元素
  887  |     await page.waitForTimeout(800);
  888  | 
  889  |     // 验证页面有基本内容
  890  |     await page.waitForTimeout(500);
  891  |     const bodyText = await page.locator('body').innerText().catch(() => '');
  892  |     expect(bodyText.length).toBeGreaterThan(10);
  893  |   });
  894  | 
  895  |   // ═══ Spec: 弹窗交互: 弹出 对 → 话框"已存在同名项目，请选择：① 覆盖现有项目 ② 自动重命名为'项目名 (恢复)' ③ 取消恢复" [🟢🟢] ═══
  896  |   test('[54] 弹出 对', async () => {
  897  |     // 触发: 弹出 对
  898  |     // 预期: 话框"已存在同名项目，请选择：① 覆盖现有项目 ② 自动重命名为'项目名 (恢复)' ③ 取消恢复"
  899  |     
  900  |     // 通用操作: 尝试匹配 data-testid 元素
  901  |     await page.waitForTimeout(800);
  902  | 
  903  |     // 验证 Skill 卡片/项目列表
  904  |     const cards = page.locator('[data-testid="skill-card"], [data-testid="project-row"]');
  905  |     const cardCount = await cards.count();
  906  |     expect(cardCount).toBeGreaterThanOrEqual(0);
  907  |     if (cardCount > 0) await expect(cards.first()).toBeVisible();
  908  |   });
  909  | 
  910  |   // ═══ Spec: 弹窗交互: 弹出 ` → 关闭全部 / 关闭其他` 菜单 [🟡] ═══
  911  |   test('[55] 弹出 `', async () => {
  912  |     // 触发: 弹出 `
  913  |     // 预期: 关闭全部 / 关闭其他` 菜单
  914  |     
  915  |     // 通用操作: 尝试匹配 data-testid 元素
  916  |     await page.waitForTimeout(800);
  917  | 
  918  |     // 验证页面有基本内容
  919  |     await page.waitForTimeout(500);
  920  |     const bodyText = await page.locator('body').innerText().catch(() => '');
> 921  |     expect(bodyText.length).toBeGreaterThan(10);
       |                             ^ Error: expect(received).toBeGreaterThan(expected)
  922  |   });
  923  | 
  924  |   // ═══ Spec: 弹窗交互: 弹出 确 → 认"将覆盖当前文件内容，是否继续？" [🟡] ═══
  925  |   test('[56] 弹出 确', async () => {
  926  |     // 触发: 弹出 确
  927  |     // 预期: 认"将覆盖当前文件内容，是否继续？"
  928  |     
  929  |     // 通用操作: 尝试匹配 data-testid 元素
  930  |     await page.waitForTimeout(800);
  931  | 
  932  |     // 验证页面有基本内容
  933  |     await page.waitForTimeout(500);
  934  |     const bodyText = await page.locator('body').innerText().catch(() => '');
  935  |     expect(bodyText.length).toBeGreaterThan(10);
  936  |   });
  937  | 
  938  |   // ═══ Spec: 弹窗交互: 弹出 ） → | 两栏，右侧 AI 面板变为浮层 | [🟢🟢] ═══
  939  |   test('[57] 弹出 ）', async () => {
  940  |     // 触发: 弹出 ）
  941  |     // 预期: | 两栏，右侧 AI 面板变为浮层 |
  942  |     
  943  |     // 通用操作: 尝试匹配 data-testid 元素
  944  |     await page.waitForTimeout(800);
  945  | 
  946  |     // 验证 AI 对话区
  947  |     const chatBody = page.locator('[data-testid="chat-body"]').first();
  948  |     const chatVisible = await chatBody.isVisible({ timeout: 3000 }).catch(() => false);
  949  |     if (chatVisible) {
  950  |       await expect(chatBody).toBeVisible();
  951  |       const msgs = page.locator('[data-testid="ai-message"], [data-testid="user-message"]');
  952  |       expect(await msgs.count()).toBeGreaterThanOrEqual(0);
  953  |     }
  954  |   });
  955  | 
  956  |   // ═══ Spec: 弹窗交互: 弹出 ） → | flex | 收起 | 单栏，左侧和右侧均为 overlay | [🟡] ═══
  957  |   test('[58] 弹出 ）', async () => {
  958  |     // 触发: 弹出 ）
  959  |     // 预期: | flex | 收起 | 单栏，左侧和右侧均为 overlay |
  960  |     
  961  |     // 通用操作: 尝试匹配 data-testid 元素
  962  |     await page.waitForTimeout(800);
  963  | 
  964  |     // 验证页面有基本内容
  965  |     await page.waitForTimeout(500);
  966  |     const bodyText = await page.locator('body').innerText().catch(() => '');
  967  |     expect(bodyText.length).toBeGreaterThan(10);
  968  |   });
  969  | 
  970  |   // ═══ Spec: 弹窗交互: 弹出 确 → 认"AI 正在生成内容，关闭应用将中断生成 [🟢🟢] ═══
  971  |   test('[59] 弹出 确', async () => {
  972  |     // 触发: 弹出 确
  973  |     // 预期: 认"AI 正在生成内容，关闭应用将中断生成
  974  |     
  975  |     // 通用操作: 尝试匹配 data-testid 元素
  976  |     await page.waitForTimeout(800);
  977  | 
  978  |     // 验证 AI 对话区
  979  |     const chatBody = page.locator('[data-testid="chat-body"]').first();
  980  |     const chatVisible = await chatBody.isVisible({ timeout: 3000 }).catch(() => false);
  981  |     if (chatVisible) {
  982  |       await expect(chatBody).toBeVisible();
  983  |       const msgs = page.locator('[data-testid="ai-message"], [data-testid="user-message"]');
  984  |       expect(await msgs.count()).toBeGreaterThanOrEqual(0);
  985  |     }
  986  |   });
  987  | 
  988  |   // ═══ Spec: 弹窗交互: 弹出 三 → 选一对话框：覆盖现有/保留两者/取消导入 | ✅ | [🟢🟢] ═══
  989  |   test('[60] 弹出 三', async () => {
  990  |     // 触发: 弹出 三
  991  |     // 预期: 选一对话框：覆盖现有/保留两者/取消导入 | ✅ |
  992  |     
  993  |     // 通用操作: 尝试匹配 data-testid 元素
  994  |     await page.waitForTimeout(800);
  995  | 
  996  |     // 验证弹窗出现
  997  |     const modal = page.locator('[data-testid="modal-overlay"]').first();
  998  |     const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);
  999  |     if (modalVisible) {
  1000 |       await expect(page.locator('[data-testid="modal-title"]').first()).toBeVisible();
  1001 |       const confirmBtn = page.locator('[data-testid="modal-confirm"]').first();
  1002 |       await expect(confirmBtn).toBeVisible();
  1003 |     }
  1004 |   });
  1005 | 
  1006 |   // ═══ Spec: 弹窗交互: 弹出 三 → 选一对话框：覆盖/自动重命名/取消恢复 | ✅ | [🟢🟢] ═══
  1007 |   test('[61] 弹出 三', async () => {
  1008 |     // 触发: 弹出 三
  1009 |     // 预期: 选一对话框：覆盖/自动重命名/取消恢复 | ✅ |
  1010 |     
  1011 |     // 通用操作: 尝试匹配 data-testid 元素
  1012 |     await page.waitForTimeout(800);
  1013 | 
  1014 |     // 验证弹窗出现
  1015 |     const modal = page.locator('[data-testid="modal-overlay"]').first();
  1016 |     const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);
  1017 |     if (modalVisible) {
  1018 |       await expect(page.locator('[data-testid="modal-title"]').first()).toBeVisible();
  1019 |       const confirmBtn = page.locator('[data-testid="modal-confirm"]').first();
  1020 |       await expect(confirmBtn).toBeVisible();
  1021 |     }
```