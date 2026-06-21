import { j as jsxRuntimeExports } from './jsx-runtime-B_gFkkE_.js';
import './index-BHNt27Zf.js';

function ChatHeader({ tokenCount, onSearch, onExport }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-[16px] py-[8px] border-b border-border-default shrink-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-secondary text-[12px] font-ui font-semibold", children: "AI 对话" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-[8px]", children: [
      tokenCount !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-text-tertiary text-[10px] font-ui", children: [
        "📊 ",
        (tokenCount / 1e3).toFixed(1),
        "K"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "text-text-tertiary text-[12px] hover:text-text-secondary transition-colors", onClick: onSearch, "data-testid": "btn-search", "aria-label": "搜索对话", children: "🔍" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "text-text-tertiary text-[12px] hover:text-text-secondary transition-colors", onClick: onExport, "data-testid": "btn-export", "aria-label": "导出对话", children: "📤" })
    ] })
  ] });
}

export { ChatHeader };
//# sourceMappingURL=chat-header-Bl3uV7Hg.js.map
