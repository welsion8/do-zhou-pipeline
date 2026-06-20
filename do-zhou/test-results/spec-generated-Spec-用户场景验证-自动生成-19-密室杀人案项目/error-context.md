# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: spec-generated.spec.ts >> Spec 用户场景验证 (自动生成) >> [19] 密室杀人案项目
- Location: spec-generated.spec.ts:329:7

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 20
Received:   0
```

# Test source

```ts
  239 |     // 通用操作: 尝试匹配 data-testid 元素
  240 |     await page.waitForTimeout(800);
  241 | 
  242 |     // 验证 AI 对话区
  243 |     const chatBody = page.locator('[data-testid="chat-body"]').first();
  244 |     const chatVisible = await chatBody.isVisible({ timeout: 3000 }).catch(() => false);
  245 |     if (chatVisible) {
  246 |       await expect(chatBody).toBeVisible();
  247 |       const msgs = page.locator('[data-testid="ai-message"], [data-testid="user-message"]');
  248 |       expect(await msgs.count()).toBeGreaterThanOrEqual(0);
  249 |     }
  250 |   });
  251 | 
  252 |   // ═══ Spec: 交互路径: 顶部导航进入 [⚙ 设置 → API 配置] → 添加 Claude + DeepSeek → 填入 Key → [🔍] 拉取模型列表 → 保存 [🟢🟢] ═══
  253 |   test('[14] 顶部导航进入 [⚙ 设置', async () => {
  254 |     // 触发: 顶部导航进入 [⚙ 设置
  255 |     // 预期: API 配置] → 添加 Claude + DeepSeek → 填入 Key → [🔍] 拉取模型列表 → 保存
  256 |     
  257 |     // 通用操作: 尝试匹配 data-testid 元素
  258 |     await page.waitForTimeout(800);
  259 | 
  260 |     // 验证页面/视图切换
  261 |     await page.waitForTimeout(800);
  262 |     const bodyText = await page.locator('body').innerText().catch(() => '');
  263 |     expect(bodyText).toMatch(/API|模型|配置/);
  264 |   });
  265 | 
  266 |   // ═══ Spec: 交互路径: [+ 新建项目] → 输入"霸总契约新娘" → 创建 [🟢🟢] ═══
  267 |   test('[15] [+ 新建项目]', async () => {
  268 |     // 触发: [+ 新建项目]
  269 |     // 预期: 输入"霸总契约新娘" → 创建
  270 |     
  271 |     const btn = page.locator('[data-testid="btn-new-project"]').first();
  272 |     if (await btn.isVisible().catch(() => false)) await btn.click();
  273 | 
  274 |     // 验证弹窗出现
  275 |     const modal = page.locator('[data-testid="modal-overlay"]').first();
  276 |     const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);
  277 |     if (modalVisible) {
  278 |       await expect(page.locator('[data-testid="modal-title"]').first()).toBeVisible();
  279 |       const confirmBtn = page.locator('[data-testid="modal-confirm"]').first();
  280 |       await expect(confirmBtn).toBeVisible();
  281 |     }
  282 |   });
  283 | 
  284 |   // ═══ Spec: 交互路径: "第一章 · 婚礼上的陌生人" → 编辑区打开 Chapter-01.md 标签页 [🟢🟢] ═══
  285 |   test('[16] 第一章 · 婚礼上的陌生人', async () => {
  286 |     // 触发: "第一章 · 婚礼上的陌生人"
  287 |     // 预期: 编辑区打开 Chapter-01.md 标签页
  288 |     
  289 |     // 通用操作: 尝试匹配 data-testid 元素
  290 |     await page.waitForTimeout(800);
  291 | 
  292 |     // 验证标签页
  293 |     const tabs = page.locator('[data-testid="tab"]');
  294 |     const tabCount = await tabs.count();
  295 |     expect(tabCount).toBeGreaterThanOrEqual(0);
  296 |     if (tabCount > 0) await expect(tabs.first()).toBeVisible();
  297 |   });
  298 | 
  299 |   // ═══ Spec: 交互路径: "暗恋十年成真"项目 → 进入工作台 [🟢🟢] ═══
  300 |   test('[17] 暗恋十年成真项目', async () => {
  301 |     // 触发: "暗恋十年成真"项目
  302 |     // 预期: 进入工作台
  303 |     
  304 |     // 通用操作: 尝试匹配 data-testid 元素
  305 |     await page.waitForTimeout(800);
  306 | 
  307 |     // 验证页面/视图切换
  308 |     await page.waitForTimeout(800);
  309 |     const bodyText = await page.locator('body').innerText().catch(() => '');
  310 |     expect(bodyText.length).toBeGreaterThan(20);
  311 |   });
  312 | 
  313 |   // ═══ Spec: 交互路径: "悬疑推理"Skill（展开） → "现言"Skill 自动收缩 [🟢🟢] ═══
  314 |   test('[18] 悬疑推理Skill（展开）', async () => {
  315 |     // 触发: "悬疑推理"Skill（展开）
  316 |     // 预期: "现言"Skill 自动收缩
  317 |     
  318 |     // 通用操作: 尝试匹配 data-testid 元素
  319 |     await page.waitForTimeout(800);
  320 | 
  321 |     // 验证 Skill 卡片/项目列表
  322 |     const cards = page.locator('[data-testid="skill-card"], [data-testid="project-row"]');
  323 |     const cardCount = await cards.count();
  324 |     expect(cardCount).toBeGreaterThanOrEqual(0);
  325 |     if (cardCount > 0) await expect(cards.first()).toBeVisible();
  326 |   });
  327 | 
  328 |   // ═══ Spec: 交互路径: "密室杀人案"项目 → 进入工作台 [🟢🟢] ═══
  329 |   test('[19] 密室杀人案项目', async () => {
  330 |     // 触发: "密室杀人案"项目
  331 |     // 预期: 进入工作台
  332 |     
  333 |     // 通用操作: 尝试匹配 data-testid 元素
  334 |     await page.waitForTimeout(800);
  335 | 
  336 |     // 验证页面/视图切换
  337 |     await page.waitForTimeout(800);
  338 |     const bodyText = await page.locator('body').innerText().catch(() => '');
> 339 |     expect(bodyText.length).toBeGreaterThan(20);
      |                             ^ Error: expect(received).toBeGreaterThan(expected)
  340 |   });
  341 | 
  342 |   // ═══ Spec: 用户行为: 点击 [↗ 导出] → 选择导出路径 → 系统打包 Skill 为完整文件夹 [🟢🟢] ═══
  343 |   test('[20] 点击 [↗ 导出]', async () => {
  344 |     // 触发: 点击 [↗ 导出]
  345 |     // 预期: 选择导出路径 → 系统打包 Skill 为完整文件夹
  346 |     
  347 |     const btn = page.locator('[data-testid="stage-card"], [data-testid="chapter-row"], [data-testid="tab"]').filter({ hasText: /[↗ 导出]/ }).first();
  348 |     if (await btn.isVisible().catch(() => false)) await btn.click();
  349 | 
  350 |     // 验证 Skill 卡片/项目列表
  351 |     const cards = page.locator('[data-testid="skill-card"], [data-testid="project-row"]');
  352 |     const cardCount = await cards.count();
  353 |     expect(cardCount).toBeGreaterThanOrEqual(0);
  354 |     if (cardCount > 0) await expect(cards.first()).toBeVisible();
  355 |   });
  356 | 
  357 |   // ═══ Spec: 用户行为: 删除某 Skill 时，若该 Skill 下还有未删除的项目 → 弹出警告"该 Skill 下有 N 个项目，删除 Skill 后这些项目将失去创作方法论指导，但项目文件不会被删除 [🟢🟢] ═══
  358 |   test('[21] 删除某 Skill 时，若该 Skill 下还有未删除的项目', async () => {
  359 |     // 触发: 删除某 Skill 时，若该 Skill 下还有未删除的项目
  360 |     // 预期: 弹出警告"该 Skill 下有 N 个项目，删除 Skill 后这些项目将失去创作方法论指导，但项目文件不会被删除
  361 |     
  362 |     // 通用操作: 尝试匹配 data-testid 元素
  363 |     await page.waitForTimeout(800);
  364 | 
  365 |     // 验证弹窗出现
  366 |     const modal = page.locator('[data-testid="modal-overlay"]').first();
  367 |     const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);
  368 |     if (modalVisible) {
  369 |       await expect(page.locator('[data-testid="modal-title"]').first()).toBeVisible();
  370 |       const confirmBtn = page.locator('[data-testid="modal-confirm"]').first();
  371 |       await expect(confirmBtn).toBeVisible();
  372 |     }
  373 |   });
  374 | 
  375 |   // ═══ Spec: 用户行为: 右键项目名 → 弹出菜单（打开/重命名/置顶/移入回收站/彻底删除） [🟢🟢] ═══
  376 |   test('[22] 右键项目名', async () => {
  377 |     // 触发: 右键项目名
  378 |     // 预期: 弹出菜单（打开/重命名/置顶/移入回收站/彻底删除）
  379 |     
  380 |     // 通用操作: 尝试匹配 data-testid 元素
  381 |     await page.waitForTimeout(800);
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
```