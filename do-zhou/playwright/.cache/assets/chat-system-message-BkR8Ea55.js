import { j as jsxRuntimeExports } from './jsx-runtime-CdovHwiP.js';
import './index-iQly_VhA.js';

function ChatSystemMessage({ content, timestamp }) {
  const time = timestamp ? new Date(timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-[8px] py-[8px]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 h-[1px] bg-border-default" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-text-tertiary text-[10px] font-ui shrink-0", children: [
      content,
      " ",
      time && `· ${time}`
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 h-[1px] bg-border-default" })
  ] });
}

export { ChatSystemMessage };
//# sourceMappingURL=chat-system-message-BkR8Ea55.js.map
