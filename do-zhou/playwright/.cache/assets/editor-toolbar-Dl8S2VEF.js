import { j as jsxRuntimeExports } from './jsx-runtime-B_gFkkE_.js';
import './index-BHNt27Zf.js';

function EditorToolbar({ mode, onToggleMode, onNewFile }) {
  const ghostBtn = "px-[10px] py-[3px] rounded-sm bg-transparent border border-transparent text-[11px] text-text-secondary font-ui hover:bg-bg-active hover:text-text-primary transition-colors duration-75 flex items-center gap-[4px]";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-end gap-[8px] px-[16px] py-[4px] shrink-0", "data-testid": "editor-toolbar", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: ghostBtn, onClick: onNewFile, children: "+ 新建" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: ghostBtn, onClick: onToggleMode, children: mode === "edit" ? "👁 预览" : "✏️ 编辑" })
  ] });
}

export { EditorToolbar };
//# sourceMappingURL=editor-toolbar-Dl8S2VEF.js.map
