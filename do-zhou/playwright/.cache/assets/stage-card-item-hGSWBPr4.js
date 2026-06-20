import { j as jsxRuntimeExports } from './jsx-runtime-Cf6CDGgj.js';
import './index-D5BN7oG-.js';

function StageCardItem({
  stage,
  isActive,
  isExpanded,
  chapters,
  onClick,
  onChapterJump,
  chapterJumpInput,
  onChapterJumpInputChange
}) {
  const { id, icon, label, state } = stage;
  const isWriting = id === "chapter_writing";
  const stateStyles = {
    "⏹": "bg-transparent text-text-tertiary",
    "⟳": "bg-bg-active border-l-[2px] border-accent-dim text-text-primary font-semibold",
    "✅": "bg-transparent text-text-secondary"
  };
  const stateIcons = { "⏹": "⏹", "⟳": "⟳", "✅": "✅" };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        className: `w-full flex items-center gap-[6px] px-[16px] py-[6px] text-left text-[12px] font-ui rounded-r-sm transition-colors hover:bg-bg-active ${stateStyles[state]} ${isActive ? "ring-1 ring-inset ring-accent-dim/30" : ""}`,
        onClick: () => onClick(id),
        "data-testid": "stage-card",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] w-[16px] shrink-0 text-center", children: icon }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 truncate", children: label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] shrink-0", children: stateIcons[state] })
        ]
      }
    ),
    isWriting && isExpanded && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-[22px] border-l-[2px] border-accent-dim/30 pl-[12px] mt-[2px] space-y-[2px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-[4px] py-[2px]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          className: "flex-1 bg-bg-base border border-border-default rounded-sm px-[6px] py-[2px] text-text-primary text-[11px] font-ui placeholder:text-text-tertiary outline-none focus:border-accent-dim",
          placeholder: "🔍 跳转到第N章...",
          value: chapterJumpInput,
          onChange: (e) => onChapterJumpInputChange(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter") {
              const n = parseInt(chapterJumpInput);
              if (n > 0) {
                onChapterJump(n);
                onChapterJumpInputChange("");
              }
            }
          }
        }
      ) }),
      chapters.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-text-tertiary text-[10px] font-ui py-[4px]", children: "暂无章节" }) : chapters.map((ch, i) => {
        const match = ch.match(/第(\d+)章/);
        const chapterNo = match ? parseInt(match[1]) : i + 1;
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "w-full text-left px-[8px] py-[3px] text-text-secondary text-[11px] font-ui hover:bg-bg-active hover:text-text-primary rounded-sm transition-colors truncate",
            onClick: () => onChapterJump(chapterNo),
            "data-testid": "file-item",
            children: ch
          },
          i
        );
      })
    ] })
  ] });
}

export { StageCardItem };
//# sourceMappingURL=stage-card-item-hGSWBPr4.js.map
