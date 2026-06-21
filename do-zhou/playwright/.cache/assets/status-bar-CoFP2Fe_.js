import { j as jsxRuntimeExports } from './jsx-runtime-B_gFkkE_.js';
import { r as reactExports } from './index-BHNt27Zf.js';

const SHORTCUTS = [
  { keys: "Ctrl+S", desc: "强制保存当前标签页" },
  { keys: "Ctrl+Z", desc: "撤销" },
  { keys: "Ctrl+Shift+Z", desc: "重做" },
  { keys: "Ctrl+Tab", desc: "切换下一个标签页" },
  { keys: "Ctrl+W", desc: "关闭当前标签页" },
  { keys: "Ctrl+F", desc: "编辑器内查找文本" },
  { keys: "Ctrl+H", desc: "查找并替换" }
];
function ShortcutPanel() {
  const [open, setOpen] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        className: "flex items-center gap-[4px] text-text-tertiary text-[11px] hover:text-text-secondary transition-colors",
        onClick: () => setOpen(!open),
        title: "快捷键参考",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "⌨" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "快捷键" })
        ]
      }
    ),
    open && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50", onClick: () => setOpen(false), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "absolute top-[60px] right-[16px] w-[320px] bg-bg-panel border border-border-default rounded-md shadow-xl",
        style: { clip: true },
        onClick: (e) => e.stopPropagation(),
        "data-testid": "shortcut-panel",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-[16px] py-[8px] border-b border-border-default", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-primary text-[12px] font-ui font-semibold", "data-testid": "modal-title", children: "⌨ 快捷键" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "text-text-tertiary text-[14px] hover:text-text-primary",
                onClick: () => setOpen(false),
                "data-testid": "modal-close",
                children: "×"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-[2px] p-[8px]", children: SHORTCUTS.map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "flex items-center justify-between px-[8px] py-[4px] rounded-sm hover:bg-bg-active",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-secondary text-[12px] font-ui", children: s.desc }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-tertiary text-[11px] font-mono bg-bg-active px-[6px] py-[1px] rounded-sm", children: s.keys })
              ]
            },
            i
          )) })
        ]
      }
    ) })
  ] });
}

function StatusBar() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { className: "flex items-center justify-between h-[22px] bg-bg-panel border-t border-border-default px-[16px] shrink-0 text-[10px] font-ui select-none", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(ShortcutPanel, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-tertiary", children: "● 已自动保存" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-tertiary", children: "行 12, 列 48" })
  ] });
}

export { StatusBar };
//# sourceMappingURL=status-bar-CoFP2Fe_.js.map
