import { j as jsxRuntimeExports } from './jsx-runtime-B_gFkkE_.js';
import './index-BHNt27Zf.js';

function ToggleSwitch({ checked, onChange, label }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
    label && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-secondary text-[13px]", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        className: `relative w-[36px] h-[20px] rounded-full transition-colors ${checked ? "bg-accent-dim" : "bg-bg-active border border-border-default"}`,
        onClick: () => onChange(!checked),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `absolute top-[2px] w-[16px] h-[16px] rounded-full bg-white transition-all ${checked ? "left-[18px]" : "left-[2px]"}` })
      }
    )
  ] });
}

export { ToggleSwitch };
//# sourceMappingURL=toggle-switch-DEpNeL7Q.js.map
