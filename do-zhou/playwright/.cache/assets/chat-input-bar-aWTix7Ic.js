import { j as jsxRuntimeExports } from './jsx-runtime-CdovHwiP.js';
import { r as reactExports } from './index-iQly_VhA.js';
import { u as useAIState } from './use-ai-state-ByEHruxj.js';

function ChatInputBar({ onSend, disabled, placeholder = "输入消息..." }) {
  const [value, setValue] = reactExports.useState("");
  const inputRef = reactExports.useRef(null);
  const { isStreaming, interrupt } = useAIState();
  const handleSend = reactExports.useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }, [value, disabled, onSend]);
  const handleKeyDown = reactExports.useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);
  reactExports.useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [value]);
  const isEmpty = !value.trim();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end gap-[8px] p-[16px] border-t border-border-default shrink-0", children: [
    isStreaming && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex items-center gap-[8px] px-[12px] py-[8px] text-[11px] text-accent", "data-testid": "ai-progress", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-block w-[8px] h-[8px] rounded-full bg-accent animate-pulse" }),
      "AI 正在生成中..."
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "textarea",
      {
        ref: inputRef,
        className: `flex-1 px-[12px] py-[8px] rounded-sm bg-bg-active border border-border-default text-text-primary text-[12px] leading-[1.6] font-ui outline-none focus:border-border-hover resize-none transition-colors disabled:opacity-30 ${isStreaming ? "hidden" : ""}`,
        rows: 1,
        value,
        onChange: (e) => setValue(e.target.value),
        onKeyDown: handleKeyDown,
        placeholder: disabled ? "AI 正在生成中..." : placeholder,
        disabled,
        "data-testid": "chat-input",
        "aria-label": "输入消息"
      }
    ),
    isStreaming ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        className: "px-[14px] py-[8px] rounded-sm bg-[#3D2020] border border-[#E57373] text-[#E57373] text-[12px] font-ui hover:bg-[#4D3030] transition-all duration-150",
        onClick: interrupt,
        "data-testid": "btn-interrupt",
        children: "✏️ 中断"
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        className: `px-[14px] py-[8px] rounded-sm border text-[12px] font-ui transition-all duration-150 ${isEmpty || disabled ? "border-border-default text-text-tertiary opacity-30 cursor-not-allowed" : "bg-accent-dim/20 border-accent-dim text-accent hover:bg-accent-dim/30"}`,
        onClick: handleSend,
        disabled: isEmpty || disabled,
        "data-testid": "btn-send",
        children: "发送"
      }
    )
  ] });
}

export { ChatInputBar };
//# sourceMappingURL=chat-input-bar-aWTix7Ic.js.map
