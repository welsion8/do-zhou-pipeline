import { j as jsxRuntimeExports } from './jsx-runtime-B_gFkkE_.js';
import { r as reactExports } from './index-BHNt27Zf.js';

function DropdownSelect({ value, options, onChange, placeholder }) {
  const [open, setOpen] = reactExports.useState(false);
  const ref = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selected = options.find((o) => o.value === value);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { ref, className: "relative", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "w-full flex items-center justify-between px-[12px] py-[6px] rounded-sm bg-bg-active border border-border-default text-text-primary text-[13px] hover:bg-bg-hover", onClick: () => setOpen(!open), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: selected ? "text-text-primary" : "text-text-tertiary", children: selected?.label || placeholder || "请选择" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-tertiary text-[10px]", children: open ? "▲" : "▼" })
    ] }),
    open && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute z-50 w-full mt-[2px] bg-bg-panel border border-border-default rounded-sm shadow-lg py-[2px] max-h-[200px] overflow-y-auto", children: options.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: `px-[12px] py-[6px] text-[13px] cursor-pointer hover:bg-bg-active ${o.value === value ? "text-accent bg-bg-active" : "text-text-secondary"}`,
        onClick: () => {
          onChange(o.value);
          setOpen(false);
        },
        children: o.label
      },
      o.value
    )) })
  ] });
}

export { DropdownSelect };
//# sourceMappingURL=dropdown-select-fgzQKZg6.js.map
