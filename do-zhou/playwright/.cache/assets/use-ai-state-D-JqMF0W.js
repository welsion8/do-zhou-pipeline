import { r as reactExports } from './index-BHNt27Zf.js';

let globalAIState = {
  isStreaming: false,
  abortController: null
};
const listeners = /* @__PURE__ */ new Set();
function notify() {
  listeners.forEach((fn) => fn());
}
function setAIStreaming(v, ac) {
  globalAIState = { isStreaming: v, abortController: ac || null };
  notify();
}
function getAIState() {
  return globalAIState;
}
function useAIState() {
  const [, setTick] = reactExports.useState(0);
  listeners.add(() => setTick((t) => t + 1));
  const interrupt = reactExports.useCallback(() => {
    if (globalAIState.abortController) {
      globalAIState.abortController.abort();
      setAIStreaming(false, null);
    }
  }, []);
  return {
    isStreaming: globalAIState.isStreaming,
    interrupt
  };
}

export { useAIState as u };
//# sourceMappingURL=use-ai-state-D-JqMF0W.js.map
