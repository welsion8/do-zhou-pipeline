import { j as jsxRuntimeExports } from './jsx-runtime-B_gFkkE_.js';
import './index-BHNt27Zf.js';

function Slider({ value, min, max, step = 1, onChange, label }) {
  const pct = (value - min) / (max - min) * 100;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-[4px]", children: [
    label && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-tertiary text-[12px]", children: label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-secondary text-[12px]", children: value })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "range",
        min,
        max,
        step,
        value,
        className: "w-full h-[4px] rounded-full bg-bg-active appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[14px] [&::-webkit-slider-thumb]:h-[14px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-dim",
        onChange: (e) => onChange(Number(e.target.value))
      }
    )
  ] });
}

export { Slider };
//# sourceMappingURL=slider-BkSPKjZT.js.map
